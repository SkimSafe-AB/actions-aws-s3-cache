// Mock fs first
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

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  HeadObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn()
  }))
}));

import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import { S3CacheClient } from '../utils/s3';
import { S3Error } from '../types';

// Get mocked functions
const mockSend = jest.fn();
const mockUploadDone = jest.fn();
const mockCreateReadStream = fs.createReadStream as jest.MockedFunction<typeof fs.createReadStream>;
const mockCreateWriteStream = fs.createWriteStream as jest.MockedFunction<typeof fs.createWriteStream>;
const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;

describe('S3CacheClient', () => {
  let s3Client: S3CacheClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AWS SDK mocks
    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => ({
      send: mockSend
    } as any));

    (Upload as jest.MockedClass<typeof Upload>).mockImplementation(() => ({
      done: mockUploadDone
    } as any));

    s3Client = new S3CacheClient(
      {
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      },
      'test-bucket'
    );
  });

  describe('objectExists', () => {
    it('should return true when object exists', async () => {
      mockSend.mockResolvedValue({});

      const result = await s3Client.objectExists('test-key');

      expect(result).toBe(true);
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key'
      });
    });

    it('should return false when object does not exist', async () => {
      const notFoundError = new Error('NotFound');
      notFoundError.name = 'NotFound';
      mockSend.mockRejectedValue(notFoundError);

      const result = await s3Client.objectExists('test-key');

      expect(result).toBe(false);
    });

    it('should return false for 404 status code', async () => {
      const notFoundError = {
        $metadata: { httpStatusCode: 404 }
      };
      mockSend.mockRejectedValue(notFoundError);

      const result = await s3Client.objectExists('test-key');

      expect(result).toBe(false);
    });

    it('should throw S3Error for other errors', async () => {
      const error = new Error('Access denied');
      mockSend.mockRejectedValue(error);

      await expect(s3Client.objectExists('test-key'))
        .rejects.toThrow(S3Error);
    });
  });

  describe('downloadObject', () => {
    it('should download object to local file', async () => {
      const mockBody = {
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
      };

      mockSend.mockImplementation((command) => {
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({ ContentLength: 100 });
        } else if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: mockBody });
        }
        return Promise.resolve({});
      });

      // Mock fs.promises.open and fileHandle.write
      const mockFileHandle = {
        write: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue({})
      };
      jest.spyOn(fs.promises, 'open').mockResolvedValue(mockFileHandle as any);

      await s3Client.downloadObject('test-key', 'local-file.tar.gz');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key'
      });
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key',
        Range: 'bytes=0-99'
      });
      expect(fs.promises.open).toHaveBeenCalledWith('local-file.tar.gz', 'w');
      expect(mockFileHandle.write).toHaveBeenCalled();
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should throw error when content length is not determined', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({ ContentLength: undefined });
        }
        return Promise.resolve({});
      });

      await expect(s3Client.downloadObject('test-key', 'local-file.tar.gz'))
        .rejects.toThrow(S3Error);
    });

    it('should throw error when response body is empty for a part', async () => {
      mockSend.mockImplementation((command) => {
        if (command instanceof HeadObjectCommand) {
          return Promise.resolve({ ContentLength: 100 });
        } else if (command instanceof GetObjectCommand) {
          return Promise.resolve({ Body: null });
        }
        return Promise.resolve({});
      });

      await expect(s3Client.downloadObject('test-key', 'local-file.tar.gz'))
        .rejects.toThrow(S3Error);
    });
  });

  describe('uploadObject', () => {
    it('should upload file to S3', async () => {
      const mockFileStream = {};
      mockCreateReadStream.mockReturnValue(mockFileStream as any);
      mockStatSync.mockReturnValue({ size: 1024 } as fs.Stats);
      mockUploadDone.mockResolvedValue({});

      const metadata = {
        repository: 'owner/repo',
        ref: 'main',
        key: 'test-key',
        created: '2023-01-01T00:00:00Z'
      };

      await s3Client.uploadObject('s3-key', 'local-file.tar.gz', metadata);

      expect(Upload).toHaveBeenCalledWith({
        client: expect.anything(),
        params: {
          Bucket: 'test-bucket',
          Key: 's3-key',
          Body: mockFileStream,
          ContentLength: 1024,
          Metadata: {
            repository: 'owner/repo',
            ref: 'main',
            key: 'test-key',
            created: '2023-01-01T00:00:00Z'
          }
        }
      });
    });

    it('should upload without metadata when not provided', async () => {
      mockCreateReadStream.mockReturnValue({} as any);
      mockStatSync.mockReturnValue({ size: 1024 } as fs.Stats);
      mockUploadDone.mockResolvedValue({});

      await s3Client.uploadObject('s3-key', 'local-file.tar.gz');

      expect(Upload).toHaveBeenCalledWith({
        client: expect.anything(),
        params: {
          Bucket: 'test-bucket',
          Key: 's3-key',
          Body: expect.anything(),
          ContentLength: 1024,
          Metadata: undefined
        }
      });
    });
  });

  describe('generateCacheKey', () => {
    it('should generate correct S3 key', () => {
      const result = S3CacheClient.generateCacheKey(
        'github-cache',
        'owner/repo-name',
        'feature-branch',
        'cache-key'
      );

      expect(result).toBe('github-cache/repo-name/feature-branch/cache-key.tar.gz');
    });

    it('should handle repository names without owner', () => {
      const result = S3CacheClient.generateCacheKey(
        'cache',
        'repo-name',
        'main',
        'test-key'
      );

      expect(result).toBe('cache/repo-name/main/test-key.tar.gz');
    });
  });
});