import * as core from '@actions/core';
import { getInputs } from './utils/inputs';
import { S3CacheClient } from './utils/s3';
import { CacheUtils } from './utils/cache';
import { CacheError, S3Error } from './types';

/**
 * Main restore function
 */
async function run(): Promise<void> {
  try {
    core.info('S3 Cache Action - Restore phase starting');

    // Add debug information
    core.debug('Reading action inputs...');
    const inputs = getInputs();

    core.debug('Getting GitHub context...');
    const { repository, ref } = CacheUtils.getGitHubContext();

    core.info(`Looking for cache with key: ${inputs.key}`);

    // Initialize S3 client
    const s3Client = new S3CacheClient(
      {
        region: inputs.awsRegion,
        credentials: {
          accessKeyId: inputs.awsAccessKeyId,
          secretAccessKey: inputs.awsSecretAccessKey
        }
      },
      inputs.s3Bucket
    );

    // Try exact key match first
    const exactKey = S3CacheClient.generateCacheKey(inputs.s3Prefix, repository, ref, inputs.key);
    CacheUtils.logCacheInfo('restore', inputs.key, inputs.s3Bucket, exactKey);

    if (await s3Client.objectExists(exactKey)) {
      core.info(`Cache hit found for exact key: ${inputs.key}`);
      await restoreCache(s3Client, exactKey, inputs.key);
      return;
    }

    // Try restore keys if provided
    if (inputs.restoreKeys && inputs.restoreKeys.length > 0) {
      core.info('Exact key not found, trying restore keys');

      for (const restoreKey of inputs.restoreKeys) {
        const restoreS3Key = S3CacheClient.generateCacheKey(inputs.s3Prefix, repository, ref, restoreKey);
        core.info(`Trying restore key: ${restoreKey}`);

        if (await s3Client.objectExists(restoreS3Key)) {
          core.info(`Cache hit found for restore key: ${restoreKey}`);
          await restoreCache(s3Client, restoreS3Key, restoreKey);
          return;
        }
      }
    }

    // No cache found
    core.info('Cache not found');
    CacheUtils.setOutputs(false, inputs.key, '');

    if (inputs.failOnCacheMiss) {
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
async function restoreCache(s3Client: S3CacheClient, s3Key: string, matchedKey: string): Promise<void> {
  const archivePath = 'cache.tar.gz';

  try {
    // Download cache archive
    core.info(`Downloading cache from S3`);
    await s3Client.downloadObject(s3Key, archivePath);

    // Extract cache
    await CacheUtils.extractArchive(archivePath);

    // Set outputs
    const inputs = getInputs();
    CacheUtils.setOutputs(true, inputs.key, matchedKey);

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