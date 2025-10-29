#!/bin/bash
set -e

# Input parameters
KEY="$1"
PATHS="$2"
S3_BUCKET="$3"
S3_PREFIX="$4"
COMPRESSION_LEVEL="${5:-6}"

# Generate cache key based on repository and key
REPO_NAME="${GITHUB_REPOSITORY##*/}"
CACHE_KEY="${S3_PREFIX}/${REPO_NAME}/${GITHUB_REF_NAME}/${KEY}"

# Function to check if paths exist
check_paths_exist() {
    local paths="$1"
    local all_exist=true

    # Convert paths to array
    IFS=$'\n' read -rd '' -a paths_array <<< "$paths" || true

    for path in "${paths_array[@]}"; do
        path=$(echo "$path" | xargs) # trim whitespace
        if [ -n "$path" ] && [ ! -e "$path" ]; then
            echo "::warning::Path does not exist: $path"
            all_exist=false
        fi
    done

    if [ "$all_exist" = false ]; then
        echo "::warning::Some cache paths do not exist, skipping cache save"
        return 1
    fi

    return 0
}

# Function to create cache archive
create_cache_archive() {
    local paths="$1"
    local compression_level="$2"

    echo "::notice::Creating cache archive with compression level ${compression_level}"

    # Convert paths to array and build tar command
    IFS=$'\n' read -rd '' -a paths_array <<< "$paths" || true

    # Build tar arguments
    tar_args=()
    for path in "${paths_array[@]}"; do
        path=$(echo "$path" | xargs) # trim whitespace
        if [ -n "$path" ] && [ -e "$path" ]; then
            tar_args+=("$path")
        fi
    done

    if [ ${#tar_args[@]} -eq 0 ]; then
        echo "::error::No valid paths found to cache"
        return 1
    fi

    # Create compressed archive
    tar -czf cache.tar.gz "${tar_args[@]}"

    # Check if archive was created and has content
    if [ ! -f cache.tar.gz ] || [ ! -s cache.tar.gz ]; then
        echo "::error::Failed to create cache archive"
        return 1
    fi

    local archive_size=$(stat -f%z cache.tar.gz 2>/dev/null || stat -c%s cache.tar.gz 2>/dev/null)
    echo "::notice::Cache archive created (${archive_size} bytes)"

    return 0
}

# Function to upload to S3
upload_to_s3() {
    local s3_key="$1"

    echo "::notice::Uploading cache to s3://${S3_BUCKET}/${s3_key}"

    # Upload with metadata
    aws s3 cp cache.tar.gz "s3://${S3_BUCKET}/${s3_key}" \
        --metadata "repository=${GITHUB_REPOSITORY},ref=${GITHUB_REF_NAME},key=${KEY},created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    # Verify upload
    if aws s3api head-object --bucket "$S3_BUCKET" --key "$s3_key" >/dev/null 2>&1; then
        echo "::notice::Cache uploaded successfully"
        return 0
    else
        echo "::error::Failed to verify cache upload"
        return 1
    fi
}

# Main execution
echo "::notice::Saving cache with key: ${KEY}"

# Check if cache paths exist
if ! check_paths_exist "$PATHS"; then
    exit 0  # Exit gracefully if paths don't exist
fi

# Check if cache already exists in S3
if aws s3api head-object --bucket "$S3_BUCKET" --key "${CACHE_KEY}.tar.gz" >/dev/null 2>&1; then
    echo "::notice::Cache already exists for key ${KEY}, skipping save"
    exit 0
fi

# Create cache archive
if ! create_cache_archive "$PATHS" "$COMPRESSION_LEVEL"; then
    echo "::error::Failed to create cache archive"
    exit 1
fi

# Upload to S3
if ! upload_to_s3 "${CACHE_KEY}.tar.gz"; then
    echo "::error::Failed to upload cache to S3"
    rm -f cache.tar.gz
    exit 1
fi

# Cleanup
rm -f cache.tar.gz

echo "::notice::Cache saved successfully"
exit 0