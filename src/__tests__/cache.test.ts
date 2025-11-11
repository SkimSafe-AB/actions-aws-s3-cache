import * as fs from 'fs';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { CacheUtils } from '../utils/cache';

// Mock modules
const mockAccess = fs.promises.access as jest.MockedFunction<typeof fs.promises.access>;
const mockStat = fs.promises.stat as jest.MockedFunction<typeof fs.promises.stat>;
const mockExec = exec.exec as jest.MockedFunction<typeof exec.exec>;

describe('CacheUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePaths', () => {
    it('should separate valid and missing paths', async () => {
      mockAccess.mockImplementation(async (path) => {
        if (path === 'valid-path') {
          return Promise.resolve();
        }
        throw new Error('ENOENT');
      });

      const result = await CacheUtils.validatePaths(['valid-path', 'missing-path', '']);

      expect(result.validPaths).toEqual(['valid-path']);
      expect(result.missingPaths).toEqual(['missing-path']);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing paths', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await CacheUtils.pathExists('existing-path');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('existing-path');
    });

    it('should return false for non-existing paths', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await CacheUtils.pathExists('missing-path');

      expect(result).toBe(false);
    });
  });

  describe('createArchive', () => {
    it('should create archive with correct tar command', async () => {
      mockExec.mockResolvedValue(0);
      mockStat.mockResolvedValue({ size: 1024 } as fs.Stats);

      await CacheUtils.createArchive(['path1', 'path2'], 'archive.tar.gz', 6, 'gzip');

      expect(mockExec).toHaveBeenCalledWith('tar', [
        '-czf',
        'archive.tar.gz',
        'path1',
        'path2'
      ]);
    });

    it('should include compression level for non-default values', async () => {
      mockExec.mockResolvedValue(0);
      mockStat.mockResolvedValue({ size: 1024 } as fs.Stats);

      await CacheUtils.createArchive(['path1'], 'archive.tar.gz', 9, 'gzip');

      expect(mockExec).toHaveBeenCalledWith('tar', [
        '-czf',
        'archive.tar.gz',
        '--gzip-level=9',
        'path1'
      ]);
    });

    it('should throw error for empty paths', async () => {
      await expect(CacheUtils.createArchive([], 'archive.tar.gz', 6, 'gzip'))
        .rejects.toThrow('No paths provided for archive creation');
    });

    it('should throw error for empty archive', async () => {
      mockExec.mockResolvedValue(0);
      mockStat.mockResolvedValue({ size: 0 } as fs.Stats);

      await expect(CacheUtils.createArchive(['path1'], 'archive.tar.gz', 6, 'gzip'))
        .rejects.toThrow('Created archive is empty');
    });
  });

  describe('extractArchive', () => {
    it('should extract archive with correct tar command', async () => {
      mockExec.mockResolvedValue(0);

      await CacheUtils.extractArchive('archive.tar.gz', undefined, 'gzip');

      expect(mockExec).toHaveBeenCalledWith('tar', ['-xzf', 'archive.tar.gz']);
    });

    it('should extract to specified directory', async () => {
      mockExec.mockResolvedValue(0);

      await CacheUtils.extractArchive('archive.tar.gz', '/target/dir', 'gzip');

      expect(mockExec).toHaveBeenCalledWith('tar', [
        '-xzf',
        'archive.tar.gz',
        '-C',
        '/target/dir'
      ]);
    });
  });

  describe('extractZstdArchive', () => {
    it('should extract zstd archive and cleanup intermediate tar file', async () => {
      mockExec.mockResolvedValue(0);
      mockAccess.mockResolvedValue(undefined);

      const mockRmRF = require('@actions/io').rmRF as jest.MockedFunction<any>;
      mockRmRF.mockResolvedValue(undefined);

      await CacheUtils.extractZstdArchive('archive.tar.zst', undefined);

      // Verify zstd decompression
      expect(mockExec).toHaveBeenCalledWith('zstd', [
        '-d',
        '--rm',
        '-o',
        'archive.tar.zst.tar',
        'archive.tar.zst'
      ]);

      // Verify tar extraction
      expect(mockExec).toHaveBeenCalledWith('tar', ['-xf', 'archive.tar.zst.tar']);

      // Verify cleanup of intermediate tar file
      expect(mockRmRF).toHaveBeenCalledWith('archive.tar.zst.tar');
    });

    it('should extract zstd archive to specified directory and cleanup', async () => {
      mockExec.mockResolvedValue(0);
      mockAccess.mockResolvedValue(undefined);

      const mockRmRF = require('@actions/io').rmRF as jest.MockedFunction<any>;
      mockRmRF.mockResolvedValue(undefined);

      await CacheUtils.extractZstdArchive('archive.tar.zst', '/target/dir');

      // Verify tar extraction with directory
      expect(mockExec).toHaveBeenCalledWith('tar', [
        '-xf',
        'archive.tar.zst.tar',
        '-C',
        '/target/dir'
      ]);

      // Verify cleanup
      expect(mockRmRF).toHaveBeenCalledWith('archive.tar.zst.tar');
    });

    it('should cleanup intermediate tar file even if extraction fails', async () => {
      mockExec.mockImplementation(async (cmd) => {
        if (cmd === 'tar') {
          throw new Error('Extraction failed');
        }
        return 0;
      });
      mockAccess.mockResolvedValue(undefined);

      const mockRmRF = require('@actions/io').rmRF as jest.MockedFunction<any>;
      mockRmRF.mockResolvedValue(undefined);

      await expect(CacheUtils.extractZstdArchive('archive.tar.zst', undefined))
        .rejects.toThrow('Failed to extract archive: Extraction failed');

      // Verify cleanup was still called
      expect(mockRmRF).toHaveBeenCalledWith('archive.tar.zst.tar');
    });
  });

  describe('getGitHubContext', () => {
    it('should return GitHub context from environment variables', () => {
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_REF_NAME = 'feature-branch';

      const result = CacheUtils.getGitHubContext();

      expect(result).toEqual({
        repository: 'owner/repo',
        ref: 'feature-branch'
      });
    });

    it('should throw error when GITHUB_REPOSITORY is missing', () => {
      delete process.env.GITHUB_REPOSITORY;

      expect(() => CacheUtils.getGitHubContext())
        .toThrow('GITHUB_REPOSITORY environment variable is not set');
    });

    it('should throw error when GITHUB_REF_NAME is missing', () => {
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      delete process.env.GITHUB_REF_NAME;

      expect(() => CacheUtils.getGitHubContext())
        .toThrow('GITHUB_REF_NAME environment variable is not set');
    });
  });

  describe('setOutputs', () => {
    it('should set GitHub Actions outputs correctly', () => {
      const mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;

      CacheUtils.setOutputs(true, 'primary-key', 'matched-key');

      expect(mockSetOutput).toHaveBeenCalledWith('cache-hit', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('cache-primary-key', 'primary-key');
      expect(mockSetOutput).toHaveBeenCalledWith('cache-matched-key', 'matched-key');
    });
  });

  describe('logCacheInfo', () => {
    it('should log restore operation info', () => {
      const mockInfo = core.info as jest.MockedFunction<typeof core.info>;

      CacheUtils.logCacheInfo('restore', 'test-key', 'test-bucket', 's3/path/key.tar.gz');

      expect(mockInfo).toHaveBeenCalledWith('Restoring cache with key: test-key');
      expect(mockInfo).toHaveBeenCalledWith('S3 location: s3://test-bucket/s3/path/key.tar.gz');
    });

    it('should log save operation info', () => {
      const mockInfo = core.info as jest.MockedFunction<typeof core.info>;

      CacheUtils.logCacheInfo('save', 'test-key', 'test-bucket', 's3/path/key.tar.gz');

      expect(mockInfo).toHaveBeenCalledWith('Saving cache with key: test-key');
      expect(mockInfo).toHaveBeenCalledWith('S3 location: s3://test-bucket/s3/path/key.tar.gz');
    });
  });
});