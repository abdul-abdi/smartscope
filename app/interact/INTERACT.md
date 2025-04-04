# Karibu Interact: Complete Guide to Smart Contract Interaction

## Overview

The Karibu Interact feature provides a comprehensive interface for connecting with and testing deployed smart contracts on the Hedera Testnet. This guide explains how to effectively use all interaction capabilities to explore, analyze, and interact with any smart contract deployed on Hedera.

## 🚀 Quick Start

1. Navigate to the Interact page in Karibu
2. Enter your contract address (supports multiple formats):
   - Hedera format: `0.0.1234567`
   - EVM format: `0x742f4f7549B39666d7A55b3d5316e7e5dcC86944`
   - Numeric format: `1234567`
3. The system will automatically:
   - Verify the contract's existence on Hedera Testnet
   - Analyze the contract's bytecode to identify functions
   - Generate an interactive interface for all contract functions
   - Display contract metadata and state information

## 📋 Key Features

### Smart Contract Discovery
- **Multi-format Address Support**: Enter contract addresses in any format (Hedera, EVM, or numeric)
- **Automatic Verification**: Instant validation of contract existence on the network
- **Bytecode Analysis**: Intelligent function detection even without ABI
- **Source Code Integration**: Automatic fetching of verified source code when available
- **ABI Detection**: Multiple sources (bytecode analysis, explorer, manual input)

### Intuitive Function Interface
- **Categorized Functions**: 
  - 📘 Read Functions (view/pure) - Query contract state without gas fees
  - 📝 Write Functions (state-changing) - Execute transactions that modify contract state
- **Parameter Validation**: Real-time validation of input parameters with type checking
- **Gas Estimation**: Automatic calculation for write functions to prevent transaction failures
- **Function Signatures**: Human-readable format display with parameter types
- **Documentation**: Automatic display of NatSpec comments when available

### Comprehensive Contract Analysis
- **Security Insights**: Automated vulnerability scanning for common issues
- **Optimization Suggestions**: Gas usage recommendations to reduce costs
- **Code Quality Assessment**: Best practices analysis for contract code
- **Risk Evaluation**: Identification of potential security concerns

### Real-time State Visualization
- **Live Storage Inspection**: Real-time contract state display with formatted values
- **State Change Tracking**: Before/after transaction comparisons to visualize changes
- **Event Monitoring**: Real-time event logging with parameter decoding
- **Transaction History**: Chronological record of all interactions with replay capability

## 🔧 Detailed Usage Guide

### 1. Connecting to a Contract

```
// Example contract address formats - all supported
0x742f4f7549B39666d7A55b3d5316e7e5dcC86944  // EVM format
0.0.1234567                                  // Hedera format
1234567                                      // Numeric format
```

- Enter your contract address in the search bar at the top of the Interact page
- The system automatically validates the address and loads contract data
- View comprehensive contract details in the header section:
  - Contract address (in both EVM and Hedera formats)
  - Creation date and transaction hash
  - Contract balance
  - Creator address
  - ABI source (detected or manually provided)

### 2. Exploring Contract Functions

The interface automatically categorizes and displays all contract functions:

- **Read Functions Tab**: 
  - View-only functions that don't modify state
  - No gas required, instant results
  - Useful for querying contract state, balances, and configuration

- **Write Functions Tab**:
  - State-changing functions that require transactions
  - Gas estimation provided before execution
  - Transaction confirmation and receipt tracking

- **Events Tab**:
  - Automatic event listening and logging
  - Historical event data with parameter decoding
  - Filtering options by event type and block range

### 3. Interacting with Contract Functions

#### Using Read Functions
1. Navigate to the Read Functions tab
2. Select the function you want to query
3. Fill in any required parameters with appropriate types
4. Click "Query" to execute the call
5. View formatted results immediately below the function
6. Results are cached for quick reference

#### Executing Write Functions
1. Navigate to the Write Functions tab
2. Select the function you want to execute
3. Enter all required parameters with proper types
4. Review the automatically calculated gas estimation
5. Click "Execute" to initiate the transaction
6. Confirm the transaction in your connected wallet (MetaMask)
7. Monitor transaction status in real-time
8. View transaction receipt and state changes after confirmation
9. Check emitted events in the Events tab

#### Working with Contract Events
1. Navigate to the Events tab
2. View all historical events emitted by the contract
3. Filter events by type, block range, or timestamp
4. Examine decoded event parameters with proper formatting
5. Set up real-time event monitoring for specific event types

### 4. Advanced Features

#### Contract Security Analysis
- Click "Analyze Contract" for comprehensive security insights
- Review detailed vulnerability scan results with severity levels
- Check optimization recommendations for gas efficiency
- View dependency analysis and potential risks
- Export analysis report for documentation

#### State Inspection and Monitoring
- Use the Storage tab to view the contract's current state
- Explore storage slots with decoded values
- Monitor state changes in real-time after transactions
- Track historical state values with timestamps
- Export state data for offline analysis

#### Transaction History and Replay
- Access chronological history of all your interactions
- Filter transactions by function type or status
- View detailed transaction information including gas used
- Replay previous calls with the same parameters
- Export transaction logs for record-keeping

