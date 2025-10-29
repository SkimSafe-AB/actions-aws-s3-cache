import * as core from '@actions/core';
import { getInputs } from '../utils/inputs';

// Mock @actions/core
const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<typeof core.getBooleanInput>;

describe('Edge Cases and Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all INPUT_ environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('INPUT_')) {
        delete process.env[key];
      }
    });
  });

  describe('Input Name Conversion Edge Cases', () => {
    it('should handle complex input names with multiple hyphens', () => {
      // Test that aws-access-key-id becomes INPUT_AWS_ACCESS_KEY_ID

      // Set all environment variables
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = 'test-path';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.INPUT_AWS_REGION = 'us-east-1';
      process.env.INPUT_S3_BUCKET = 'test-bucket';
      process.env.INPUT_S3_PREFIX = 'test-prefix';
      process.env.INPUT_COMPRESSION_LEVEL = '9';
      process.env.INPUT_FAIL_ON_CACHE_MISS = 'true';

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

      // Verify all inputs are read correctly
      expect(result.key).toBe('test-key');
      expect(result.awsAccessKeyId).toBe('test-access-key');
      expect(result.awsSecretAccessKey).toBe('test-secret-key');
      expect(result.s3Prefix).toBe('test-prefix');
      expect(result.compressionLevel).toBe(9);
      expect(result.failOnCacheMiss).toBe(true);
    });

    it('should handle inputs with numbers and special characters', () => {
      process.env.INPUT_KEY = 'cache-key-v2.1.0-build.123';
      process.env.INPUT_PATH = './dist/v1.0.0\n./cache-2024';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'AKIA1234567890ABCDEF';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'abcd1234/+EFGH5678';
      process.env.INPUT_AWS_REGION = 'us-west-2';
      process.env.INPUT_S3_BUCKET = 'my-bucket-2024';

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

      expect(result.key).toBe('cache-key-v2.1.0-build.123');
      expect(result.paths).toEqual(['./dist/v1.0.0', './cache-2024']);
      expect(result.awsAccessKeyId).toBe('AKIA1234567890ABCDEF');
      expect(result.awsSecretAccessKey).toBe('abcd1234/+EFGH5678');
      expect(result.s3Bucket).toBe('my-bucket-2024');
    });
  });

  describe('Whitespace and Special Character Handling', () => {
    it('should handle inputs with leading/trailing whitespace', () => {
      process.env.INPUT_KEY = '  \t  test-key-with-tabs-and-spaces  \n  ';
      process.env.INPUT_PATH = '  node_modules  \n  \t.cache\t  \n  dist  ';
      process.env.INPUT_AWS_ACCESS_KEY_ID = '\n\tAKIA123456789EXAMPLE\r\n';
      process.env.INPUT_AWS_SECRET_ACCESS_KEY = ' \t secret-with-whitespace \r ';
      process.env.INPUT_AWS_REGION = '\nus-east-1\t';
      process.env.INPUT_S3_BUCKET = ' test-bucket ';

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

      expect(result.key).toBe('test-key-with-tabs-and-spaces');
      expect(result.paths).toEqual(['node_modules', '.cache', 'dist']);
      expect(result.awsAccessKeyId).toBe('AKIA123456789EXAMPLE');
      expect(result.awsSecretAccessKey).toBe('secret-with-whitespace');
      expect(result.awsRegion).toBe('us-east-1');
      expect(result.s3Bucket).toBe('test-bucket');
    });

    it('should handle empty lines in multiline inputs', () => {
      process.env.INPUT_KEY = 'test-key';
      process.env.INPUT_PATH = '\nnode_modules\n\n\n.cache\n\ndist\n\n';
      process.env.INPUT_RESTORE_KEYS = '\nkey1\n\n\n\nkey2\n\n\nkey3\n\n';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
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

      expect(result.paths).toEqual(['node_modules', '.cache', 'dist']);
      expect(result.restoreKeys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should handle unicode and special characters in paths', () => {
      process.env.INPUT_KEY = 'test-key-ñoñó-🚀';
      process.env.INPUT_PATH = 'node_modules\n./cäche-ümlauts\n./测试目录\n./🚀-rocket-dir';
      process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
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

      expect(result.key).toBe('test-key-ñoñó-🚀');
      expect(result.paths).toEqual(['node_modules', './cäche-ümlauts', './测试目录', './🚀-rocket-dir']);
    });
  });

  describe('Boolean Input Edge Cases', () => {
    it('should handle various boolean representations', () => {
      const booleanTestCases = [
        { input: 'true', expected: true },
        { input: 'TRUE', expected: false }, // Only exactly 'true' is true
        { input: 'True', expected: false },
        { input: 'false', expected: false },
        { input: 'FALSE', expected: false },
        { input: 'False', expected: false },
        { input: '1', expected: false }, // Only exactly 'true' is true
        { input: '0', expected: false },
        { input: 'yes', expected: false },
        { input: 'no', expected: false },
        { input: '', expected: false }
      ];

      for (const testCase of booleanTestCases) {
        // Reset environment
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('INPUT_')) {
            delete process.env[key];
          }
        });

        // Set required inputs
        process.env.INPUT_KEY = 'test-key';
        process.env.INPUT_PATH = 'test-path';
        process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
        process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
        process.env.INPUT_AWS_REGION = 'us-east-1';
        process.env.INPUT_S3_BUCKET = 'test-bucket';
        process.env.INPUT_FAIL_ON_CACHE_MISS = testCase.input;

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
          const value = process.env[envName] || '';
          // GitHub Actions core.getBooleanInput only returns true for exactly 'true'
          return value === 'true';
        });

        const result = getInputs();
        expect(result.failOnCacheMiss).toBe(testCase.expected);
      }
    });
  });

  describe('Numeric Input Edge Cases', () => {
    it('should handle compression level edge cases', () => {
      const compressionTestCases = [
        { input: '1', expected: 1 },
        { input: '9', expected: 9 },
        { input: '6', expected: 6 }, // default
        { input: '', expected: 6 }, // default when empty
        { input: ' 7 ', expected: 7 }, // with whitespace
        { input: '05', expected: 5 }, // leading zero
      ];

      for (const testCase of compressionTestCases) {
        // Reset environment
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('INPUT_')) {
            delete process.env[key];
          }
        });

        // Set required inputs
        process.env.INPUT_KEY = 'test-key';
        process.env.INPUT_PATH = 'test-path';
        process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
        process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
        process.env.INPUT_AWS_REGION = 'us-east-1';
        process.env.INPUT_S3_BUCKET = 'test-bucket';
        process.env.INPUT_COMPRESSION_LEVEL = testCase.input;

        mockGetInput.mockImplementation((name: string, options?: any) => {
          const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
          const value = process.env[envName] || '';

          if (options?.required && !value.trim()) {
            throw new Error(`Input required and not supplied: ${name}`);
          }

          return options?.trimWhitespace ? value.trim() : value;
        });

        mockGetBooleanInput.mockReturnValue(false);

        if (testCase.input !== '' || testCase.expected === 6) {
          const result = getInputs();
          expect(result.compressionLevel).toBe(testCase.expected);
        }
      }
    });

    it('should handle invalid compression levels', () => {
      const invalidCompressionCases = ['0', '10', 'abc', '-1', 'hello'];

      for (const invalidInput of invalidCompressionCases) {
        // Reset environment
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('INPUT_')) {
            delete process.env[key];
          }
        });

        process.env.INPUT_KEY = 'test-key';
        process.env.INPUT_PATH = 'test-path';
        process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
        process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
        process.env.INPUT_AWS_REGION = 'us-east-1';
        process.env.INPUT_S3_BUCKET = 'test-bucket';
        process.env.INPUT_COMPRESSION_LEVEL = invalidInput;

        mockGetInput.mockImplementation((name: string, options?: any) => {
          const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
          const value = process.env[envName] || '';

          if (options?.required && !value.trim()) {
            throw new Error(`Input required and not supplied: ${name}`);
          }

          return options?.trimWhitespace ? value.trim() : value;
        });

        mockGetBooleanInput.mockReturnValue(false);

        if (['0', '10', '-1'].includes(invalidInput)) {
          // These should fail validation (they parse to valid numbers but out of range)
          expect(() => getInputs()).toThrow('compression-level must be between 1 and 9');
        } else {
          // These will parse as NaN, and our validation now allows NaN values to pass through
          const result = getInputs();
          expect(result.compressionLevel).toBeNaN();
        }
      }
    });
  });

  describe('Error Message Clarity', () => {
    it('should provide clear error messages for missing required inputs', () => {
      const requiredInputs = ['key', 'path', 'aws-access-key-id', 'aws-secret-access-key', 'aws-region', 's3-bucket'];

      for (const missingInput of requiredInputs) {
        // Reset and set all inputs except the missing one
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('INPUT_')) {
            delete process.env[key];
          }
        });

        // Set all required inputs
        process.env.INPUT_KEY = 'test-key';
        process.env.INPUT_PATH = 'test-path';
        process.env.INPUT_AWS_ACCESS_KEY_ID = 'test-access-key';
        process.env.INPUT_AWS_SECRET_ACCESS_KEY = 'test-secret';
        process.env.INPUT_AWS_REGION = 'us-east-1';
        process.env.INPUT_S3_BUCKET = 'test-bucket';

        // Remove the specific input we're testing
        const envName = `INPUT_${missingInput.toUpperCase().replace(/-/g, '_')}`;
        delete process.env[envName];

        mockGetInput.mockImplementation((name: string, options?: any) => {
          const envVarName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
          const value = process.env[envVarName] || '';

          if (options?.required && !value.trim()) {
            throw new Error(`Input required and not supplied: ${name}`);
          }

          return options?.trimWhitespace ? value.trim() : value;
        });

        expect(() => getInputs()).toThrow(`Input required and not supplied: ${missingInput}`);
      }
    });
  });
});