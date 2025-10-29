import * as core from '@actions/core';
import { CacheInputs } from '../types';

/**
 * Parse and validate action inputs using modern GitHub Actions standards
 */
export function getInputs(): CacheInputs {
  // Read inputs with proper trimming and error handling
  const key = core.getInput('key', { required: true, trimWhitespace: true });
  const pathsInput = core.getInput('path', { required: true, trimWhitespace: true });
  const restoreKeysInput = core.getInput('restore-keys', { trimWhitespace: true });
  const awsAccessKeyId = core.getInput('aws-access-key-id', { required: true, trimWhitespace: true });
  const awsSecretAccessKey = core.getInput('aws-secret-access-key', { required: true, trimWhitespace: true });
  const awsRegion = core.getInput('aws-region', { required: true, trimWhitespace: true });
  const s3Bucket = core.getInput('s3-bucket', { required: true, trimWhitespace: true });
  const s3Prefix = core.getInput('s3-prefix', { trimWhitespace: true }) || 'github-actions-cache';
  const compressionLevel = parseInt(core.getInput('compression-level', { trimWhitespace: true }) || '6', 10);
  const failOnCacheMiss = core.getBooleanInput('fail-on-cache-miss');

  // Debug logging to help troubleshoot
  core.debug(`Inputs received - key: ${key ? 'present' : 'missing'}, paths: ${pathsInput ? 'present' : 'missing'}`);
  core.debug(`AWS config - region: ${awsRegion}, bucket: ${s3Bucket}, prefix: ${s3Prefix}`);

  // Parse paths - split by newlines and filter empty lines
  const paths = pathsInput
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Parse restore keys if provided
  const restoreKeys = restoreKeysInput
    ? restoreKeysInput
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)
    : undefined;

  // Validate compression level
  if (compressionLevel < 1 || compressionLevel > 9) {
    throw new Error('compression-level must be between 1 and 9');
  }

  // Validate required fields
  if (paths.length === 0) {
    throw new Error('At least one path must be specified');
  }

  return {
    key,
    paths,
    restoreKeys,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    s3Bucket,
    s3Prefix,
    compressionLevel,
    failOnCacheMiss
  };
}