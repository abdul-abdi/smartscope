# Contributing to SmartScope

Thank you for your interest in contributing to SmartScope! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing to the Multi-File IDE](#contributing-to-the-multi-file-ide)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/smartscope.git`
3. Navigate to the project directory: `cd smartscope`
4. Install dependencies: `npm install` or `yarn`
5. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

## Development Setup

1. Set up environment variables following the instructions in the README.md
2. Start the development server: `npm run dev` or `yarn dev`
3. Visit `http://localhost:3000` to see your changes

## Project Structure

```
smartscope/
├── app/                  # Next.js app directory
│   ├── api/              # API routes for contract interactions
│   ├── create/           # Contract creation and Multi-File IDE
│   ├── interact/         # Contract interaction interface
│   ├── learn/            # Educational content
│   └── roadmap/          # Platform roadmap
├── components/           # Shared UI components
│   ├── providers/        # Context providers
│   └── ui/               # UI components
├── lib/                  # Utility functions and shared logic
└── public/               # Static assets
```

## Contributing to the Multi-File IDE

The Multi-File IDE is a complex component that enables developers to work with multi-file Solidity projects. Understanding its architecture is important for making contributions:

### Key Files

- `app/create/MultiFileIDE.tsx`: Main IDE component with file management and editor integration
- `app/create/SolidityEditor.tsx`: Specialized editor for Solidity with syntax highlighting
- `components/providers/file-system-provider.tsx`: Context provider for the virtual file system
- `components/ui/file-explorer.tsx`: UI component for browsing files and directories
- `components/ui/tabs-manager.tsx`: UI component for managing editor tabs

### Working with the File System

The virtual file system is managed through the `FileSystemProvider`. When making changes:

1. Use the provided file system methods rather than modifying the state directly
2. Keep in mind that files are persisted in localStorage, so consider storage limits
3. Test thoroughly with different file structures and import scenarios

### Adding Features to the IDE

When adding new features to the IDE:

1. Maintain the existing architecture patterns
2. Use React.memo and memoization patterns to maintain performance
3. Keep the UI responsive for files of various sizes
4. Test with imports and dependencies to ensure everything resolves correctly
5. Support both simple cases and complex multi-level dependencies

### External Library Support

When working with external library functionality:

1. Test with latest versions of OpenZeppelin and other common libraries
2. Ensure proper version detection and compatibility checking
3. Handle edge cases like circular dependencies and missing imports
4. Provide clear error messages for library-related issues

## Coding Standards

- Follow the existing code style for consistency
- Use TypeScript for type safety
- Use React hooks for state management
- Comment complex logic for better understanding
- Ensure accessibility compliance
- Optimize for performance, especially for larger projects

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md following the existing format
3. Ensure all tests pass before submitting a pull request
4. Link any relevant issues in your pull request description
5. Request a code review from at least one maintainer

## Testing

- Run tests with `npm test` or `yarn test`
- Test your feature with different browsers and screen sizes
- Test with various contract types and complexity levels
- For Multi-File IDE features, test with complex imports and file structures

Thank you for contributing to making SmartScope better! 