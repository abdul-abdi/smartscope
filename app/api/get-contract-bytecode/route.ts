import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

// HashIO JSON-RPC endpoint for Hedera testnet
const HASHIO_API_ENDPOINT = 'https://testnet.hashio.io/api';

// 4byte.directory API endpoint for function signature lookup
const FOURBYTE_API_URL = 'https://www.4byte.directory/api/v1/signatures/';
// Alternative API endpoints for function signature lookup
const FUNCTION_SIGNATURE_ENDPOINTS = [
  'https://www.4byte.directory/api/v1/signatures/',
  'https://raw.githubusercontent.com/ethereum-lists/4bytes/master/signatures/'
];

// Cache for 4byte lookup results to minimize API calls
const signatureCache = new Map<string, string | {
  signature?: string;
  name?: string;
  inputTypes?: string[];
  outputTypes?: string[];
  stateMutability?: string;
}>();

// Rate limiting: Track API calls to avoid hitting rate limits
const apiCallTracker = {
  lastCallTime: 0,
  callsInWindow: 0,
  resetWindow: 60000, // 1 minute
  maxCallsPerWindow: 10 // Limit to 10 calls per minute
};

// Common function signatures for standard contracts
const FUNCTION_SIGNATURES: Record<string, string> = {
  // ERC20
  '0x06fdde03': 'name',
  '0x95d89b41': 'symbol',
  '0x313ce567': 'decimals',
  '0x18160ddd': 'totalSupply',
  '0x70a08231': 'balanceOf',
  '0xa9059cbb': 'transfer',
  '0xdd62ed3e': 'allowance',
  '0x095ea7b3': 'approve',
  '0x23b872dd': 'transferFrom',
  
  // ERC721
  '0x6352211e': 'ownerOf',
  '0xc87b56dd': 'tokenURI',
  '0x42842e0e': 'safeTransferFrom',
  '0xb88d4fde': 'safeTransferFrom',
  
  // Common functions
  '0x893d20e8': 'getOwner',
  '0x8da5cb5b': 'owner',
  '0xd0e30db0': 'deposit',
  '0x3ccfd60b': 'withdraw',
  '0x12065fe0': 'getBalance',
  '0x6d4ce63c': 'get',
  '0x371303c0': 'set',
  '0x60fe47b1': 'set',
  
  // Counter contract functions
  '0x06661abd': 'count',
  '0xd09de08a': 'increment',
  '0x2baeceb7': 'decrement',
  
  // SimpleStorage contract functions
  '0x2e64cec1': 'retrieve',
  '0x6057361d': 'store',
  
  // Additional SimpleStorage variations
  '0x9507d39a': 'get_value',
  '0xc2bc2efc': 'set_value',
  '0x20965255': 'getValue',
  '0x55241077': 'setValue',
  
  // Token standard additional methods
  '0x3644e515': 'DOMAIN_SEPARATOR',
  '0x30adf81f': 'PERMIT_TYPEHASH',
  '0xf0dda65c': 'burnFrom',
  '0x79cc6790': 'burnFrom',
  '0x42966c68': 'burn',
  '0x983b2d56': 'addMinter',
  '0xaa271e1a': 'isMinter',
  '0x40c10f19': 'mint',
  '0x4e6ec247': 'controlling',
  '0x9dc29fac': 'burn',
  
  // Pausable contract
  '0x8456cb59': 'pause',
  '0x3f4ba83a': 'unpause',
  '0x5c975abb': 'paused',
  
  // Ownable contract
  '0xf2fde38b': 'transferOwnership',
  '0x715018a6': 'renounceOwnership',

  // ERC1155 functions
  '0x00fdd58e': 'balanceOf',
  '0x4e1273f4': 'balanceOfBatch',
  '0xe985e9c5': 'isApprovedForAll',
  '0xa22cb465': 'setApprovalForAll',
  '0xf242432a': 'safeTransferFrom',
  '0x2eb2c2d6': 'safeBatchTransferFrom',
  '0x731133e9': 'uri',
  
  // ReentrancyGuard
  '0x59f4ac82': 'nonReentrant',
  
  // Administrative functions
  '0x24d7806c': 'setAdmin',
  '0x7065cb48': 'addAdmin',
  '0x13af4035': 'setOwner',
  
  // Staking functions
  '0xa694fc3a': 'stake',
  '0x2e1a7d4d': 'withdraw',
  '0xc7b9d530': 'claim',
  '0x8f32d59b': 'isOwner',
  
  // Proxy functions
  '0x3659cfe6': 'upgradeTo',
  '0x4f1ef286': 'upgradeToAndCall',
  '0x52d1902d': 'implementation',
  '0xc1f62946': 'devDelegate',
  '0x5c60da1b': 'implementation'
};

