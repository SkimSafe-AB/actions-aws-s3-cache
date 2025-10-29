
#!/bin/bash
set -e

# Input parameters
KEY="$1"
PATHS="$2"
RESTORE_KEYS="$3"
S3_BUCKET="$4"
S3_PREFIX="$5"
FAIL_ON_MISS="$6"

# Generate cache key based on repository and key
REPO_NAME="${GITHUB_REPOSITORY##*/}"
CACHE_KEY="${S3_PREFIX}/${REPO_NAME}/${GITHUB_REF_NAME}/${KEY}"

# Function to check if S3 object exists
check_s3_object() {
    local s3_key="$1"
    aws s3api head-object --bucket "$S3_BUCKET" --key "$s3_key" >/dev/null 2>&1
}

# Function to download and extract cache
download_and_extract() {
    local s3_key="$1"
    local matched_key="$2"

    echo "::notice::Downloading cache from s3://${S3_BUCKET}/${s3_key}"

    # Download cache archive
    aws s3 cp "s3://${S3_BUCKET}/${s3_key}" cache.tar.gz

    # Extract cache
    echo "::notice::Extracting cache archive"
    tar -xzf cache.tar.gz
    rm cache.tar.gz

    # Set outputs
    echo "cache-hit=true" >> $GITHUB_OUTPUT
    echo "cache-primary-key=${KEY}" >> $GITHUB_OUTPUT
    echo "cache-matched-key=${matched_key}" >> $GITHUB_OUTPUT

    echo "::notice::Cache restored successfully"
    return 0
}

# Try exact key match first
echo "::notice::Looking for cache with key: ${KEY}"
if check_s3_object "${CACHE_KEY}.tar.gz"; then
    download_and_extract "${CACHE_KEY}.tar.gz" "${KEY}"
    exit 0
fi

# Try restore keys if provided
if [ -n "$RESTORE_KEYS" ]; then
    echo "::notice::Exact key not found, trying restore keys"
    IFS=$'\n' read -rd '' -a restore_keys_array <<< "$RESTORE_KEYS" || true

    for restore_key in "${restore_keys_array[@]}"; do
        restore_key=$(echo "$restore_key" | xargs) # trim whitespace
        if [ -n "$restore_key" ]; then
            restore_cache_key="${S3_PREFIX}/${REPO_NAME}/${GITHUB_REF_NAME}/${restore_key}"
            echo "::notice::Trying restore key: ${restore_key}"

            if check_s3_object "${restore_cache_key}.tar.gz"; then
                download_and_extract "${restore_cache_key}.tar.gz" "${restore_key}"
                exit 0
            fi
        fi
    done
fi

# No cache found
echo "::notice::Cache not found"
echo "cache-hit=false" >> $GITHUB_OUTPUT
echo "cache-primary-key=${KEY}" >> $GITHUB_OUTPUT
echo "cache-matched-key=" >> $GITHUB_OUTPUT

if [ "$FAIL_ON_MISS" = "true" ]; then
    echo "::error::Cache miss and fail-on-cache-miss is enabled"
    exit 1
fi

exit 0