#### Custom ABI Management
- Upload custom ABI for contracts without verified source code
- Edit and validate ABI JSON directly in the interface
- Save ABIs for future use with the same contract
- Share ABIs with team members via export/import

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

1. **Contract Address Not Found**
   - Verify the address format is correct (EVM or Hedera format)
   - Confirm you're connected to Hedera Testnet in your wallet
   - Check if the contract is actually deployed using HashScan
   - Try alternative address formats (convert between EVM and Hedera format)

2. **Function Execution Failures**
   - Review parameter types and ensure they match the function signature
   - Check if you have sufficient HBAR for gas fees
   - Verify contract state prerequisites for the function
   - Look for revert reasons in the transaction receipt
   - Check function access controls (onlyOwner, etc.)

3. **ABI Loading Issues**
   - Try uploading a custom ABI if automatic detection fails
   - Use verified source code from HashScan if available
   - Check if the contract was deployed with a flattened source
   - Verify the contract has been verified on the network
   - Use bytecode analysis as a fallback for basic functions

4. **Wallet Connection Problems**
   - Ensure MetaMask is installed and unlocked
   - Verify you're connected to Hedera Testnet in MetaMask
   - Try refreshing the page and reconnecting
   - Check for browser console errors
   - Clear browser cache if persistent issues occur

## 📚 Best Practices for Contract Testing

1. **Systematic Testing Approach**
   - Start with read functions to understand current contract state
   - Test write functions with minimal values first
   - Monitor state changes after each transaction
   - Document unexpected behaviors or errors
   - Create a testing checklist for comprehensive coverage

2. **Security Considerations**
   - Always verify the contract source code before interaction
   - Review function permissions and access controls
   - Check state requirements and invariants
   - Monitor gas usage for potential DoS vectors
   - Be cautious with functions that transfer assets

3. **Optimization Strategies**
   - Batch similar read calls to reduce network overhead
   - Use event listeners efficiently for state updates
   - Cache frequent queries to minimize redundant calls
   - Monitor gas patterns to identify optimization opportunities
   - Use multicall patterns when available

## 🔮 Advanced Usage Techniques

### Contract Verification and Analysis
```javascript
// Verify contract source code
await verifyContract(address);

// Analyze bytecode for security issues
await analyzeBytecode(address);

// Check for known vulnerabilities
await scanVulnerabilities(address);
```

### Custom ABI Integration
```javascript
// Upload and validate custom ABI
await loadCustomABI(address, abiJSON);

// Verify function signatures match bytecode
await validateFunctions(abi);

// Save ABI for future sessions
await saveABI(address, abi);
```

### State Monitoring and Comparison
```javascript
// Monitor specific storage slots
await watchStorage(contractAddress, slot);

// Track state changes between transactions
const stateBefore = await getContractState(address);
await executeTransaction(address, functionName, params);
const stateAfter = await getContractState(address);
await compareState(stateBefore, stateAfter);
```

## 🎯 Real-world Examples

### Basic Token Interaction
```javascript
// Query token balance
const balance = await tokenContract.balanceOf(accountAddress);

// Transfer tokens
await tokenContract.transfer(recipientAddress, amount);

// Check allowance
const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
```

### NFT Contract Interaction
```javascript
// Mint new NFT
await nftContract.mint(recipientAddress, tokenURI);

// Query token owner
const owner = await nftContract.ownerOf(tokenId);

// Get token metadata
const uri = await nftContract.tokenURI(tokenId);
```

### DeFi Protocol Interaction
```javascript
// Provide liquidity
await liquidityPool.addLiquidity(tokenA, tokenB, amountA, amountB, minA, minB);

// Swap tokens
await router.swapExactTokensForTokens(amountIn, minAmountOut, path, recipient, deadline);

// Check reserves
const [reserve0, reserve1] = await pair.getReserves();
```

## 📈 Performance Optimization Tips

1. **Batch Multiple Read Operations**
   - Use multicall patterns to combine multiple read operations into a single request
   - Reduces network overhead and improves response times

2. **Implement Efficient Gas Management**
   - Monitor gas usage patterns across different functions
   - Adjust gas limits based on historical transaction data
   - Use gas price oracles for optimal pricing

3. **Robust Error Handling**
   - Implement comprehensive try/catch blocks
   - Decode error messages from reverted transactions
   - Provide clear user feedback for failed operations

4. **Strategic Data Caching**
   - Cache frequent queries with appropriate invalidation strategies
   - Store historical data locally to reduce redundant network calls
   - Implement time-based cache expiration for dynamic data

5. **Optimize Event Listening**
   - Use specific event filters instead of broad listeners
   - Implement pagination for historical event queries
   - Process events in batches for better performance

## 🔗 Related Resources

- [Hedera Smart Contract Documentation](https://docs.hedera.com/hedera/tutorials/smart-contracts)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [HashScan Explorer](https://hashscan.io/testnet)
- [Hedera JSON-RPC Relay](https://github.com/hashgraph/hedera-json-rpc-relay)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [MetaMask Documentation](https://docs.metamask.io/)