/**
 * Extracts function selectors from bytecode and enhances them with metadata
 * @param bytecode The contract bytecode to analyze
 * @returns Object mapping function selectors to metadata
 */
function extractFunctionSelectorsFromBytecode(bytecode: string) {
  // Remove 0x prefix if present
  bytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
  
  // More flexible regex patterns to detect function selectors in various bytecode patterns
  // Different Solidity compiler versions and optimization settings can produce different patterns
  
  // Common patterns for function selectors in bytecode:
  // 1. PUSH4 selector followed by DUP2, EQ (most common)
  // 2. PUSH4 selector followed by other operations
  // 3. PUSH4 selector in any context
  
  const patterns = [
    /63([0-9a-fA-F]{8})8114/g,         // Standard: PUSH4 selector, DUP2, EQ
    /63([0-9a-fA-F]{8})80(14|35)/g,    // PUSH4 selector, DUP1, EQ/CALLDATALOAD
    /63([0-9a-fA-F]{8})(81|90)14/g,    // PUSH4 selector, DUP2/SWAP1, EQ
    /63([0-9a-fA-F]{8})57/g,           // PUSH4 selector, JUMPI (for very simple contracts)
    /63([0-9a-fA-F]{8})/g              // Any PUSH4 operation (fallback, may cause false positives)
  ];
  
  // Keep track of detected selectors
  const functions: Record<string, { 
    selector: string,
    signature?: string,
    name?: string,
    inputTypes?: string[],
    outputTypes?: string[],
    stateMutability?: string 
  }> = {};
  
  // Try each pattern in order (from most specific to most general)
  let selectorCount = 0;
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(bytecode)) !== null) {
      const selector = `0x${match[1].toLowerCase()}`;
      
      // Skip if we already found this selector with a more specific pattern
      if (functions[selector]) continue;
      
      console.log(`Found selector in bytecode with pattern ${pattern}: ${selector}`);
      selectorCount++;
      
      functions[selector] = { 
        selector,
        // These will be filled in via API lookups or local database
        signature: undefined,
        name: undefined,
        inputTypes: undefined,
        outputTypes: undefined,
        stateMutability: undefined
      };
    }
    
    // If we found selectors with this pattern, stop trying more general patterns
    // This prevents false positives from the most general pattern
    if (selectorCount > 0 && pattern !== patterns[patterns.length - 1]) {
      break;
    }
  }
  
  // Special case: If we didn't find any selectors but the bytecode contains function signatures
  // This is common in proxy contracts or contracts created with older versions of Solidity
  if (selectorCount === 0) {
    // Try to find common function signatures in the bytecode as strings
    // This won't work for all contracts but can help with some
    const hexStrings = bytecode.match(/([0-9a-fA-F]{8})/g) || [];
    for (const hexString of hexStrings) {
      const potentialSelector = `0x${hexString.toLowerCase()}`;
      // Check if this looks like a known function selector
      if (commonFunctionSelectors[potentialSelector]) {
        console.log(`Found potential selector in bytecode: ${potentialSelector}`);
        functions[potentialSelector] = {
          selector: potentialSelector,
          ...commonFunctionSelectors[potentialSelector]
        };
        selectorCount++;
      }
    }
  }
  
  console.log(`Total selectors found in bytecode by pattern matching: ${selectorCount}`);
  return functions;
}

