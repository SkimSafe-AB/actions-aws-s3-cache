# S3 Cache Action

A GitHub Actions cache implementation that stores cache data in AWS S3, providing an alternative to GitHub's built-in cache with potentially lower costs and greater control.

## Features

- **S3 Storage**: Store cache data in your AWS S3 bucket
- **Compatible Interface**: Drop-in replacement for `actions/cache` with the same inputs/outputs
- **Restore Keys**: Support for fallback cache keys
- **Compression**: Configurable compression levels for cache archives
- **Cross-Repository**: Share caches across repositories in the same S3 bucket

## Usage

### Basic Example

```yaml
- name: Cache dependencies
  uses: ./path/to/s3-cache
  with:
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    path: |
      ~/.npm
      node_modules
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
    s3-bucket: my-cache-bucket
```

### With Restore Keys

```yaml
- name: Cache with fallback
  uses: ./path/to/s3-cache
  with:
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
      ${{ runner.os }}-
    path: node_modules
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
    s3-bucket: my-cache-bucket
    s3-prefix: github-actions-cache
```

### Custom Configuration

```yaml
- name: Cache with custom settings
  uses: ./path/to/s3-cache
  with:
    key: my-cache-key
    path: |
      ./dist
      ./build
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-west-2
    s3-bucket: my-cache-bucket
    s3-prefix: custom-prefix
    compression-level: 9
    fail-on-cache-miss: false
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `key` | ✓ | | An explicit key for restoring and saving the cache |
| `path` | ✓ | | A list of files, directories, and wildcard patterns to cache |
| `restore-keys` | | | An ordered list of keys to use for restoring stale cache if no cache hit occurred for key |
| `aws-access-key-id` | ✓ | | AWS access key ID |
| `aws-secret-access-key` | ✓ | | AWS secret access key |
| `aws-region` | ✓ | | AWS region |
| `s3-bucket` | ✓ | | S3 bucket name for cache storage |
| `s3-prefix` | | `github-actions-cache` | S3 key prefix for cache objects |
| `compression-level` | | `6` | Compression level for cache archive (1-9) |
| `fail-on-cache-miss` | | `false` | Fail the workflow if cache is not found |

## Outputs

| Output | Description |
|--------|-------------|
| `cache-hit` | A boolean value to indicate an exact match was found for the primary key |
| `cache-primary-key` | The key which was used to save the cache |
| `cache-matched-key` | The key which was used to restore the cache |

## S3 Storage Structure

Cache objects are stored in S3 with the following key structure:

```
{s3-prefix}/{repository-name}/{branch-name}/{cache-key}.tar.gz
```

For example:
```
github-actions-cache/my-repo/main/linux-node-abc123.tar.gz
```

## AWS Permissions

The AWS credentials provided must have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::your-cache-bucket/*"
    }
  ]
}
```

## Cache Behavior

1. **Restore Phase**: The action first attempts to restore cache using the exact key, then tries restore-keys in order
2. **Save Phase**: If no exact cache hit occurred, the action saves the cache at the end of the job
3. **Conditional Save**: Cache is only saved if the paths exist and no exact match was found

## Comparison with GitHub Actions Cache

| Feature | GitHub Actions Cache | S3 Cache |
|---------|---------------------|----------|
| Storage Location | GitHub's infrastructure | Your S3 bucket |
| Storage Limits | 10GB per repository | Limited by S3 storage |
| Cross-Repository | Limited | Full control via S3 bucket |
| Cost | Free (with limits) | S3 storage + transfer costs |
| Retention | 7 days (unused) | Configurable via S3 lifecycle |

## Troubleshooting

### Cache Not Found
- Verify S3 bucket name and region
- Check AWS credentials and permissions
- Ensure the cache key is correctly formatted

### Upload Failures
- Check S3 bucket permissions
- Verify AWS credentials are valid
- Ensure the specified paths exist

### Large Cache Archives
- Consider adjusting compression level
- Use more specific path patterns
- Implement S3 lifecycle policies for cleanup