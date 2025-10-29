// Jest setup file for test configuration

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/lib-storage');

// Mock GitHub Actions core
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  promises: {
    access: jest.fn(),
    stat: jest.fn()
  }
}));

// Setup test environment variables
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
process.env.GITHUB_REF_NAME = 'main';

// Global test timeout
jest.setTimeout(30000);