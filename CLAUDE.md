# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Actions composite action that provides S3-based caching as an alternative to GitHub's built-in cache. It's implemented in TypeScript with comprehensive testing and provides a drop-in replacement for `actions/cache` while storing cache data in AWS S3.

## Architecture

- **TypeScript Implementation**: Full TypeScript codebase with proper type safety
- **Composite Action**: Uses GitHub's composite action format
- **Two-Phase Operation**:
  - Restore phase: Downloads and extracts cache from S3 if available
  - Save phase: Compresses and uploads cache to S3 (only if no exact cache hit)
- **S3 Storage Pattern**: `{s3-prefix}/{repository-name}/{branch-name}/{cache-key}.tar.gz`
- **Modular Design**: Separate utilities for S3, cache operations, and input parsing

## Key Files

- `action.yml`: Main action configuration with inputs, outputs, and steps
- `src/restore.ts`: TypeScript implementation of cache restoration
- `src/save.ts`: TypeScript implementation of cache saving
- `src/utils/`: Utility modules for S3, cache operations, and input parsing
- `src/types/`: TypeScript type definitions and interfaces
- `src/__tests__/`: Comprehensive test suite

## Development Commands

### Build and Compilation
```bash
npm run build:all          # Build both restore and save entry points
npm run build:restore      # Build only restore functionality
npm run build:save         # Build only save functionality
npm run typecheck          # Type check without compilation
```

### Testing
```bash
npm test                   # Run test suite
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

### Code Quality
```bash
npm run lint               # Lint TypeScript code
npm run format             # Format code with Prettier
```

### Local Testing
```bash
# Build and test locally
npm run build:all
node dist/restore/index.js
node dist/save/index.js
```

## Key Implementation Details

### Cache Key Generation
- Uses repository name, branch, and user-provided key
- Format: `{s3-prefix}/{GITHUB_REPOSITORY##*/}/{GITHUB_REF_NAME}/{key}.tar.gz`
- Implemented in `S3CacheClient.generateCacheKey()`

### Error Handling
- Custom error classes: `CacheError`, `S3Error`
- Comprehensive error handling with proper GitHub Actions logging
- Graceful handling of missing cache paths and AWS errors

### AWS Integration
- Uses AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`)
- Direct AWS credential input (no external configuration required)
- Metadata tracking for cache objects

### Restore Key Logic
- Implemented in `src/restore.ts`
- Tries exact key match first
- Falls back to restore-keys in order if provided
- Returns appropriate cache-hit status and outputs

### Testing Strategy
- Mock-based testing for AWS SDK operations
- File system operations mocked for predictable testing
- Comprehensive coverage of all utility functions
- GitHub Actions core functions mocked

## Extension Points

When adding new features:
1. **New inputs**: Add to `action.yml` inputs section and `src/utils/inputs.ts`
2. **S3 operations**: Extend `S3CacheClient` class in `src/utils/s3.ts`
3. **Cache operations**: Add to `CacheUtils` class in `src/utils/cache.ts`
4. **Types**: Update interfaces in `src/types/index.ts`
5. **Tests**: Add corresponding test files in `src/__tests__/`

## Testing Guidelines

- Always add tests for new functions
- Mock external dependencies (AWS SDK, file system, GitHub Actions)
- Use descriptive test names and organize by functionality
- Aim for high coverage but focus on meaningful tests
- Test both success and error scenarios

## Build Process

- Uses `@vercel/ncc` for bundling TypeScript into single Node.js files
- Separate entry points for restore and save operations
- Source maps included for debugging
- All dependencies bundled for GitHub Actions compatibility

## Dependencies

### Runtime Dependencies
- `@actions/core`: GitHub Actions core functions
- `@actions/exec`: Command execution
- `@actions/io`: File operations
- `@aws-sdk/client-s3`: AWS S3 client
- `@aws-sdk/lib-storage`: AWS multipart upload

### Development Dependencies
- `typescript`: TypeScript compiler
- `jest`: Testing framework
- `@vercel/ncc`: Bundler for GitHub Actions
- `eslint`: Linting
- `prettier`: Code formatting

## Common Tasks

### Adding a New Utility Function
1. Add function to appropriate utility file
2. Export from the module
3. Add comprehensive tests
4. Update types if needed
5. Run tests and type checking

### Adding New S3 Operations
1. Extend `S3CacheClient` class
2. Add error handling with `S3Error`
3. Add tests with AWS SDK mocking
4. Update interface if needed

### Debugging
- Use `core.debug()` for debug logging
- Source maps available in dist/ for debugging compiled code
- Set `ACTIONS_STEP_DEBUG=true` for verbose GitHub Actions logging
- always ensure that all functions are covered by testing, also add a changelog to ensure that its easy to pick up where you left.