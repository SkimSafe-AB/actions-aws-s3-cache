import * as core from '@actions/core';
import * as fs from 'fs';
import * as exec from '@actions/exec';
import { S3CacheClient } from '../utils/s3';
import { CacheUtils } from '../utils/cache';
import { getJobStatus } from '../utils/github';

// Mock modules
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  statSync: jest.fn(),
  promises: {
    ...jest.requireActual('fs').promises,
    access: jest.fn(),
    stat: jest.fn(),
    open: jest.fn()
  }
}));

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('../utils/s3');
jest.mock('../utils/cache');
jest.mock('../utils/github'); // Mock the new github utility

describe('Save Action', () => {
  const mockGetState = core.getState as jest.MockedFunction<typeof core.getState>;
  const mockInfo = core.info as jest.MockedFunction<typeof core.info>;
  const mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
  const mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
  const mockValidatePaths = CacheUtils.validatePaths as jest.MockedFunction<typeof CacheUtils.validatePaths>;
  const mockCreateArchive = CacheUtils.createArchive as jest.MockedFunction<typeof CacheUtils.createArchive>;
  const mockObjectExists = S3CacheClient.prototype.objectExists as jest.MockedFunction<typeof S3CacheClient.prototype.objectExists>;
  const mockUploadObject = S3CacheClient.prototype.uploadObject as jest.MockedFunction<typeof S3CacheClient.prototype.uploadObject>;
  const mockGenerateS3Key = jest.spyOn(S3CacheClient, 'generateCacheKey');
  const mockGetJobStatus = getJobStatus as jest.MockedFunction<typeof getJobStatus>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0; // Reset exit code before each test
    // Set required GitHub environment variables
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
    process.env.GITHUB_REF_NAME = 'main';

    // Mock core.getInput and core.getBooleanInput
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'key': return 'test-key';
        case 'path': return 'test-path';
        case 'aws-access-key-id': return 'test-access-key';
        case 'aws-secret-access-key': return 'test-secret-key';
        case 'aws-region': return 'us-east-1';
        case 's3-bucket': return 'test-bucket';
        case 's3-prefix': return 'github-actions-cache';
        case 'compression-level': return '6';
        case 'compression-method': return 'gzip';
        default: return '';
      }
    });
    (core.getBooleanInput as jest.Mock).mockReturnValue(false);

    // Mock CacheUtils.isZstdInstalled
    (CacheUtils.isZstdInstalled as jest.Mock).mockResolvedValue(true);

    // Mock getJobStatus
    mockGetJobStatus.mockResolvedValue('success');
  });

  it('should skip save if cache was restored', async () => {
    mockGetState.mockReturnValue('true');
    const { run } = await import('../save');
    await run();

    expect(mockInfo).toHaveBeenCalledWith('Cache was restored successfully, skipping save.');
    expect(mockValidatePaths).not.toHaveBeenCalled();
    expect(mockCreateArchive).not.toHaveBeenCalled();
    expect(mockUploadObject).not.toHaveBeenCalled();
  });

  it('should skip save if job failed', async () => {
    mockGetState.mockReturnValue('false');
    mockGetJobStatus.mockResolvedValue('failure');

    const { run } = await import('../save');
    await run();

    expect(mockInfo).toHaveBeenCalledWith('Job status is \'failure\', skipping cache save.');
    expect(mockValidatePaths).not.toHaveBeenCalled();
    expect(mockCreateArchive).not.toHaveBeenCalled();
    expect(mockUploadObject).not.toHaveBeenCalled();
  });

  it('should skip save if no valid paths are found', async () => {
    mockGetState.mockReturnValue('false');
    mockValidatePaths.mockResolvedValue({ validPaths: [], missingPaths: ['path1'] });

    const { run } = await import('../save');
    await run();

    expect(mockWarning).toHaveBeenCalledWith('No valid cache paths found, skipping cache save');
    expect(mockCreateArchive).not.toHaveBeenCalled();
    expect(mockUploadObject).not.toHaveBeenCalled();
  });

  it('should skip save if cache already exists in S3', async () => {
    mockGetState.mockReturnValue('false');
    mockValidatePaths.mockResolvedValue({ validPaths: ['test-path'], missingPaths: [] });
    mockObjectExists.mockResolvedValue(true);

    const { run } = await import('../save');
    await run();

    expect(mockInfo).toHaveBeenCalledWith('Cache already exists for key test-key, skipping save');
    expect(mockCreateArchive).not.toHaveBeenCalled();
    expect(mockUploadObject).not.toHaveBeenCalled();
  });

  it('should save cache if all conditions are met', async () => {
    mockGetState.mockReturnValue('false');
    mockValidatePaths.mockResolvedValue({ validPaths: ['test-path'], missingPaths: [] });
    mockObjectExists.mockResolvedValue(false);
    mockCreateArchive.mockResolvedValue(undefined);
    mockUploadObject.mockResolvedValue(undefined);
    mockGenerateS3Key.mockReturnValue('github-actions-cache/test-repo/main/test-key.tar.gz');

    const { run } = await import('../save');
    await run();

    expect(mockCreateArchive).toHaveBeenCalledWith(['test-path'], 'cache.tar.gz', 6, 'gzip');
    expect(mockUploadObject).toHaveBeenCalledWith(
      'github-actions-cache/test-repo/main/test-key.tar.gz',
      'cache.tar.gz',
      expect.objectContaining({
        repository: 'test-owner/test-repo',
        ref: 'main',
        key: 'test-key'
      })
    );
    expect(mockInfo).toHaveBeenCalledWith('Cache saved successfully');
  });

  it('should call setFailed on unexpected error', async () => {
    mockGetState.mockReturnValue('false');
    mockValidatePaths.mockRejectedValue(new Error('Unexpected validation error'));

    const { run } = await import('../save');
    await run();

    expect(mockSetFailed).toHaveBeenCalledWith('Unexpected error: Error: Unexpected validation error');
  });
});
