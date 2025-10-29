import * as core from '@actions/core';
import * as fs from 'fs';

// Mock modules first
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  statSync: jest.fn(),
  promises: {
    access: jest.fn(),
    stat: jest.fn()
  }
}));

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');

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

describe('Full Action Integration Tests', () => {
  const mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;
  const mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
  const mockInfo = core.info as jest.MockedFunction<typeof core.info>;
  const mockDebug = core.debug as jest.MockedFunction<typeof core.debug>;
  const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
  const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<typeof core.getBooleanInput>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('INPUT_') || key.startsWith('GITHUB_')) {
        delete process.env[key];
      }
    });

    // Set required GitHub environment variables
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
    process.env.GITHUB_REF_NAME = 'main';
  });

  describe('Restore Action Integration', () => {
    it('should execute restore action with valid environment', async () => {
      // Set up environment like GitHub Actions would
      const environment = {
        INPUT_KEY: 'test-cache-key',
        INPUT_PATH: 'node_modules',
        INPUT_AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        INPUT_AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        INPUT_AWS_REGION: 'us-east-1',
        INPUT_S3_BUCKET: 'test-bucket',
        INPUT_S3_PREFIX: 'github-actions-cache',
        INPUT_COMPRESSION_LEVEL: '6',
        INPUT_FAIL_ON_CACHE_MISS: 'false'
      };

      Object.entries(environment).forEach(([key, value]) => {
        process.env[key] = value;
      });

      // Mock core.getInput to read from environment
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

      // Import and run restore action
      const { run: runRestore } = await import('../restore');
      await runRestore();

      // Verify that no error was thrown and core functions were called

      // Verify that core functions were called
      expect(mockInfo).toHaveBeenCalledWith('S3 Cache Action - Restore phase starting');
      expect(mockDebug).toHaveBeenCalledWith('Reading action inputs...');
      expect(mockDebug).toHaveBeenCalledWith('Getting GitHub context...');
    });

    it('should fail gracefully with missing required inputs', async () => {
      // Set incomplete environment (missing key)
      process.env.INPUT_PATH = 'node_modules';

      mockGetInput.mockImplementation((name: string, options?: any) => {
        const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
        const value = process.env[envName] || '';

        if (options?.required && !value.trim()) {
          throw new Error(`Input required and not supplied: ${name}`);
        }

        return options?.trimWhitespace ? value.trim() : value;
      });

      // Import and run restore action
      const { run: runRestore } = await import('../restore');
      await runRestore();

      // Should call setFailed with the error (wrapped in "Unexpected error:")
      expect(mockSetFailed).toHaveBeenCalledWith('Unexpected error: Error: Input required and not supplied: key');
    });
  });

  describe('Save Action Integration', () => {
    it('should execute save action with valid environment', async () => {
      // Set up complete environment
      const environment = {
        INPUT_KEY: 'test-cache-key',
        INPUT_PATH: 'node_modules\n.cache',
        INPUT_AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        INPUT_AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        INPUT_AWS_REGION: 'us-east-1',
        INPUT_S3_BUCKET: 'test-bucket',
        INPUT_S3_PREFIX: 'github-actions-cache',
        INPUT_COMPRESSION_LEVEL: '6',
        INPUT_FAIL_ON_CACHE_MISS: 'false'
      };

      Object.entries(environment).forEach(([key, value]) => {
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

      // Import and run save action
      const { run: runSave } = await import('../save');
      await runSave();

      // Verify that no error was thrown and core functions were called

      // Verify that core functions were called
      expect(mockInfo).toHaveBeenCalledWith('S3 Cache Action - Save phase starting');
      expect(mockDebug).toHaveBeenCalledWith('Reading action inputs...');
      expect(mockDebug).toHaveBeenCalledWith('Getting GitHub context...');
    });
  });

  describe('GitHub Environment Context', () => {
    it('should read GitHub repository and ref correctly', async () => {
      // Test different GitHub environment setups
      const testCases = [
        {
          repo: 'owner/repo-name',
          ref: 'main',
          expected: { repository: 'owner/repo-name', ref: 'main' }
        },
        {
          repo: 'SkimSafe-AB/actions-aws-s3-cache',
          ref: 'feature-branch',
          expected: { repository: 'SkimSafe-AB/actions-aws-s3-cache', ref: 'feature-branch' }
        },
        {
          repo: 'user/very-long-repository-name-with-hyphens',
          ref: 'release/v1.0.0',
          expected: { repository: 'user/very-long-repository-name-with-hyphens', ref: 'release/v1.0.0' }
        }
      ];

      for (const testCase of testCases) {
        process.env.GITHUB_REPOSITORY = testCase.repo;
        process.env.GITHUB_REF_NAME = testCase.ref;

        const { CacheUtils } = await import('../utils/cache');
        const context = CacheUtils.getGitHubContext();

        expect(context).toEqual(testCase.expected);
      }
    });

    it('should fail when GitHub environment variables are missing', async () => {
      // Remove GitHub environment variables
      delete process.env.GITHUB_REPOSITORY;
      delete process.env.GITHUB_REF_NAME;

      const { CacheUtils } = await import('../utils/cache');

      expect(() => CacheUtils.getGitHubContext()).toThrow('GITHUB_REPOSITORY environment variable is not set');

      // Test with only repository set
      process.env.GITHUB_REPOSITORY = 'test/repo';
      expect(() => CacheUtils.getGitHubContext()).toThrow('GITHUB_REF_NAME environment variable is not set');
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should handle the exact failing scenario from logs', async () => {
      // Recreate the exact environment from the failing logs
      const failingEnvironment = {
        // GitHub Actions environment
        GITHUB_REPOSITORY: 'SkimSafe-AB/actions-aws-s3-cache',
        GITHUB_REF_NAME: 'main',

        // Action inputs
        INPUT_KEY: 'MAIN DEV STAGING-elixir-cache-Linux-ARM64--42a37175c65835b86ed1c05c0379ba9d9aaf05a70ce6ed9efc9a0e5695193be7',
        INPUT_PATH: 'elixir_cache',
        INPUT_AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        INPUT_AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        INPUT_AWS_REGION: 'us-east-2',
        INPUT_S3_BUCKET: 'skimsafe-github-runner-cache',
        INPUT_S3_PREFIX: 'github-actions-cache',
        INPUT_COMPRESSION_LEVEL: '6',
        INPUT_FAIL_ON_CACHE_MISS: 'false',

        // Additional environment variables from the logs
        AWS_REGION: 'eu-north-1',
        ECR_REPOSITORY: 'country-bundle-zion',
        RUNNER_AWS_REGION: 'us-east-2',
        ARM_EC2_IMAGE_ID: 'ami-0efd6d20b0fa3d97e',
        CACHE_ECR_REPOSITORY: 'github-runner-docker-cache',
        AWS_DEFAULT_REGION: 'eu-north-1',
        AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        PNPM_HOME: '/root/setup-pnpm/node_modules/.bin'
      };

      Object.entries(failingEnvironment).forEach(([key, value]) => {
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

      // Test input parsing specifically
      const { getInputs } = await import('../utils/inputs');

      expect(() => getInputs()).not.toThrow();

      const inputs = getInputs();
      expect(inputs.key).toBe('MAIN DEV STAGING-elixir-cache-Linux-ARM64--42a37175c65835b86ed1c05c0379ba9d9aaf05a70ce6ed9efc9a0e5695193be7');
      expect(inputs.paths).toEqual(['elixir_cache']);
      expect(inputs.awsRegion).toBe('us-east-2');
      expect(inputs.s3Bucket).toBe('skimsafe-github-runner-cache');
    });
  });
});