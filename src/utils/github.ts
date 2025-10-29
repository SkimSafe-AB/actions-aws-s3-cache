import * as core from '@actions/core';
import * as github from '@actions/github';
import { CacheError } from '../types';

export async function getJobStatus(githubToken: string): Promise<string> {
  const token = githubToken;
  const githubApiUrl = process.env.GITHUB_API_URL;
  const jobName = process.env.GITHUB_JOB;
  const runId = process.env.GITHUB_RUN_ID;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token || !githubApiUrl || !jobName || !runId || !repository) {
    core.warning('Missing GitHub Actions environment variables or token to determine job status. Assuming success.');
    return 'success';
  }

  const [owner, repo] = repository.split('/');

  try {
    // GitHub API requires a specific API version header
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json;api-version=6.0-preview',
      'User-Agent': 'actions/s3-cache'
    };

    // Construct the URL to get job details
    // This is a simplified example, the actual API might require more specific job ID
    // For now, we'll try to list jobs and find the current one by name
    const jobsUrl = `${githubApiUrl}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;

    core.info(`Querying GitHub API for job status: ${jobsUrl}`);

    const response = await fetch(jobsUrl, { headers });

    if (!response.ok) {
      core.warning(`Failed to query GitHub API for job status: ${response.status} - ${response.statusText}. Assuming success.`);
      return 'success';
    }

    const data: any = await response.json();
    const currentJob = data.value.find((job: any) => job.name === jobName);

    if (currentJob) {
      core.info(`Current job status: ${currentJob.status}`);
      return currentJob.status;
    } else {
      core.warning(`Could not find current job ('${jobName}') in API response. Assuming success.`);
      return 'success';
    }
  } catch (error: any) {
    core.warning(`Error querying GitHub API for job status: ${error.message}. Assuming success.`);
    return 'success';
  }
}