// Common function selectors to help with the case where bytecode doesn't follow standard patterns
const commonFunctionSelectors: Record<string, any> = {
  // ERC20 functions
  '0x06fdde03': { name: 'name', signature: 'name()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
  '0x95d89b41': { name: 'symbol', signature: 'symbol()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
  '0x313ce567': { name: 'decimals', signature: 'decimals()', inputTypes: [], outputTypes: ['uint8'], stateMutability: 'view' },
  '0x18160ddd': { name: 'totalSupply', signature: 'totalSupply()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
  '0x70a08231': { name: 'balanceOf', signature: 'balanceOf(address)', inputTypes: ['address'], outputTypes: ['uint256'], stateMutability: 'view' },
  '0xa9059cbb': { name: 'transfer', signature: 'transfer(address,uint256)', inputTypes: ['address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
  '0xdd62ed3e': { name: 'allowance', signature: 'allowance(address,address)', inputTypes: ['address', 'address'], outputTypes: ['uint256'], stateMutability: 'view' },
  '0x095ea7b3': { name: 'approve', signature: 'approve(address,uint256)', inputTypes: ['address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
  '0x23b872dd': { name: 'transferFrom', signature: 'transferFrom(address,address,uint256)', inputTypes: ['address', 'address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
  
  // Storage functions
  '0x6d4ce63c': { name: 'get', signature: 'get()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
  '0x60fe47b1': { name: 'set', signature: 'set(uint256)', inputTypes: ['uint256'], outputTypes: [], stateMutability: 'nonpayable' },
  
  // Admin functions
  '0x8da5cb5b': { name: 'owner', signature: 'owner()', inputTypes: [], outputTypes: ['address'], stateMutability: 'view' },
  '0xf2fde38b': { name: 'transferOwnership', signature: 'transferOwnership(address)', inputTypes: ['address'], outputTypes: [], stateMutability: 'nonpayable' }
};

/**
 * Looks up function signature from a selector using various sources
 * @param selector The function selector (first 4 bytes of keccak hash)
 * @returns Full function signature if found
 */
async function lookupFunctionSignature(selector: string): Promise<{
  signature?: string;
  name?: string;
  inputTypes?: string[];
  outputTypes?: string[];
  stateMutability?: string;
}> {
  console.log(`Looking up signature for selector: ${selector}`);
  
  // Check the cache first
  if (signatureCache.has(selector)) {
    const cachedData = signatureCache.get(selector);
    console.log(`Using cached signature: ${cachedData}`);
    // If it's just a string, convert to expected return format
    if (typeof cachedData === 'string') {
      return { signature: cachedData };
    }
    return cachedData as any;
  }
  
  // First check our local database for common signatures
  if (FUNCTION_SIGNATURES[selector]) {
    const signature = FUNCTION_SIGNATURES[selector];
    console.log(`Found signature in local DB: ${signature}`);
    
    // Parse the signature to extract name and parameter types
    const match = signature.match(/^([^(]+)\(([^)]*)\)/);
    if (match) {
      const name = match[1];
      const inputTypesStr = match[2];
      const inputTypes = inputTypesStr ? inputTypesStr.split(',').map(t => t.trim()) : [];
      
      // Infer state mutability and return types based on common patterns
      let stateMutability = 'nonpayable';
      let outputTypes: string[] = [];
      
      if (['view', 'pure', 'balanceOf', 'allowance', 'totalSupply', 'decimals', 'symbol', 'name', 'get', 'getBalance'].some(
        keyword => name.includes(keyword) || name === keyword
      )) {
        stateMutability = 'view';
        
        // Infer common return types based on function name
        if (name === 'balanceOf' || name === 'totalSupply' || name === 'get' || name === 'getBalance') {
          outputTypes = ['uint256'];
        } else if (name === 'allowance') {
          outputTypes = ['uint256'];
        } else if (name === 'decimals') {
          outputTypes = ['uint8'];
        } else if (name === 'symbol' || name === 'name') {
          outputTypes = ['string'];
        } else if (name === 'owner') {
          outputTypes = ['address'];
        } else if (name.startsWith('is') || name.endsWith('ed')) {
          outputTypes = ['bool'];
        }
      } else if (name === 'deposit' || name === 'receive' || name === 'fallback') {
        stateMutability = 'payable';
      }
      
      const result = {
        signature,
        name,
        inputTypes,
        outputTypes,
        stateMutability
      };
      signatureCache.set(selector, result);
      return result;
    }
    
    signatureCache.set(selector, { signature });
    return { signature };
  }

  // Rate limiting check
  const now = Date.now();
  if (now - apiCallTracker.lastCallTime > apiCallTracker.resetWindow) {
    // If more than the reset window has passed, reset the counter
    apiCallTracker.callsInWindow = 0;
    apiCallTracker.lastCallTime = now;
  }
  
  if (apiCallTracker.callsInWindow >= apiCallTracker.maxCallsPerWindow) {
    console.log(`Rate limit reached for 4byte.directory API. Skipping lookup for ${selector}`);
    const placeholderName = `function_${selector.slice(2)}`;
    return {
      signature: `${placeholderName}()`,
      name: placeholderName,
      inputTypes: [],
      outputTypes: [],
      stateMutability: 'nonpayable'
    };
  }

  try {
    // Try 4byte.directory API
    const apiUrl = `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`;
    
    apiCallTracker.callsInWindow++;
    apiCallTracker.lastCallTime = now;
    
    console.log(`Calling 4byte.directory API for ${selector}, call count: ${apiCallTracker.callsInWindow}/${apiCallTracker.maxCallsPerWindow}`);
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'SmartScope-ContractAnalyzer'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Get first signature (most popular)
        const signature = data.results[0].text_signature;
        console.log(`Found signature from 4byte.directory: ${signature}`);
        
        // Parse the signature to extract name and parameter types
        const match = signature.match(/^([^(]+)\(([^)]*)\)/);
        if (match) {
          const name = match[1];
          const inputTypesStr = match[2];
          const inputTypes = inputTypesStr ? inputTypesStr.split(',').map(t => t.trim()) : [];
          
          // Infer state mutability and return types based on common patterns
          let stateMutability = 'nonpayable';
          let outputTypes: string[] = [];
          
          if (['view', 'pure', 'balanceOf', 'allowance', 'totalSupply', 'decimals', 'symbol', 'name', 'get', 'getBalance'].some(
            keyword => name.includes(keyword) || name === keyword
          )) {
            stateMutability = 'view';
            
            // Infer common return types based on function name
            if (name === 'balanceOf' || name === 'totalSupply' || name === 'get' || name === 'getBalance') {
              outputTypes = ['uint256'];
            } else if (name === 'allowance') {
              outputTypes = ['uint256'];
            } else if (name === 'decimals') {
              outputTypes = ['uint8'];
            } else if (name === 'symbol' || name === 'name') {
              outputTypes = ['string'];
            } else if (name === 'owner') {
              outputTypes = ['address'];
            } else if (name.startsWith('is') || name.endsWith('ed')) {
              outputTypes = ['bool'];
            }
          } else if (name === 'deposit' || name === 'receive' || name === 'fallback') {
            stateMutability = 'payable';
          }
          
          const result = {
            signature,
            name,
            inputTypes,
            outputTypes,
            stateMutability
          };
          signatureCache.set(selector, result);
          return result;
        }
        
        signatureCache.set(selector, { signature });
        return { signature };
      }
    }
    
    // Try fallback sources if 4byte fails
    // Try raw GitHub repository of 4bytes as a fallback
    console.log('Trying GitHub fallback for', selector);
    const githubUrl = `https://raw.githubusercontent.com/ethereum-lists/4bytes/master/signatures/${selector}`;
    const githubResponse = await fetch(githubUrl);
    
    if (githubResponse.ok) {
      const signature = await githubResponse.text();
      if (signature && signature.trim()) {
        console.log(`Found signature from GitHub: ${signature}`);
        signatureCache.set(selector, { signature: signature.trim() });
        return { signature: signature.trim() };
      }
    }
  } catch (error) {
    console.error(`Error looking up signature for ${selector}:`, error);
  }
  
  // If nothing found, return a placeholder signature
  const placeholderName = `function_${selector.slice(2)}`;
  const result = {
    signature: `${placeholderName}()`,
    name: placeholderName,
    inputTypes: [],
    outputTypes: [],
    stateMutability: 'nonpayable'
  };
  signatureCache.set(selector, result);
  return result;
}

/**
 * Look up function signatures for selectors
 * Uses a local database first, then queries external API if needed
 * @param selectors Object of selectors to look up
 * @returns Enhanced selectors with signatures where found
 */
async function lookupFunctionSignatures(selectors: Record<string, any>) {
  // Common function selectors database - we'll check here first
  // This helps avoid unnecessary API calls
  const commonSelectors: Record<string, any> = {
    // ERC20 functions
    '0x06fdde03': { name: 'name', signature: 'name()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
    '0x95d89b41': { name: 'symbol', signature: 'symbol()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
    '0x313ce567': { name: 'decimals', signature: 'decimals()', inputTypes: [], outputTypes: ['uint8'], stateMutability: 'view' },
    '0x18160ddd': { name: 'totalSupply', signature: 'totalSupply()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
    '0x70a08231': { name: 'balanceOf', signature: 'balanceOf(address)', inputTypes: ['address'], outputTypes: ['uint256'], stateMutability: 'view' },
    '0xa9059cbb': { name: 'transfer', signature: 'transfer(address,uint256)', inputTypes: ['address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
    '0xdd62ed3e': { name: 'allowance', signature: 'allowance(address,address)', inputTypes: ['address', 'address'], outputTypes: ['uint256'], stateMutability: 'view' },
    '0x095ea7b3': { name: 'approve', signature: 'approve(address,uint256)', inputTypes: ['address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
    '0x23b872dd': { name: 'transferFrom', signature: 'transferFrom(address,address,uint256)', inputTypes: ['address', 'address', 'uint256'], outputTypes: ['bool'], stateMutability: 'nonpayable' },
    
    // ERC721 functions
    '0x6352211e': { name: 'ownerOf', signature: 'ownerOf(uint256)', inputTypes: ['uint256'], outputTypes: ['address'], stateMutability: 'view' },
    '0xc87b56dd': { name: 'tokenURI', signature: 'tokenURI(uint256)', inputTypes: ['uint256'], outputTypes: ['string'], stateMutability: 'view' },
    '0x42842e0e': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256)', inputTypes: ['address', 'address', 'uint256'], outputTypes: [], stateMutability: 'nonpayable' },
    '0xb88d4fde': { name: 'safeTransferFrom', signature: 'safeTransferFrom(address,address,uint256,bytes)', inputTypes: ['address', 'address', 'uint256', 'bytes'], outputTypes: [], stateMutability: 'nonpayable' },
    
    // Admin/ownership functions
    '0x8da5cb5b': { name: 'owner', signature: 'owner()', inputTypes: [], outputTypes: ['address'], stateMutability: 'view' },
    '0x893d20e8': { name: 'getOwner', signature: 'getOwner()', inputTypes: [], outputTypes: ['address'], stateMutability: 'view' },
    
    // Simple storage and utility functions
    '0x6d4ce63c': { name: 'get', signature: 'get()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
    '0x60fe47b1': { name: 'set', signature: 'set(uint256)', inputTypes: ['uint256'], outputTypes: [], stateMutability: 'nonpayable' },
    '0x371303c0': { name: 'set', signature: 'set(uint256,uint256)', inputTypes: ['uint256', 'uint256'], outputTypes: [], stateMutability: 'nonpayable' },
    '0xd0e30db0': { name: 'deposit', signature: 'deposit()', inputTypes: [], outputTypes: [], stateMutability: 'payable' },
    '0x3ccfd60b': { name: 'withdraw', signature: 'withdraw()', inputTypes: [], outputTypes: [], stateMutability: 'nonpayable' },
    '0x12065fe0': { name: 'getBalance', signature: 'getBalance()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
  };

  // Cache to avoid redundant API calls
  const signatureCache: Record<string, any> = {};
  
  // For each selector, try to look up its signature
  const enhancedSelectors = { ...selectors };
  const unknownSelectors: string[] = [];
  
  // First pass: Use our local database
  for (const selector of Object.keys(selectors)) {
    if (commonSelectors[selector]) {
      console.log(`Found local signature for ${selector}: ${commonSelectors[selector].signature}`);
      enhancedSelectors[selector] = {
        ...enhancedSelectors[selector],
        ...commonSelectors[selector]
      };
    } else {
      unknownSelectors.push(selector);
    }
  }
  
  // Only query the API for selectors we don't know
  if (unknownSelectors.length > 0) {
    console.log(`Looking up ${unknownSelectors.length} unknown selectors via API`);
    
    // Query in batches to avoid overloading the API
    const batchSize = 5;
    for (let i = 0; i < unknownSelectors.length; i += batchSize) {
      const batch = unknownSelectors.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (selector) => {
        try {
          // Check if we already have it in cache
          if (signatureCache[selector]) {
            enhancedSelectors[selector] = {
              ...enhancedSelectors[selector],
              ...signatureCache[selector]
            };
            return;
          }
          
          // Query 4byte.directory for the signature
          const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              // Use the most recent/popular signature
              const signature = data.results[0].text_signature;
              
              // Parse the signature
              const match = signature.match(/(\w+)\((.*)\)/);
              if (match) {
                const name = match[1];
                const inputTypesStr = match[2];
                const inputTypes = inputTypesStr ? inputTypesStr.split(',') : [];
                
                const result = {
                  name,
                  signature,
                  inputTypes,
                  // We can't know these from 4byte.directory
                  outputTypes: ['unknown'],
                  stateMutability: 'unknown'
                };
                
                console.log(`Found API signature for ${selector}: ${signature}`);
                
                // Update selectors and cache
                enhancedSelectors[selector] = {
                  ...enhancedSelectors[selector],
                  ...result
                };
                signatureCache[selector] = result;
              }
            } else {
              console.log(`No signature found for selector ${selector}`);
              
              // For unknown selectors, use a placeholder
              enhancedSelectors[selector] = {
                ...enhancedSelectors[selector],
                name: `function_${selector.substring(2, 6)}`,
                signature: `function_${selector.substring(2, 6)}()`,
                inputTypes: [],
                outputTypes: ['unknown'],
                stateMutability: 'unknown'
              };
            }
          }
        } catch (error) {
          console.error(`Error looking up signature for ${selector}:`, error);
        }
      }));
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < unknownSelectors.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  return enhancedSelectors;
}

/**
 * Convert a Hedera contract ID to an EVM address
 * @param contractId Contract ID in any format (0x, Hedera ID, or raw hex)
 * @returns Normalized EVM address with 0x prefix
 */
function convertToEvmAddress(contractId: string): string {
  // If it's already a 0x-prefixed address, return it
  if (contractId.startsWith('0x')) {
    return contractId;
  }
  
  // If it's a Hedera ID (e.g., 0.0.12345)
  if (contractId.match(/^\d+\.\d+\.\d+$/)) {
    try {
      // Parse the Hedera ID
      const parts = contractId.split('.');
      const contractNum = parts[2];
      
      // Convert to hex with padding
      const hexValue = parseInt(contractNum).toString(16).padStart(40, '0');
      return `0x${hexValue}`;
    } catch (conversionError) {
      console.warn('Could not convert Hedera format to EVM address:', conversionError);
      // Fall through to default case
    }
  }
  
  // If it's a raw hex address without 0x prefix
  if (!contractId.startsWith('0x')) {
    return `0x${contractId}`;
  }
  
  return contractId;
}

/**
 * Test common functions against the contract directly
 * For cases where bytecode analysis doesn't work
 */
async function testCommonFunctions(contractAddress: string): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // First we try the functions that are common in most simple contracts
  const functionsToTest = [
    // Simple storage
    { selector: '0x6d4ce63c', name: 'get', signature: 'get()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
    { selector: '0x60fe47b1', name: 'set', signature: 'set(uint256)', inputTypes: ['uint256'], outputTypes: [], stateMutability: 'nonpayable' },
    
    // Basic ERC20
    { selector: '0x06fdde03', name: 'name', signature: 'name()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
    { selector: '0x95d89b41', name: 'symbol', signature: 'symbol()', inputTypes: [], outputTypes: ['string'], stateMutability: 'view' },
    { selector: '0x18160ddd', name: 'totalSupply', signature: 'totalSupply()', inputTypes: [], outputTypes: ['uint256'], stateMutability: 'view' },
    
    // Basic admin
    { selector: '0x8da5cb5b', name: 'owner', signature: 'owner()', inputTypes: [], outputTypes: ['address'], stateMutability: 'view' },
  ];
  
  console.log(`Testing ${functionsToTest.length} common functions against contract ${contractAddress}`);
  
  // Test each function to see if the contract responds to it
  for (const func of functionsToTest) {
    try {
      // Only test view functions to avoid state changes
      if (func.stateMutability !== 'view') {
        continue;
      }
      
      const response = await fetch('https://testnet.hashio.io/api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'https://smartscope.app'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            { to: contractAddress, data: func.selector },
            'latest'
          ]
        }),
      });
      
      const data = await response.json();
      
      // If we got a successful response, the function likely exists
      if (data.result && !data.error && data.result !== '0x') {
        console.log(`Function ${func.name} exists on contract, got response: ${data.result.substring(0, 50)}...`);
        results[func.selector] = { ...func };
      }
    } catch (error) {
      console.error(`Error testing function ${func.name}:`, error);
    }
  }
  
  return results;
}

export async function POST(request: Request) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    const { contractAddress, cacheBuster } = requestData || {};
    
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }
    
    console.log('Fetching bytecode for contract:', contractAddress, cacheBuster ? '(cache bypassed)' : '');
    
    // Convert Hedera contract ID to EVM address if needed
    const evmAddress = convertToEvmAddress(contractAddress);
    
    // Construct mirror node API URL
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${evmAddress}`;
    
    // Create a cache key for this contract
    const cacheKey = `bytecode-${evmAddress}`;
    
    // Skip cache if cacheBuster is provided
    const shouldUseCache = process.env.NODE_ENV === 'development' && !cacheBuster;
    const cachedData = shouldUseCache ? globalThis.__bytecodeCache?.[cacheKey] : null;
    if (cachedData) {
      console.log('Using cached bytecode data');
      return NextResponse.json(cachedData);
    }
    
    // Fetch contract data from mirror node
    const response = await fetch(mirrorNodeUrl);
    if (!response.ok) {
      throw new Error(`Mirror node API returned ${response.status}: ${response.statusText}`);
    }
    
    const contractData = await response.json();
    const bytecode = contractData.bytecode || '';
    
    console.log(`Bytecode retrieved, length: ${bytecode.length}`);
    
    // Extract function selectors from bytecode
    let detectedFunctions: Record<string, any> = {};
    
    if (bytecode) {
      // Use pattern matching to extract function selectors
      detectedFunctions = extractFunctionSelectorsFromBytecode(bytecode);
      
      // Enhance detected functions with additional signatures
      detectedFunctions = await lookupFunctionSignatures(detectedFunctions);
    }
    
    // After looking up functions in bytecode
    if (Object.keys(detectedFunctions).length === 0) {
      console.log('No functions detected from bytecode patterns, trying direct function testing');
      // If bytecode analysis found nothing, try directly testing common functions
      const testedFunctions = await testCommonFunctions(evmAddress);
      
      // Merge any functions we found through testing
      for (const [selector, funcData] of Object.entries(testedFunctions)) {
        detectedFunctions[selector] = funcData;
      }
      
      console.log(`Found ${Object.keys(testedFunctions).length} functions through direct testing`);
    }
    
    // Create response data
    const responseData = { 
      bytecode: bytecode.substring(0, 100) + '...', // Just return the first part of bytecode for size reasons
      functions: detectedFunctions,
      contractAddress: evmAddress
    };
    
    // Cache the result in development mode
    if (process.env.NODE_ENV === 'development') {
      if (!globalThis.__bytecodeCache) {
        globalThis.__bytecodeCache = {};
      }
      globalThis.__bytecodeCache[cacheKey] = responseData;
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in get-contract-bytecode API:', error);
    return NextResponse.json({ error: 'Failed to analyze contract bytecode' }, { status: 500 });
  }
} 