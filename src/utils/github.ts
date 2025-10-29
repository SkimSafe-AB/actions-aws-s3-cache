import * as core from '@actions/core';
import * as github from '@actions/github';
import { CacheError } from '../types';

export async function getJobStatus(githubToken: string): Promise<string> {
  // First check process exit code - most reliable indicator
  if (process.exitCode && process.exitCode !== 0) {
    core.info(`Process exit code is ${process.exitCode}, indicating job failure.`);
    return 'failure';
  }

  const token = githubToken || process.env.ACTIONS_RUNTIME_TOKEN || process.env.GITHUB_TOKEN;
  const githubApiUrl = process.env.GITHUB_API_URL;
  const jobName = process.env.GITHUB_JOB;
  const runId = process.env.GITHUB_RUN_ID;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token || !githubApiUrl || !jobName || !runId || !repository) {
    core.warning('Missing GitHub Actions environment variables or token to determine job status. Cannot determine status reliably.');
    return 'unknown';
  }

  const [owner, repo] = repository.split('/');

  try {
    // GitHub API headers
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'actions/s3-cache'
    };

    const jobsUrl = `${githubApiUrl}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;

    core.debug(`Querying GitHub API for job status: ${jobsUrl}`);

    const response = await fetch(jobsUrl, { headers });

    if (!response.ok) {
      core.warning(`Failed to query GitHub API for job status: ${response.status} - ${response.statusText}. Cannot determine status reliably.`);
      return 'unknown';
    }

    const data: any = await response.json();
    const currentJob = data.jobs?.find((job: any) => job.name === jobName);

    if (currentJob) {
      const status = currentJob.conclusion || currentJob.status;
      core.info(`Current job status from API: ${status}`);
      return status;
    } else {
      core.warning(`Could not find current job ('${jobName}') in API response. Cannot determine status reliably.`);
      return 'unknown';
    }
  } catch (error: any) {
    core.warning(`Error querying GitHub API for job status: ${error.message}. Cannot determine status reliably.`);
    return 'unknown';
  }
}
