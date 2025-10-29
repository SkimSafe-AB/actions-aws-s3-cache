import * as core from '@actions/core';
import { getInputs } from '../utils/inputs';

// Mock @actions/core
const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<typeof core.getBooleanInput>;

describe('getInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse valid inputs correctly', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'key': 'test-key',
        'path': 'node_modules\n.cache',
        'restore-keys': 'fallback-key-1\nfallback-key-2',
        'aws-access-key-id': 'AKIAIOSFODNN7EXAMPLE',
        'aws-secret-access-key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'aws-region': 'us-east-1',
        's3-bucket': 'test-bucket',
        's3-prefix': 'custom-prefix',
        'compression-level': '9'
      };
      return inputs[name] || '';
    });

    mockGetBooleanInput.mockReturnValue(false);

    const result = getInputs();

    expect(result).toEqual({
      key: 'test-key',
      paths: ['node_modules', '.cache'],
      restoreKeys: ['fallback-key-1', 'fallback-key-2'],
      awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      awsRegion: 'us-east-1',
      s3Bucket: 'test-bucket',
      s3Prefix: 'custom-prefix',
      compressionLevel: 9,
      failOnCacheMiss: false
    });
  });

  it('should use default values when optional inputs are not provided', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'key': 'test-key',
        'path': 'node_modules',
        'aws-access-key-id': 'AKIAIOSFODNN7EXAMPLE',
        'aws-secret-access-key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'aws-region': 'us-east-1',
        's3-bucket': 'test-bucket'
      };
      return inputs[name] || '';
    });

    mockGetBooleanInput.mockReturnValue(false);

    const result = getInputs();

    expect(result.s3Prefix).toBe('github-actions-cache');
    expect(result.compressionLevel).toBe(6);
    expect(result.restoreKeys).toBeUndefined();
  });

  it('should throw error for invalid compression level', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'key': 'test-key',
        'path': 'node_modules',
        'aws-access-key-id': 'AKIAIOSFODNN7EXAMPLE',
        'aws-secret-access-key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'aws-region': 'us-east-1',
        's3-bucket': 'test-bucket',
        'compression-level': '10' // Invalid level
      };
      return inputs[name] || '';
    });

    mockGetBooleanInput.mockReturnValue(false);

    expect(() => getInputs()).toThrow('compression-level must be between 1 and 9');
  });

  it('should throw error when no paths are specified', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'key': 'test-key',
        'path': '', // Empty path
        'aws-access-key-id': 'AKIAIOSFODNN7EXAMPLE',
        'aws-secret-access-key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'aws-region': 'us-east-1',
        's3-bucket': 'test-bucket'
      };
      return inputs[name] || '';
    });

    mockGetBooleanInput.mockReturnValue(false);

    expect(() => getInputs()).toThrow('At least one path must be specified');
  });

  it('should filter out empty lines in paths and restore keys', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'key': 'test-key',
        'path': 'node_modules\n\n.cache\n',
        'restore-keys': 'key1\n\nkey2\n\n',
        'aws-access-key-id': 'AKIAIOSFODNN7EXAMPLE',
        'aws-secret-access-key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'aws-region': 'us-east-1',
        's3-bucket': 'test-bucket'
      };
      return inputs[name] || '';
    });

    mockGetBooleanInput.mockReturnValue(false);

    const result = getInputs();

    expect(result.paths).toEqual(['node_modules', '.cache']);
    expect(result.restoreKeys).toEqual(['key1', 'key2']);
  });
});