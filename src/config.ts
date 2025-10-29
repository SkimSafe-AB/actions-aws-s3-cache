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
  };

  constructor() {
    // Get inputs directly using core.getInput
    this.input = {
      key: core.getInput('key'),
      path: core.getInput('path'),
      restoreKeys: core.getInput('restore-keys'),
      awsAccessKeyId: core.getInput('aws-access-key-id'),
      awsSecretAccessKey: core.getInput('aws-secret-access-key'),
      awsRegion: core.getInput('aws-region'),
      s3Bucket: core.getInput('s3-bucket'),
      s3Prefix: core.getInput('s3-prefix') || 'github-actions-cache',
      compressionLevel: core.getInput('compression-level') || '6',
      failOnCacheMiss: core.getInput('fail-on-cache-miss') === 'true'
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
      compressionLevel: parseInt(this.input.compressionLevel, 10)
    };

    // Log debug info
    core.info(`DEBUG Config: key=${this.input.key ? 'present' : 'missing'}`);
    core.info(`DEBUG Config: paths=${this.parsedInputs.paths.join(',')}`);
    core.info(`DEBUG Config: aws-region=${this.input.awsRegion}`);
    core.info(`DEBUG Config: s3-bucket=${this.input.s3Bucket}`);
    core.info(`DEBUG Config: github-repo=${this.githubContext.repository}`);
    core.info(`DEBUG Config: github-ref=${this.githubContext.ref}`);

    // Validate required inputs
    if (!this.input.key) {
      throw new CacheError(`The 'key' input is not specified`);
    }

    if (!this.input.path) {
      throw new CacheError(`The 'path' input is not specified`);
    }

    if (!this.input.awsAccessKeyId) {
      throw new CacheError(`The 'aws-access-key-id' input is not specified`);
    }

    if (!this.input.awsSecretAccessKey) {
      throw new CacheError(`The 'aws-secret-access-key' input is not specified`);
    }

    if (!this.input.awsRegion) {
      throw new CacheError(`The 'aws-region' input is not specified`);
    }

    if (!this.input.s3Bucket) {
      throw new CacheError(`The 's3-bucket' input is not specified`);
    }

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

    if (!this.githubContext.ref) {
      throw new CacheError('GITHUB_REF_NAME environment variable is not set');
    }
  }

  /**
   * Generate S3 cache key
   */
  generateS3Key(): string {
    const repoName = this.githubContext.repository.split('/').pop() || this.githubContext.repository;
    return `${this.input.s3Prefix}/${repoName}/${this.githubContext.ref}/${this.input.key}.tar.gz`;
  }
}

export default Config;