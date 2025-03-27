# SmartScope API Documentation

This document provides information about the SmartScope API endpoints and how to use them.

## Authentication

Currently, SmartScope APIs do not require authentication as they operate without wallet connection requirements. This is by design to provide a seamless developer experience.

## Base URL

All API endpoints are relative to the application base URL:

```
https://your-smartscope-deployment.vercel.app/api
```

## API Endpoints

### Smart Contract Compilation

#### `POST /api/compile`

Compiles Solidity code and returns bytecode and ABI.

**Request Body:**

```json
{
  "source": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Example {\n    string public message;\n\n    constructor(string memory _message) {\n        message = _message;\n    }\n\n    function updateMessage(string memory _newMessage) public {\n        message = _newMessage;\n    }\n}"
}
```

**Response:**

```json
{
  "success": true,
  "bytecode": "0x608060405234801561001057600080fd5b5060...",
  "abi": [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_message",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    ...
  ]
}
```

#### `POST /api/compile-multi`

Compiles a project with multiple Solidity files and their dependencies.

**Request Body:**

```json
{
  "files": {
    "Token.sol": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\nimport './IERC20.sol';\n\ncontract Token is IERC20 {\n    // contract implementation\n}",
    "IERC20.sol": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ninterface IERC20 {\n    // interface definition\n}"
  },
  "mainFile": "Token.sol",
  "externalLibraries": ["@openzeppelin/contracts/token/ERC20/ERC20.sol"]
}
```

**Response:**

```json
{
  "success": true,
  "bytecode": "0x608060405234801561001057600080fd5b5060...",
  "abi": [...],
  "dependencies": {
    "IERC20.sol": {
      "bytecode": "",
      "abi": [...]
    }
  },
  "warnings": [
    {
      "file": "Token.sol",
      "message": "Warning message",
      "severity": "low"
    }
  ]
}
```

### Contract Analysis

#### `POST /api/analyze`

Analyzes Solidity code for security issues and optimization opportunities.

**Request Body:**

```json
{
  "source": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Example {\n    string public message;\n\n    constructor(string memory _message) {\n        message = _message;\n    }\n\n    function updateMessage(string memory _newMessage) public {\n        message = _newMessage;\n    }\n}"
}
```

**Response:**

```json
{
  "success": true,
  "analysis": {
    "security": [
      {
        "type": "info",
        "message": "No access control on updateMessage function",
        "line": 8,
        "severity": "medium"
      }
    ],
    "optimization": [
      {
        "type": "info",
        "message": "Consider using bytes instead of string for better gas efficiency",
        "line": 4,
        "severity": "low"
      }
    ]
  }
}
```

### Contract Deployment

#### `POST /api/deploy`

Deploys a compiled smart contract to Hedera Testnet.

**Request Body:**

```json
{
  "bytecode": "0x608060405234801561001057600080fd5b5060...",
  "abi": [...],
  "constructorArgs": ["Hello, Hedera!"]
}
```

**Response:**

```json
{
  "success": true,
  "contractId": "0.0.1234567",
  "evmAddress": "0x742f4f7549B39666d7A55b3d5316e7e5dcC86944",
  "transactionId": "0.0.8765432@1234567890.000000000",
  "transactionLink": "https://hashscan.io/testnet/transaction/0.0.8765432@1234567890.000000000"
}
```

### Contract Interaction

#### `POST /api/contract/call`

Calls a read function on a deployed contract.

**Request Body:**

```json
{
  "contractAddress": "0x742f4f7549B39666d7A55b3d5316e7e5dcC86944",
  "functionName": "message",
  "functionArgs": []
}
```

**Response:**

```json
{
  "success": true,
  "result": "Hello, Hedera!"
}
```

#### `POST /api/contract/execute`

Executes a write function on a deployed contract.

**Request Body:**

```json
{
  "contractAddress": "0x742f4f7549B39666d7A55b3d5316e7e5dcC86944",
  "functionName": "updateMessage",
  "functionArgs": ["Updated message!"]
}
```

**Response:**

```json
{
  "success": true,
  "transactionId": "0.0.8765432@1234567890.000000000",
  "transactionLink": "https://hashscan.io/testnet/transaction/0.0.8765432@1234567890.000000000"
}
```

### Contract Information

#### `GET /api/contract/info?address={evmAddress}`

Retrieves information about a deployed contract.

**Response:**

```json
{
  "success": true,
  "contractId": "0.0.1234567",
  "evmAddress": "0x742f4f7549B39666d7A55b3d5316e7e5dcC86944",
  "bytecode": "0x608060405234801561001057600080fd5b5060...",
  "discoveredFunctions": [
    {
      "name": "message",
      "selector": "0xe21f37ce",
      "inputs": [],
      "outputs": [{"type": "string"}],
      "stateMutability": "view"
    },
    {
      "name": "updateMessage",
      "selector": "0x368b8772",
      "inputs": [{"name": "_newMessage", "type": "string"}],
      "outputs": [],
      "stateMutability": "nonpayable"
    }
  ]
}
```

## Error Handling

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:

- `COMPILATION_ERROR`: Error during Solidity compilation
- `DEPLOYMENT_ERROR`: Error during contract deployment
- `EXECUTION_ERROR`: Error during contract function execution
- `CONTRACT_NOT_FOUND`: Contract address not found
- `INVALID_ARGS`: Invalid function arguments
- `NETWORK_ERROR`: Error connecting to Hedera network

## Rate Limiting

The API currently has the following rate limits:

- 10 requests per minute for compilation and analysis endpoints
- 5 requests per minute for deployment endpoints
- 20 requests per minute for contract interaction endpoints

## Browser Usage Example

```javascript
// Example: Compiling a contract
async function compileContract(sourceCode) {
  const response = await fetch('/api/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: sourceCode }),
  });
  
  return await response.json();
}
``` 