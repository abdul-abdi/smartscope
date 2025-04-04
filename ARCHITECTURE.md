# Karibu Architecture

This document outlines the high-level architecture of the Karibu platform, detailing key components, data flows, and design decisions.

## System Overview

Karibu is a Next.js application that provides a comprehensive platform for smart contract development, analysis, deployment, and interaction on the Hedera network.

### Core Components

```
karibu/
├── app/                  # Next.js app directory (App Router)
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

## Key Subsystems

### 1. File System and Multi-File IDE

The Multi-File IDE is built around a virtual file system that allows developers to work with complex project structures.

#### Components:

- **FileSystemProvider**: A React context provider that manages the file system state:
  - Files and folders structure
  - File content updates
  - Selection and navigation
  - Persistence of file system state

- **MultiFileIDE**: The main IDE component integrating:
  - File explorer interface
  - Editor area with tabs
  - Toolbar and action buttons
  - Compilation status indicators

- **Dependency Management**:
  - Automatic import resolution
  - External library detection
  - Circular dependency detection 
  - Visual indication of dependencies

#### Key Features:

- **Multi-file Editing**: Support for editing multiple files with tabbed interface
- **Project Management**: Creation, organization, and management of files and folders
- **External Libraries**: Integration with OpenZeppelin and other Solidity libraries
- **Smart Compilation**: Compilation of multiple files with proper dependency resolution
- **Project Templates**: Pre-configured templates for common contract types

### 2. Contract Compilation and Analysis

#### Components:

- **Solidity Compiler Integration**: API routes that interface with solc-js
- **Multi-file Compilation**: Logic for compiling contracts with dependencies
- **Security Analysis**: Static analysis of contract code
- **Validation**: Syntax and semantic validation

### 3. Hedera Integration

#### Components:

- **Deployment Service**: Smart contract deployment to Hedera Testnet
- **Mirror Node Integration**: Interaction with deployed contracts
- **Transaction Handling**: Creation and submission of transactions

### 4. UI Framework

#### Components:

- **shadcn/ui**: Component library foundation
- **TailwindCSS**: Styling framework
- **Framer Motion**: Animation library
- **Context Providers**: State management

## Data Flow

1. **Contract Creation**:
   - User enters code in the Multi-File IDE
   - Code is validated and compiled
   - Compilation artifacts are generated (bytecode, ABI)

2. **Contract Deployment**:
   - Bytecode is deployed to Hedera Testnet
   - Transaction receipt is processed
   - Contract address is returned and stored

3. **Contract Interaction**:
   - User navigates to interaction page with contract address
   - Contract interface is discovered using bytecode analysis
   - User can call contract functions and view state

## Design Decisions

### 1. Virtual File System

The file system is implemented as a virtual tree structure in memory with persistence to localStorage, avoiding the need for a backend while providing a full IDE experience.

### 2. Multi-file Compilation

The compilation process first analyzes all imports and dependencies, then compiles each file in the correct order, finally linking everything together.

### 3. External Library Support

External libraries like OpenZeppelin are supported through:
- Automatic detection of imports
- Library version compatibility analysis
- Dependency resolution during compilation
- Documentation links for easy reference

### 4. Responsive UI

The IDE UI is designed to be responsive with:
- Collapsible sidebar for file explorer
- Adaptive layouts for different screen sizes
- Persistent tab state for session continuity
- Real-time feedback for compilation and deployment

## Performance Considerations

- **Memoization**: Extensive use of React.memo and useCallback to prevent unnecessary re-renders
- **Virtual Rendering**: Efficient rendering of large file structures
- **Async Operations**: Non-blocking compilation and deployment processes
- **Persistent State**: Browser storage for session persistence

## Future Architecture Enhancements

- **Collaborative Editing**: Real-time collaboration features
- **Version Control**: Integration with Git-like functionality
- **Custom Plugin System**: Extensibility through plugins
- **Advanced Testing Framework**: Integrated testing capabilities 