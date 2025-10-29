import * as core from '@actions/core';
import Config from './config';
import { S3CacheClient } from './utils/s3';
import { CacheUtils } from './utils/cache';
import { CacheError, S3Error } from './types';

/**
 * Main restore function
 */
export async function run(): Promise<void> {
  try {
    core.info('S3 Cache Action - Restore phase starting');

    const config = new Config();
    core.info(`Looking for cache with key: ${config.input.key}`);

    // Initialize S3 client
    const s3Client = new S3CacheClient(
      {
        region: config.input.awsRegion,
        credentials: {
          accessKeyId: config.input.awsAccessKeyId,
          secretAccessKey: config.input.awsSecretAccessKey
        }
      },
      config.input.s3Bucket
    );

    // Try exact key match first
    const exactKey = config.generateS3Key();
    CacheUtils.logCacheInfo('restore', config.input.key, config.input.s3Bucket, exactKey);

    if (await s3Client.objectExists(exactKey)) {
      core.info(`Cache hit found for exact key: ${config.input.key}`);
      await restoreCache(s3Client, exactKey, config.input.key, config);
      return;
    }

    // Try restore keys if provided
    if (config.parsedInputs.restoreKeys && config.parsedInputs.restoreKeys.length > 0) {
      core.info('Exact key not found, trying restore keys');

      for (const restoreKey of config.parsedInputs.restoreKeys) {
        const repoName = config.githubContext.repository.split('/').pop() || config.githubContext.repository;
        const restoreS3Key = `${config.input.s3Prefix}/${repoName}/${config.githubContext.ref}/${restoreKey}.tar.gz`;
        core.info(`Trying restore key: ${restoreKey}`);

        if (await s3Client.objectExists(restoreS3Key)) {
          core.info(`Cache hit found for restore key: ${restoreKey}`);
          await restoreCache(s3Client, restoreS3Key, restoreKey, config);
          return;
        }
      }
    }

    // No cache found
    core.info('Cache not found');
    CacheUtils.setOutputs(false, config.input.key, '');

    if (config.input.failOnCacheMiss) {
      throw new CacheError('Cache miss and fail-on-cache-miss is enabled');
    }

  } catch (error) {
    if (error instanceof CacheError || error instanceof S3Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(`Unexpected error: ${error}`);
    }
  }
}

/**
 * Download and extract cache from S3
 */
async function restoreCache(s3Client: S3CacheClient, s3Key: string, matchedKey: string, config: Config): Promise<void> {
  const archivePath = 'cache.tar.gz';

  try {
    // Download cache archive
    core.info(`Downloading cache from S3`);
    await s3Client.downloadObject(s3Key, archivePath);

    // Extract cache
    await CacheUtils.extractArchive(archivePath);

    // Set outputs
    CacheUtils.setOutputs(true, config.input.key, matchedKey);
    core.saveState('cache-hit', 'true');

    core.info('Cache restored successfully');

  } finally {
    // Cleanup archive file
    await CacheUtils.cleanup([archivePath]);
  }
}

// Run the action
if (require.main === module) {
  run();
}