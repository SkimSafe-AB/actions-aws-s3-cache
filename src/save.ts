import * as core from '@actions/core';
import Config from './config';
import { S3CacheClient } from './utils/s3';
import { CacheUtils } from './utils/cache';
import { CacheError, S3Error, S3CacheMetadata } from './types';

/**
 * Main save function
 */
export async function run(): Promise<void> {
  try {
    // Check if cache was already restored
    const cacheHit = core.getState('cache-hit');
    if (cacheHit === 'true') {
      core.info('Cache was restored successfully, skipping save.');
      return;
    }

    core.info('S3 Cache Action - Save phase starting');

    const config = new Config();
    core.info(`Saving cache with key: ${config.input.key}`);

    // Validate that paths exist
    const { validPaths, missingPaths } = await CacheUtils.validatePaths(config.parsedInputs.paths);

    if (missingPaths.length > 0) {
      core.warning(`Some cache paths do not exist: ${missingPaths.join(', ')}`);
    }

    if (validPaths.length === 0) {
      core.warning('No valid cache paths found, skipping cache save');
      return;
    }

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

    // Generate cache key
    const s3Key = config.generateS3Key();
    CacheUtils.logCacheInfo('save', config.input.key, config.input.s3Bucket, s3Key);

    // Check if cache already exists
    if (await s3Client.objectExists(s3Key)) {
      core.info(`Cache already exists for key ${config.input.key}, skipping save`);
      return;
    }

    await saveCache(s3Client, s3Key, validPaths, config.parsedInputs.compressionLevel, config.githubContext.repository, config.githubContext.ref, config.input.key);

  } catch (error) {
    if (error instanceof CacheError || error instanceof S3Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(`Unexpected error: ${error}`);
    }
  }
}

/**
 * Create archive and upload to S3
 */
async function saveCache(
  s3Client: S3CacheClient,
  s3Key: string,
  paths: string[],
  compressionLevel: number,
  repository: string,
  ref: string,
  cacheKey: string
): Promise<void> {
  const archivePath = 'cache.tar.gz';

  try {
    // Create cache archive
    await CacheUtils.createArchive(paths, archivePath, compressionLevel);

    // Prepare metadata
    const metadata: S3CacheMetadata = {
      repository,
      ref,
      key: cacheKey,
      created: new Date().toISOString()
    };

    // Upload to S3
    core.info('Uploading cache to S3');
    await s3Client.uploadObject(s3Key, archivePath, metadata);

    core.info('Cache saved successfully');

  } finally {
    // Cleanup archive file
    await CacheUtils.cleanup([archivePath]);
  }
}

// Run the action
if (require.main === module) {
  run();
}