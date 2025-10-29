import * as core from '@actions/core';
import { getInputs } from './utils/inputs';
import { S3CacheClient } from './utils/s3';
import { CacheUtils } from './utils/cache';
import { CacheError, S3Error, S3CacheMetadata } from './types';

/**
 * Main save function
 */
export async function run(): Promise<void> {
  try {
    core.info('S3 Cache Action - Save phase starting');

    // Add debug information
    core.debug('Reading action inputs...');
    const inputs = getInputs();

    core.debug('Getting GitHub context...');
    const { repository, ref } = CacheUtils.getGitHubContext();

    core.info(`Saving cache with key: ${inputs.key}`);

    // Validate that paths exist
    const { validPaths, missingPaths } = await CacheUtils.validatePaths(inputs.paths);

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
        region: inputs.awsRegion,
        credentials: {
          accessKeyId: inputs.awsAccessKeyId,
          secretAccessKey: inputs.awsSecretAccessKey
        }
      },
      inputs.s3Bucket
    );

    // Generate cache key
    const s3Key = S3CacheClient.generateCacheKey(inputs.s3Prefix, repository, ref, inputs.key);
    CacheUtils.logCacheInfo('save', inputs.key, inputs.s3Bucket, s3Key);

    // Check if cache already exists
    if (await s3Client.objectExists(s3Key)) {
      core.info(`Cache already exists for key ${inputs.key}, skipping save`);
      return;
    }

    await saveCache(s3Client, s3Key, validPaths, inputs.compressionLevel, repository, ref, inputs.key);

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