# SmartScope Architecture

This document provides an overview of SmartScope's architecture, helping developers understand how the different components work together.

## System Overview

SmartScope is a Next.js application that provides a complete platform for smart contract development on Hedera Testnet. The application follows a client-side architecture with specific server components for API integration.

```
┌─────────────────────────────────┐
│ Client (Next.js)                │
├─────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ │
│ │ UI          │ │ State Mgmt  │ │
│ │ Components  │ │ Context API │ │
│ └─────────────┘ └─────────────┘ │
├─────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ │
│ │ API Routes  │ │ Lib Utilities│ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
          │                 ▲
          ▼                 │
┌─────────────────────────────────┐
│ External Services               │
├─────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ │
│ │ Hedera      │ │ Hash.io API │ │
│ │ Testnet     │ │             │ │
│ └─────────────┘ └─────────────┘ │
├─────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ │
│ │ Mirror Node │ │ Gemini API  │ │
│ │ API         │ │ (AI)        │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
```

## Core Components

### Application Structure

- **app/**: Main application pages (Next.js app router)
  - **create/**: Smart contract creation interface
  - **interact/**: Contract interaction functionality
  - **learn/**: Educational resources
  - **roadmap/**: Project roadmap
  - **api/**: Backend API routes for Hedera integration

- **components/**: Reusable UI components
  - **ui/**: Generic UI components (buttons, forms, etc.)
  - **providers/**: Context providers for global state

- **lib/**: Utility functions and shared logic
  - Hedera SDK integration
  - Solidity compilation
  - Contract analysis

### Key Features Implementation

#### Smart Contract Analysis

We use a specialized parser to analyze Solidity code and provide security insights. The analysis happens in two phases:
1. Syntax and structure validation
2. Security pattern matching

#### Contract Deployment

The deployment process uses the Hedera SDK to:
1. Compile the Solidity code
2. Generate the bytecode and ABI
3. Create and sign the transaction
4. Submit to the Hedera Testnet

#### ABI Discovery

For contract interaction, we:
1. Query the contract bytecode from the blockchain
2. Use signature matching to identify function selectors
3. Generate a dynamic interface based on discovered functions

#### AI Assistant

The AI Assistant uses:
1. Gemini API integration for natural language processing
2. Context-aware prompting with blockchain knowledge
3. Real-time chat interface with streaming responses

## Data Flow

1. User creates or uploads a smart contract
2. Code is analyzed for security and optimizations
3. Contract is compiled and deployed to Hedera Testnet
4. Contract address is generated and stored in session
5. User can interact with contract functions through dynamic interface
6. Results of function calls are retrieved and displayed

## Security Model

- All interactions with Hedera are signed server-side
- No private keys are exposed to the client
- User sessions are ephemeral and not stored long-term

## Future Architecture Extensions

As outlined in our roadmap, future architecture will include:
- Multi-chain support with abstraction layers
- Enhanced analytics with specialized data processing
- Advanced AI integration directly into the workflow
- Community features with secure sharing mechanisms 