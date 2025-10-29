import * as core from '@actions/core';
import * as github from '@actions/github';
import { CacheError } from './types';

class Config {
  public input: {
    key: string;
    path: string;
    restoreKeys?: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    s3Bucket: string;
    s3Prefix: string;
    compressionLevel: string;
    compressionMethod: string;
    failOnCacheMiss: boolean;
  };

  public githubContext: {
    owner: string;
    repo: string;
    repository: string;
    ref: string;
  };

  public parsedInputs: {
    paths: string[];
    restoreKeys?: string[];
    compressionLevel: number;
    compressionMethod: string;
  };

  constructor() {
    this.input = {
      key: core.getInput('key', { required: true, trimWhitespace: true }),
      path: core.getInput('path', { required: true, trimWhitespace: true }),
      restoreKeys: core.getInput('restore-keys', { trimWhitespace: true }),
      awsAccessKeyId: core.getInput('aws-access-key-id', { required: true, trimWhitespace: true }),
      awsSecretAccessKey: core.getInput('aws-secret-access-key', { required: true, trimWhitespace: true }),
      awsRegion: core.getInput('aws-region', { required: true, trimWhitespace: true }),
      s3Bucket: core.getInput('s3-bucket', { required: true, trimWhitespace: true }),
      s3Prefix: core.getInput('s3-prefix', { trimWhitespace: true }) || 'github-actions-cache',
      compressionLevel: core.getInput('compression-level', { trimWhitespace: true }) || '6',
      compressionMethod: core.getInput('compression-method', { trimWhitespace: true }) || 'gzip',
      failOnCacheMiss: core.getBooleanInput('fail-on-cache-miss')
    };

    // Get GitHub context
    this.githubContext = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      repository: process.env.GITHUB_REPOSITORY || '',
      ref: process.env.GITHUB_REF_NAME || ''
    };

    // Parse complex inputs
    this.parsedInputs = {
      paths: this.input.path
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0),
      restoreKeys: this.input.restoreKeys
        ? this.input.restoreKeys
            .split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 0)
        : undefined,
      compressionLevel: parseInt(this.input.compressionLevel, 10),
      compressionMethod: this.input.compressionMethod
    };

    // Log debug info
    core.info(`DEBUG Config: key=${this.input.key ? 'present' : 'missing'}`);
    core.info(`DEBUG Config: paths=${this.parsedInputs.paths.join(',')}`);
    core.info(`DEBUG Config: aws-region=${this.input.awsRegion}`);
    core.info(`DEBUG Config: s3-bucket=${this.input.s3Bucket}`);
    core.info(`DEBUG Config: github-repo=${this.githubContext.repository}`);
    core.info(`DEBUG Config: github-ref=${this.githubContext.ref}`);

    // Validate optional/parsed inputs

    if (this.parsedInputs.paths.length === 0) {
      throw new CacheError('At least one path must be specified');
    }

    if (!isNaN(this.parsedInputs.compressionLevel) &&
        (this.parsedInputs.compressionLevel < 1 || this.parsedInputs.compressionLevel > 9)) {
      throw new CacheError('compression-level must be between 1 and 9');
    }

    if (!this.githubContext.repository) {
      throw new CacheError('GITHUB_REPOSITORY environment variable is not set');
    }

    if (this.parsedInputs.compressionMethod && !['gzip', 'zstd'].includes(this.parsedInputs.compressionMethod)) {
      throw new CacheError('compression-method must be either `gzip` or `zstd`');
    }
  }

  /**
   * Generate S3 cache key
   */
  generateS3Key(): string {
    const repoName = this.githubContext.repository.split('/').pop() || this.githubContext.repository;
    const extension = this.parsedInputs.compressionMethod === 'zstd' ? 'tar.zst' : 'tar.gz';
    return `${this.input.s3Prefix}/${repoName}/${this.githubContext.ref}/${this.input.key}.${extension}`;
  }
}

export default Config;