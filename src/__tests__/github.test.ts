import * as core from '@actions/core';
import { getJobStatus } from '../utils/github';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('getJobStatus', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ACTIONS_RUNTIME_TOKEN: 'test-token',
      GITHUB_API_URL: 'https://api.github.com',
      GITHUB_JOB: 'test-job',
      GITHUB_RUN_ID: '12345',
      GITHUB_REPOSITORY: 'test-owner/test-repo',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return "unknown" if all environment variables are missing', async () => {
    process.env.ACTIONS_RUNTIME_TOKEN = '';
    process.env.ACTIONS_RUNTIME_URL = '';
    process.env.GITHUB_JOB = '';
    process.env.GITHUB_RUN_ID = '';
    process.env.GITHUB_REPOSITORY = '';

    const status = await getJobStatus('');
    expect(status).toBe('unknown');
    expect(core.warning).toHaveBeenCalledWith('Missing GitHub Actions environment variables or token to determine job status. Cannot determine status reliably.');
  });

  it('should return job status from GitHub API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          { name: 'other-job', status: 'completed', conclusion: 'success' },
          { name: 'test-job', status: 'completed', conclusion: 'failure' },
        ],
      }),
    });

    const status = await getJobStatus('test-token');
    expect(status).toBe('failure');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/test-owner/test-repo/actions/runs/12345/jobs',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'actions/s3-cache'
        }),
      })
    );
  });

  it('should return "unknown" if API call fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const status = await getJobStatus('test-token');
    expect(status).toBe('unknown');
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Failed to query GitHub API for job status'));
  });

  it('should return "unknown" if current job is not found in API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          { name: 'other-job', status: 'completed', conclusion: 'success' },
        ],
      }),
    });

    const status = await getJobStatus('test-token');
    expect(status).toBe('unknown');
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Could not find current job'));
  });

  it('should return "unknown" if an error occurs during API call', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const status = await getJobStatus('test-token');
    expect(status).toBe('unknown');
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Error querying GitHub API for job status'));
  });

  it('should return "failure" if process exit code is non-zero', async () => {
    const originalExitCode = process.exitCode;
    process.exitCode = 1;

    const status = await getJobStatus('test-token');
    expect(status).toBe('failure');
    expect(core.info).toHaveBeenCalledWith('Process exit code is 1, indicating job failure.');

    // Restore original exit code
    process.exitCode = originalExitCode;
  });
});