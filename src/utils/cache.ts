import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as fs from 'fs';
import { CacheError } from '../types';

export class CacheUtils {
  /**
   * Check if all specified paths exist
   */
  static async validatePaths(paths: string[]): Promise<{ validPaths: string[]; missingPaths: string[] }> {
    const validPaths: string[] = [];
    const missingPaths: string[] = [];

    for (const cachePath of paths) {
      const trimmedPath = cachePath.trim();
      if (trimmedPath && await CacheUtils.pathExists(trimmedPath)) {
        validPaths.push(trimmedPath);
      } else if (trimmedPath) {
        missingPaths.push(trimmedPath);
      }
    }

    return { validPaths, missingPaths };
  }

  /**
   * Check if a path exists
   */
  static async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async isZstdInstalled(): Promise<boolean> {
    try {
      await exec.exec('which', ['zstd']);
      return true;
    } catch {
      return false;
    }
  }

  static async createArchive(paths: string[], archivePath: string, compressionLevel: number, compressionMethod: string): Promise<void> {
    if (paths.length === 0) {
      throw new CacheError('No paths provided for archive creation');
    }

    core.info(`Creating cache archive with compression level ${compressionLevel}`);

    if (compressionMethod === 'zstd') {
      await CacheUtils.createZstdArchive(paths, archivePath, compressionLevel);
    } else {
      await CacheUtils.createGzipArchive(paths, archivePath, compressionLevel);
    }
  }

  /**
   * Create a compressed tar archive of the specified paths
   */
  static async createGzipArchive(paths: string[], archivePath: string, compressionLevel: number): Promise<void> {
    // Build tar command arguments
    const tarArgs = ['-czf', archivePath];

    // Add compression level if supported (GNU tar)
    if (compressionLevel !== 6) {
      tarArgs.push(`--gzip-level=${compressionLevel}`);
    }

    // Add all paths
    tarArgs.push(...paths);

    try {
      await exec.exec('tar', tarArgs);

      // Verify archive was created and has content
      const stats = await fs.promises.stat(archivePath);
      if (stats.size === 0) {
        throw new CacheError('Created archive is empty');
      }

      core.info(`Cache archive created (${stats.size} bytes)`);

      // List files in archive for debugging
      core.info('Listing files in archive:');
      await exec.exec('tar', ['-tvf', archivePath]);
    } catch (error: any) {
      throw new CacheError(`Failed to create archive: ${error.message}`);
    }
  }

  static async createZstdArchive(paths: string[], archivePath: string, compressionLevel: number): Promise<void> {
    if (!await CacheUtils.isZstdInstalled()) {
      throw new CacheError('zstd is not installed. Please install it to use zstd compression.');
    }

    const tarPath = `${archivePath}.tar`;

    try {
      await exec.exec('tar', ['-cf', tarPath, ...paths]);
      await exec.exec('zstd', ['-T0', `-${compressionLevel}`,'--rm', tarPath, '-o', archivePath]);

      // Verify archive was created and has content
      const stats = await fs.promises.stat(archivePath);
      if (stats.size === 0) {
        throw new CacheError('Created archive is empty');
      }

      core.info(`Cache archive created (${stats.size} bytes)`);

      // List files in archive for debugging
      core.info('Listing files in archive:');
      await exec.exec('tar', ['-tvf', archivePath]);
    } catch (error: any) {
      throw new CacheError(`Failed to create archive: ${error.message}`);
    }
  }

  static async extractArchive(archivePath: string, extractTo: string | undefined, compressionMethod: string): Promise<void> {
    core.info('Extracting cache archive');

    if (compressionMethod === 'zstd') {
      await CacheUtils.extractZstdArchive(archivePath, extractTo);
    } else {
      await CacheUtils.extractGzipArchive(archivePath, extractTo);
    }
  }

  /**
   * Extract a tar archive
   */
  static async extractGzipArchive(archivePath: string, extractTo?: string): Promise<void> {
    const tarArgs = ['-xzf', archivePath];

    if (extractTo) {
      tarArgs.push('-C', extractTo);
    }

    try {
      await exec.exec('tar', tarArgs);
      core.info('Cache archive extracted successfully');
    } catch (error: any) {
      throw new CacheError(`Failed to extract archive: ${error.message}`);
    }
  }

  static async extractZstdArchive(archivePath: string, extractTo?: string): Promise<void> {
    if (!await CacheUtils.isZstdInstalled()) {
      throw new CacheError('zstd is not installed. Please install it to use zstd compression.');
    }

    const tarPath = `${archivePath}.tar`;

    try {
      await exec.exec('zstd', ['-d', '--rm', '-o', tarPath, archivePath]);
      const tarArgs = ['-xf', tarPath];
      if (extractTo) {
        tarArgs.push('-C', extractTo);
      }
      await exec.exec('tar', tarArgs);
      core.info('Cache archive extracted successfully');
    } catch (error: any) {
      throw new CacheError(`Failed to extract archive: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (await CacheUtils.pathExists(filePath)) {
          await io.rmRF(filePath);
        }
      } catch (error: any) {
        core.warning(`Failed to cleanup file ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Get environment variables for GitHub context
   */
  static getGitHubContext(): { repository: string; ref: string } {
    const repository = process.env.GITHUB_REPOSITORY;
    const ref = process.env.GITHUB_REF_NAME;

    if (!repository) {
      throw new CacheError('GITHUB_REPOSITORY environment variable is not set');
    }

    if (!ref) {
      throw new CacheError('GITHUB_REF_NAME environment variable is not set');
    }

    return { repository, ref };
  }

  /**
   * Set action outputs
   */
  static setOutputs(cacheHit: boolean, primaryKey: string, matchedKey: string): void {
    core.setOutput('cache-hit', cacheHit.toString());
    core.setOutput('cache-primary-key', primaryKey);
    core.setOutput('cache-matched-key', matchedKey);
  }

  /**
   * Log cache operation info
   */
  static logCacheInfo(operation: 'restore' | 'save', key: string, bucket: string, s3Key: string): void {
    const action = operation === 'restore' ? 'Restoring' : 'Saving';
    core.info(`${action} cache with key: ${key}`);
    core.info(`S3 location: s3://${bucket}/${s3Key}`);
  }
}