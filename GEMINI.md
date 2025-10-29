# Project Overview

This project is a GitHub Action that provides a caching mechanism using an AWS S3 bucket as storage. It serves as an alternative to the native GitHub Actions cache, offering more control over the cache and potentially lower costs. The action is written in TypeScript and is designed to be a drop-in replacement for the official `actions/cache` action.

## Key Technologies

- **Node.js:** The runtime environment for the action.
- **TypeScript:** The primary programming language used.
- **GitHub Actions Toolkit:** A set of Node.js packages to create GitHub Actions.
- **AWS SDK for JavaScript (v3):** Used to interact with AWS S3 for storing and retrieving the cache.
- **Jest:** The testing framework for unit and integration tests.
- **ESLint and Prettier:** For code linting and formatting.
- **ncc:** For compiling the TypeScript code into a single executable file for each entry point.

## Architecture

The action is a "composite" action, as defined in `action.yml`. It has two main entry points, which are executed in different phases of a GitHub Actions job:

1.  **`restore`:** This phase runs at the beginning of a job. It attempts to find and download a cache from the S3 bucket. It first looks for a cache with an exact key match. If no exact match is found, it searches for caches using a list of "restore keys."
2.  **`save`:** This phase runs at the end of a job, but only if no exact cache hit was found during the `restore` phase. It creates a compressed tarball of the files and directories specified in the `path` input and uploads it to the S3 bucket.

The core logic is organized into the following files:

-   **`src/restore.ts`:** The entry point for the cache restoration logic.
-   **`src/save.ts`:** The entry point for the cache saving logic.
-   **`src/config.ts`:** Handles the parsing and validation of the action's inputs.
-   **`src/utils/s3.ts`:** A client for interacting with the AWS S3 API.
-   **`src/utils/cache.ts`:** Contains utility functions for creating, extracting, and managing cache archives.

# Building and Running

The following commands are used to build, test, and run the project. They are defined in the `scripts` section of the `package.json` file.

-   **`pnpm install`**: Install the project dependencies.
-   **`pnpm run build:all`**: Build the production-ready code. This command compiles the TypeScript source files into JavaScript and packages them into the `dist` directory.
-   **`pnpm test`**: Run the test suite using Jest.
-   **`pnpm run lint`**: Lint the codebase for potential errors and style issues using ESLint.
-   **`pnpm run format`**: Format the code using Prettier.
-   **`pnpm run typecheck`**: Run the TypeScript compiler to check for type errors.

# Development Conventions

-   **Code Style:** The project uses Prettier for automatic code formatting and ESLint for enforcing code quality and style. The configuration for these tools can be found in `.prettierrc` and `.eslintrc.js`, respectively.
-   **Testing:** The project uses Jest for testing. Test files are located in the `src/__tests__` directory and have the `.test.ts` extension.
-   **Commits:** The project does not seem to have a strict commit message convention, but the commit history shows a preference for descriptive and concise messages.
-   **Branching:** The project uses a `main` branch for the primary line of development.
-   **Dependency Management:** The project uses `pnpm` for package management. The dependencies are listed in `package.json`, and the exact versions are locked in `pnpm-lock.yaml`.
