import * as core from '@actions/core';
import { getInputs } from '../utils/inputs';

// Mock @actions/core
const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<typeof core.getBooleanInput>;

describe('Environment Variable and Input Reading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all environment variables that might affect tests
    delete process.env.INPUT_KEY;
    delete process.env.INPUT_PATH;
    delete process.env.INPUT_AWS_ACCESS_KEY_ID;
    delete process.env.INPUT_AWS_SECRET_ACCESS_KEY;
    delete process.env.INPUT_AWS_REGION;
    delete process.env.INPUT_S3_BUCKET;
  });

  describe('GitHub Actions Environment Variable Format', () => {
    it('should read inputs correctly when set as environment variables', () => {
      // Simulate how GitHub Actions sets environment variables
      process.env.INPUT_KEY = 'test-cache-key';
      process.env.INPUT_PATH = 'node_modules\n.cache';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      process.env.INPUT_AWS_REGION = 'us-east-1';
      process.env.INPUT_S3_BUCKET = 'test-bucket';

      // Mock core.getInput to return the actual environment variables
      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockReturnValue(false);

      const result = getInputs();

      expect(result.key).toBe('test-cache-key');
      expect(result.paths).toEqual(['node_modules', '.cache']);
      expect(result.awsAccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.awsRegion).toBe('us-east-1');
      expect(result.s3Bucket).toBe('test-bucket');
    });

    it('should handle hyphenated input names correctly', () => {
      // Test that aws-access-key-id becomes INPUT_AWS_ACCESS_KEY_ID
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.INPUT_AWS_REGION = 'us-west-2';
      process.env.INPUT_S3_BUCKET = 'test-bucket';
      process.env.INPUT_S3_PREFIX = 'custom-prefix';
      process.env.INPUT_COMPRESSION_LEVEL = '9';
      process.env.INPUT_FAIL_ON_CACHE_MISS = 'true';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockImplementation((name: string) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        return process.env[envName] === 'true';
      });

      // Set required inputs
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = 'test-path';

      const result = getInputs();

      expect(result.awsAccessKeyId).toBe('test-key-id');
      expect(result.awsSecretAccessKey).toBe('test-secret-key');
      expect(result.s3Prefix).toBe('custom-prefix');
      expect(result.compressionLevel).toBe(9);
      expect(result.failOnCacheMiss).toBe(true);
    });

    it('should trim whitespace from inputs when trimWhitespace is enabled', () => {
      process.env.INPUT_KEY = '  test-key-with-spaces  ';
      process.env.INPUT_PATH = '  node_modules  \n  .cache  ';
      process.env.INPUT_AWS_ACCESS_KEY_ID = '  AKIAIOSFODNN7EXAMPLE  ';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = '  secret  ';
      process.env.INPUT_AWS_REGION = '  us-east-1  ';
      process.env.INPUT_S3_BUCKET = '  test-bucket  ';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockReturnValue(false);

      const result = getInputs();

      expect(result.key).toBe('test-key-with-spaces');
      expect(result.paths).toEqual(['node_modules', '.cache']);
      expect(result.awsAccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.s3Bucket).toBe('test-bucket');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when required input is missing', () => {
      mockGetInput.mockImplementation((name: string, options?: any) => {
        if (options?.required) {
          throw new Error(`Input required and not supplied: ${name}`);
        }
        return '';
      });

      expect(() => getInputs()).toThrow('Input required and not supplied: key');
    });

    it('should throw error when required input is empty string', () => {
      process.env.INPUT_KEY = '';
      process.env.INPUT_PATH = 'test-path';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      expect(() => getInputs()).toThrow('Input required and not supplied: key');
    });

    it('should throw error when required input is only whitespace', () => {
      process.env.INPUT_KEY = '   ';
      process.env.INPUT_PATH = 'test-path';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      expect(() => getInputs()).toThrow('Input required and not supplied: key');
    });
  });

  describe('Real GitHub Actions Environment Simulation', () => {
    it('should work with actual GitHub Actions environment variables', () => {
      // Simulate the exact environment that GitHub Actions creates
      const realEnvironment = {
        INPUT_KEY: 'MAIN DEV STAGING-elixir-cache-Linux-ARM64--42a37175c65835b86ed1c05c0379ba9d9aaf05a70ce6ed9efc9a0e5695193be7',
        INPUT_PATH: 'elixir_cache',
        INPUT_AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        INPUT_AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        INPUT_AWS_REGION: 'us-east-2',
        INPUT_S3_BUCKET: 'skimsafe-github-runner-cache',
        INPUT_S3_PREFIX: 'github-actions-cache',
        INPUT_COMPRESSION_LEVEL: '6',
        INPUT_FAIL_ON_CACHE_MISS: 'false'
      };

      // Set environment variables
      Object.entries(realEnvironment).forEach(([key, value]) => {
        process.env[key] = value;
      });

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockImplementation((name: string) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        return process.env[envName] === 'true';
      });

      const result = getInputs();

      expect(result.key).toBe('MAIN DEV STAGING-elixir-cache-Linux-ARM64--42a37175c65835b86ed1c05c0379ba9d9aaf05a70ce6ed9efc9a0e5695193be7');
      expect(result.paths).toEqual(['elixir_cache']);
      expect(result.awsRegion).toBe('us-east-2');
      expect(result.s3Bucket).toBe('skimsafe-github-runner-cache');
      expect(result.s3Prefix).toBe('github-actions-cache');
      expect(result.compressionLevel).toBe(6);
      expect(result.failOnCacheMiss).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiline paths correctly', () => {
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = 'node_modules\n.cache\ndist\n\n.next';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.INPUT_AWS_REGION = 'us-east-1';
      process.env.INPUT_S3_BUCKET = 'test-bucket';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockReturnValue(false);

      const result = getInputs();

      expect(result.paths).toEqual(['node_modules', '.cache', 'dist', '.next']);
    });

    it('should handle restore keys correctly', () => {
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = 'node_modules';
      process.env.INPUT_RESTORE_KEYS = 'fallback-1\nfallback-2\n\nfallback-3';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.INPUT_AWS_REGION = 'us-east-1';
      process.env.INPUT_S3_BUCKET = 'test-bucket';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockReturnValue(false);

      const result = getInputs();

      expect(result.restoreKeys).toEqual(['fallback-1', 'fallback-2', 'fallback-3']);
    });

    it('should handle missing optional inputs gracefully', () => {
      // Clear all environment variables first
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('INPUT_')) {
          delete process.env[key];
        }
      });

      // Only set required inputs
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = 'node_modules';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.INPUT_AWS_REGION = 'us-east-1';
      process.env.INPUT_S3_BUCKET = 'test-bucket';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      mockGetBooleanInput.mockReturnValue(false);

      const result = getInputs();

      expect(result.restoreKeys).toBeUndefined();
      expect(result.s3Prefix).toBe('github-actions-cache'); // default value
      expect(result.compressionLevel).toBe(6); // default value
      expect(result.failOnCacheMiss).toBe(false); // default value
    });
  });
});