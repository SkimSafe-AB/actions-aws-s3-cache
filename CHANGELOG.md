# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Cache Cleanup**: Fixed cleanup of intermediate `.tar` file after zstd cache extraction
  - The `extractZstdArchive` function now properly removes the `cache.tar.zst.tar` file after extraction
  - Cleanup is guaranteed even if extraction fails (using try-finally pattern)
  - Added comprehensive tests to verify cleanup behavior in both success and failure scenarios

### Technical Details
- Modified `src/utils/cache.ts:extractZstdArchive()` to call `CacheUtils.cleanup()` after tar extraction
- Added try-finally block to ensure cleanup happens even on extraction errors
- Added three new test cases in `src/__tests__/cache.test.ts` to cover:
  - Successful extraction with cleanup
  - Extraction to custom directory with cleanup
  - Cleanup on extraction failure

## [1.0.1] - 2025-10-29

### Fixed
- **Job Status Detection**: Fixed cache saving on failed jobs using GitHub Actions' built-in `post-if: 'success()'` condition
- **Action Definition**: Fixed `action.yml` file to remove `${{ github.token }}` example from description that was causing parsing errors
- **Duplicate Code**: Removed duplicate Config instantiation and logging in `src/save.ts`

### Changed
- **Simplified Architecture**: Adopted the same approach as `actions/cache` using `post-if: 'success()'` instead of complex GitHub API calls
- **Removed GitHub Token Requirement**: No longer requires `github-token` input parameter
- **Cleaner Code**: Removed complex job status detection logic in favor of GitHub Actions' native failure handling

### Technical Details
- Added `post-if: 'success()'` to `action.yml` to prevent cache saving on job failures
- Removed `getJobStatus()` function and related GitHub API logic
- Removed `github-token` input parameter from action definition
- Simplified `src/save.ts` by removing job status checking
- Updated tests to reflect simplified architecture

## [1.0.0] - 2024-10-29

### Added
- Initial implementation of S3 Cache GitHub Action
- TypeScript-based implementation replacing original bash scripts
- Complete test suite with comprehensive coverage
- S3-based cache storage with AWS SDK v3
- Support for cache restore keys and fallback logic
- Configurable compression levels for cache archives
- GitHub Actions compatible interface matching `actions/cache`
- Error handling with proper GitHub Actions logging
- Metadata tracking for cache objects in S3

### Features
- **S3 Storage**: Store cache data in AWS S3 buckets
- **Drop-in Replacement**: Compatible interface with `actions/cache`
- **Restore Keys**: Support for fallback cache keys
- **Compression**: Configurable compression levels (1-9)
- **Cross-Repository**: Share caches across repositories
- **Type Safety**: Full TypeScript implementation with proper types
- **Testing**: Comprehensive test suite with mocking
- **Error Handling**: Graceful error handling and logging

### Technical Details
- Built with TypeScript and AWS SDK v3
- Uses @vercel/ncc for bundling
- Comprehensive Jest test suite
- ESLint and Prettier configuration
- GitHub Actions composite action format
- S3 key structure: `{prefix}/{repo}/{branch}/{key}.tar.gz`

### Development Commands
- `npm run build:all` - Build both restore and save entry points
- `npm test` - Run test suite
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint TypeScript code
- `npm run typecheck` - Type check without compilation

### Current Status
✅ **COMPLETED**: Full TypeScript implementation with comprehensive testing
✅ **COMPLETED**: Build compilation with dist/ files ready for GitHub Actions
✅ **READY**: Action is fully built and ready for deployment
🔄 **NEXT**: Repository deployment and end-to-end testing

### Architecture
- **Entry Points**: Separate TypeScript files for restore and save operations
- **Utilities**: Modular utilities for S3, cache operations, and input parsing
- **Types**: Comprehensive TypeScript interfaces and error classes
- **Testing**: Mock-based testing for AWS SDK and file operations
- **Configuration**: ESLint, Prettier, Jest, and TypeScript configurations

### Dependencies
- **Runtime**: @actions/core, @actions/exec, @actions/io, @aws-sdk/client-s3, @aws-sdk/lib-storage
- **Development**: TypeScript, Jest, ESLint, Prettier, @vercel/ncc

### Migration from Bash
- Converted bash scripts to TypeScript for better maintainability
- Added comprehensive error handling and type safety
- Improved testing capabilities with proper mocking
- Enhanced logging and debugging support
- Better AWS SDK integration with modern v3 APIs