# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-29

### Fixed
- **Job Status Detection**: Fixed cache saving on failed jobs by improving job status detection
- **GitHub API Response**: Corrected API response parsing to use `jobs` array instead of `value`
- **Process Exit Code**: Added `process.exitCode` check as primary failure detection method
- **Conservative Fallback**: Changed fallback behavior from "success" to "unknown" to prevent cache saving when status cannot be determined
- **Action Definition**: Fixed `action.yml` file to remove `${{ github.token }}` example from description that was causing parsing errors

### Changed
- Job status detection now returns "unknown" instead of "success" when status cannot be determined
- Added `ACTIONS_RUNTIME_TOKEN` as fallback token source for GitHub API calls
- Updated GitHub API headers to use standard v3 format
- Enhanced error handling with more descriptive warnings

### Technical Details
- Updated `getJobStatus()` function in `src/utils/github.ts`
- Fixed duplicate Config instantiation in `src/save.ts`
- Added comprehensive tests for new job status detection logic
- Updated all test expectations to handle "unknown" status properly

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