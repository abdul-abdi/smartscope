import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

// Common ABIs for standard contracts
const commonAbis: Record<string, string[]> = {
  // ERC20 standard interface
  erc20: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
  ],
  // ERC721 standard interface
  erc721: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function approve(address to, uint256 tokenId)',
    'function getApproved(uint256 tokenId) view returns (address)',
    'function setApprovalForAll(address operator, bool _approved)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
    'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
  ],
  // Simple storage contract
  simpleStorage: [
    'function store(uint256 num)',
    'function retrieve() view returns (uint256)'
  ],
  // Counter contract
  counter: [
    'function increment()',
    'function decrement()',
    'function count() view returns (uint256)'
  ]
};

// Common function signatures to detect by hash
const FUNCTION_SIGNATURES: Record<string, { name: string, stateMutability: string, inputs: any[], outputs: any[] }> = {
  // ERC20
  '0x06fdde03': { name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  '0x95d89b41': { name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  '0x313ce567': { name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  '0x18160ddd': { name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  '0x70a08231': { name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  '0xa9059cbb': { name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  '0xdd62ed3e': { name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  '0x095ea7b3': { name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  '0x23b872dd': { name: 'transferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  
  // ERC721
  '0x6352211e': { name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  '0xc87b56dd': { name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  '0x42842e0e': { name: 'safeTransferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  '0xb88d4fde': { name: 'safeTransferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
  
  // Common functions
  '0x893d20e8': { name: 'getOwner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  '0x8da5cb5b': { name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  '0xd0e30db0': { name: 'deposit', stateMutability: 'payable', inputs: [], outputs: [] },
  '0x3ccfd60b': { name: 'withdraw', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  '0x12065fe0': { name: 'getBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  '0x6d4ce63c': { name: 'get', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  '0x371303c0': { name: 'set', stateMutability: 'nonpayable', inputs: [{ name: 'value', type: 'uint256' }], outputs: [] },
  '0x60fe47b1': { name: 'set', stateMutability: 'nonpayable', inputs: [{ name: 'value', type: 'uint256' }], outputs: [] },
};

// HashIO JSON-RPC endpoint
const HASHIO_RPC_ENDPOINT = 'https://testnet.hashio.io/api';

// Define a utility function to generate human-readable function signatures from ABI
function generateFunctionSignature(abiItem: any): string {
  if (!abiItem.name) return '';
  
  // Extract the function name
  let signature = `${abiItem.name}(`;
  
  // Add parameter types
  if (abiItem.inputs && abiItem.inputs.length > 0) {
    signature += abiItem.inputs.map((input: any) => {
      // Include parameter name if available
      return input.type + (input.name ? ` ${input.name}` : '');
    }).join(', ');
  }
  
  signature += ')';
  
  // Add state mutability if it's not the default
  if (abiItem.stateMutability && abiItem.stateMutability !== 'nonpayable') {
    signature += ` ${abiItem.stateMutability}`;
  }
  
  // Add return types if any
  if (abiItem.outputs && abiItem.outputs.length > 0) {
    signature += ' returns (';
    signature += abiItem.outputs.map((output: any) => {
      // Include return parameter name if available
      return output.type + (output.name ? ` ${output.name}` : '');
    }).join(', ');
    signature += ')';
  }
  
  return signature;
}

/**
 * Helper function to filter out placeholder function names from ABI
 * Only include functions with meaningful names
 */
function filterUnknownFunctions(abi: any[]): any[] {
  if (!Array.isArray(abi)) return [];
  
  return abi.filter(item => {
    // Keep non-function items (like events)
    if (item.type !== 'function') return true;
    
    // Filter out placeholder function names (function_XXXX format)
    return !item.name.startsWith('function_');
  });
}

export async function POST(request: Request) {
  try {
    const { 
      contractAddress, 
      bytecode,
      disableTransactionHistory = false,
      preferSource = false,
      sourceOnly = false,
      analysisMethod = '' 
    } = await request.json();
    
    if (!contractAddress && !bytecode) {
      return NextResponse.json({ error: 'Contract address or bytecode is required' }, { status: 400 });
    }
    
    console.log('Fetching ABI for contract:', contractAddress);
    
    // If manual bytecode is provided, analyze it directly
    if (bytecode) {
      console.log('Using provided bytecode for analysis');
      // Process the bytecode to extract function selectors
      const abi = await analyzeBytecodeForFunctions(bytecode);
      
      return NextResponse.json({
        abi: filterUnknownFunctions(abi),
        source: 'manual-bytecode',
        message: 'ABI generated from provided bytecode'
      });
    }
    
    // Normalize the contract address format
    const evmAddress = convertToEvmAddress(contractAddress);
    
    // First check if ABI is already available on the mirror node
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${evmAddress}`;
    console.log('Querying mirror node:', mirrorNodeUrl);
    
    const response = await fetch(mirrorNodeUrl);
    
    if (!response.ok) {
      throw new Error(`Mirror node API returned ${response.status}: ${response.statusText}`);
    }
    
    const contractData = await response.json();
    console.log('Contract data retrieved');
    
    // If we have an ABI from mirror node, use it directly
    if (contractData.abi && contractData.abi.length > 0) {
      // We may have to parse it if it's a string
      const parsedAbi = typeof contractData.abi === 'string' 
        ? JSON.parse(contractData.abi) 
        : contractData.abi;
      
      return NextResponse.json({
        abi: filterUnknownFunctions(parsedAbi),
        source: 'source',
        message: 'ABI retrieved from verified source code'
      });
    }
    
    // Skip transaction history if requested (prioritize bytecode)
    if (disableTransactionHistory || sourceOnly || preferSource || analysisMethod === 'bytecode') {
      console.log('Transaction history analysis disabled, using bytecode analysis only');
      // Analyze bytecode for function selectors
      console.log('Performing direct bytecode analysis...');
      
      // Get the contract bytecode directly
      try {
        // First try to get bytecode from contract data response
        let bytecodeToAnalyze = contractData.bytecode;
        
        if (!bytecodeToAnalyze) {
          // If not available, request it using our specialized endpoint
          // For server-side API routes, we need an absolute URL
          let baseUrl;
          const origin = request.headers.get('origin');
          if (origin) {
            baseUrl = origin;
          } else {
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const host = process.env.VERCEL_URL || 'localhost:3000';
            baseUrl = `${protocol}://${host}`;
          }
          
          const bytecodeResponse = await fetch(`${baseUrl}/api/get-contract-bytecode`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractAddress }),
          });
          
          if (!bytecodeResponse.ok) {
            throw new Error('Failed to fetch contract bytecode');
          }
          
          const bytecodeData = await bytecodeResponse.json();
          bytecodeToAnalyze = bytecodeData.bytecode;
        }
        
        if (!bytecodeToAnalyze) {
          throw new Error('No bytecode available for analysis');
        }
        
        // Analyze the bytecode for function selectors
        const abi = await analyzeBytecodeForFunctions(bytecodeToAnalyze);
        
        return NextResponse.json({
          abi: filterUnknownFunctions(abi),
          source: 'bytecode',
          message: 'ABI generated from bytecode analysis'
        });
      } catch (bytecodeError: any) {
        console.error('Bytecode analysis failed:', bytecodeError.message);
        throw new Error(`Failed to analyze contract bytecode: ${bytecodeError.message}`);
      }
    }
    
    // Otherwise, we'll try to determine the ABI from function calls
    // This code will only run if disableTransactionHistory is false
    // Check contract interaction history to see if we can determine functions
    const contractResultsUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${evmAddress}/results`;
    console.log('Fetching contract results:', contractResultsUrl);
    
    const resultsResponse = await fetch(contractResultsUrl);
    
    if (!resultsResponse.ok) {
      throw new Error(`Failed to fetch contract results: ${resultsResponse.status}`);
    }
    
    const resultsData = await resultsResponse.json();
    console.log('Contract results retrieved, analyzing function calls');
    
    // Extract function selectors from transaction history
    const functionCalls = resultsData.results?.map(result => {
      // Ensure we're working with a string or return undefined if not
      const params = result.function_parameters;
      return typeof params === 'string' ? params.substring(0, 10) : undefined;
    }) || [];
    const uniqueFunctionCalls = [...new Set(functionCalls)].filter(Boolean) as string[];
    
    console.log('Detected function calls:', uniqueFunctionCalls);
    
    // If we found function calls in history, use them to build ABI
    if (uniqueFunctionCalls.length > 0 && uniqueFunctionCalls[0] !== '0x') {
      // For each function call, get the signature
      const abi = [];
      const functionSignatures = [];
      
      for (const selector of uniqueFunctionCalls) {
        const signatureData = await lookupFunctionSignature(selector);
        
        if (signatureData.name && signatureData.name !== 'unknown') {
          // Add to ABI
          abi.push({
            type: 'function',
            name: signatureData.name,
            inputs: signatureData.inputTypes.map((type, index) => ({
              name: `param${index}`,
              type
            })),
            outputs: signatureData.outputTypes.map((type, index) => ({
              name: `output${index}`,
              type
            })),
            stateMutability: signatureData.stateMutability
          });
          
          // Add to function signatures
          functionSignatures.push(signatureData.signature);
        }
      }
      
      return NextResponse.json({
        abi: filterUnknownFunctions(abi),
        functionSignatures,
        source: 'transaction',
        message: 'ABI generated from contract transaction history'
      });
    }
    
    // As a last resort, try bytecode analysis
    console.log('No transaction history, attempting bytecode analysis...');
    
    try {
      // Get the bytecode using our improved bytecode analysis endpoint
      // For server-side API routes, we need an absolute URL
      let baseUrl;
      const origin = request.headers.get('origin');
      if (origin) {
        baseUrl = origin;
      } else {
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.VERCEL_URL || 'localhost:3000';
        baseUrl = `${protocol}://${host}`;
      }
      
      const bytecodeResponse = await fetch(`${baseUrl}/api/get-contract-bytecode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress }),
      });
      
      if (!bytecodeResponse.ok) {
        throw new Error('Failed to fetch contract bytecode');
      }
      
      const bytecodeData = await bytecodeResponse.json();
      const abi = await analyzeBytecodeForFunctions(bytecodeData.bytecode);
      
      return NextResponse.json({
        abi: filterUnknownFunctions(abi),
        source: 'bytecode',
        message: 'ABI generated from bytecode analysis'
      });
    } catch (bytecodeError: any) {
      console.error('All ABI resolution methods failed');
      return NextResponse.json({
        error: 'Could not determine ABI using any available method',
        errorType: 'ABI_RESOLUTION_FAILED'
      }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error in get-contract-abi route:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

// Helper function to analyze bytecode for function selectors
async function analyzeBytecodeForFunctions(bytecode: string): Promise<any[]> {
  // Extract function selectors from bytecode
  const functionSelectors = extractSelectorsFromBytecode(bytecode);
  console.log(`Extracted ${functionSelectors.length} function selectors from bytecode`);
  
  // Convert selectors to ABI format
  const abi = [];
  
  // First, look up known signatures in the FUNCTION_SIGNATURES database
  for (const selector of functionSelectors) {
    if (FUNCTION_SIGNATURES[selector]) {
      abi.push(FUNCTION_SIGNATURES[selector]);
      continue;
    }
    
    // Try to look up using external service
    try {
      const signatureData = await lookupFunctionSignature(selector);
      
      if (signatureData.name && signatureData.name !== 'unknown') {
        // Add to ABI
        abi.push({
          type: 'function',
          name: signatureData.name,
          inputs: signatureData.inputTypes.map((type, index) => ({
            name: `param${index}`,
            type
          })),
          outputs: signatureData.outputTypes.map((type, index) => ({
            name: `output${index}`,
            type
          })),
          stateMutability: signatureData.stateMutability || 'nonpayable'
        });
      } else {
        // Add a placeholder if we can't resolve the signature
        abi.push({
          type: 'function',
          name: `function_${selector.substr(2)}`,
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable'
        });
      }
    } catch (err) {
      // If lookup fails, add a placeholder
      abi.push({
        type: 'function',
        name: `function_${selector.substr(2)}`,
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable'
      });
    }
  }
  
  // Add standard functions that might be missing from bytecode
  addStandardFunctions(abi);
  
  // Final step: Filter out placeholder functions before returning
  return filterUnknownFunctions(abi);
}

// Function to extract function selectors from bytecode
function extractSelectorsFromBytecode(bytecode: string): string[] {
  const selectors: string[] = [];
  
  // Remove 0x prefix if present
  const cleanBytecode = bytecode.startsWith('0x') ? bytecode.substring(2) : bytecode;
  
  // Look for push4 opcodes followed by function selectors
  // PUSH4 opcode is 0x63, followed by 4 bytes of selector
  const regex = /63([0-9a-f]{8})/gi;
  let match;
  
  while ((match = regex.exec(cleanBytecode)) !== null) {
    const selector = `0x${match[1]}`;
    selectors.push(selector);
  }
  
  return [...new Set(selectors)]; // Remove duplicates
}

// Modify the addStandardFunctions function to be more cautious
function addStandardFunctions(abi: any[]): void {
  // Don't add any assumed functions - this makes the ABI more accurate
  // Only use what we've directly detected from the contract's bytecode
  
  // Legacy code retained in comments for reference
  /*
  // Check if we have any ERC20-like functions
  const hasErc20Functions = abi.some(func => 
    ['balanceOf', 'transfer', 'transferFrom', 'approve'].includes(func.name)
  );
  
  if (hasErc20Functions) {
    // Add any missing ERC20 functions
    const erc20Functions = ['name', 'symbol', 'decimals', 'totalSupply', 'balanceOf', 'transfer', 'allowance', 'approve', 'transferFrom'];
    
    for (const funcName of erc20Functions) {
      if (!abi.some(f => f.name === funcName)) {
        // Find in FUNCTION_SIGNATURES and add if available
        const selector = Object.keys(FUNCTION_SIGNATURES).find(
          key => FUNCTION_SIGNATURES[key].name === funcName
        );
        
        if (selector) {
          abi.push(FUNCTION_SIGNATURES[selector]);
        }
      }
    }
  }
  */
}

/**
 * Discover contract functions by testing known function selectors
 */
async function discoverFunctionsViaSelectors(contractAddress: string): Promise<any[]> {
  // Make sure we have the 0x prefix for RPC calls
  const evmAddress = contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`;
  
  const discoveredFunctions: any[] = [];
  const testedSelectors = new Set<string>();
  
  // First, test all known function signatures
  console.log(`Testing ${Object.keys(FUNCTION_SIGNATURES).length} known function selectors`);
  
  for (const [selector, funcDef] of Object.entries(FUNCTION_SIGNATURES)) {
    // Skip duplicates
    if (testedSelectors.has(selector)) continue;
    testedSelectors.add(selector);
    
    try {
      const result = await callContractWithSelector(evmAddress, selector);
      // If we don't get an error, this function likely exists
      if (result && !result.includes('error')) {
        console.log(`Discovered function via selector ${selector}: ${funcDef.name}`);
        discoveredFunctions.push({
          type: 'function',
          name: funcDef.name,
          inputs: funcDef.inputs,
          outputs: funcDef.outputs,
          stateMutability: funcDef.stateMutability
        });
      }
    } catch (error) {
      // Skip - function doesn't exist
    }
  }
  
  // Remove the heuristic that adds additional ERC20 functions
  // Only include functions that were actually detected in the bytecode
  
  /* 
  // Additional heuristics for common patterns
  if (discoveredFunctions.some(f => f.name === 'name') && 
      discoveredFunctions.some(f => f.name === 'symbol') && 
      discoveredFunctions.some(f => f.name === 'balanceOf')) {
    // This is likely a token contract - add related functions
    const tokenFunctions = discoveredFunctions.map(f => f.name);
    
    // Add other ERC20 functions if they're not already detected
    if (!tokenFunctions.includes('totalSupply')) {
      discoveredFunctions.push({
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
      });
    }
    
    if (!tokenFunctions.includes('transfer')) {
      discoveredFunctions.push({
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }],
        stateMutability: 'nonpayable'
      });
    }
  }
  */
  
  return discoveredFunctions;
}

/**
 * Call a contract with a given function selector to test if it exists
 */
async function callContractWithSelector(address: string, selector: string): Promise<string> {
  try {
    const response = await fetch(HASHIO_RPC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://smartscope.vercel.app'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1000000),
        method: 'eth_call',
        params: [
          {
            to: address,
            data: selector
          },
          'latest'
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.result || data.error?.message || 'error';
  } catch (error: any) {
    throw new Error(`Error calling contract with selector: ${error.message}`);
  }
}

// Helper function to detect contract type from call results
function detectContractTypeFromResults(results: any[]): string | null {
  if (!results || results.length === 0) return null;
  
  let functionCalls = new Set();
  
  // Extract function signatures from results
  results.forEach(result => {
    if (result.function_parameters) {
      const funcName = result.function_parameters.split('(')[0];
      if (funcName) functionCalls.add(funcName);
    }
  });
  
  console.log('Detected function calls:', Array.from(functionCalls));
  
  // Check for ERC20 functions
  if (
    functionCalls.has('transfer') || 
    functionCalls.has('balanceOf') || 
    functionCalls.has('approve')
  ) {
    return 'erc20';
  }
  
  // Check for ERC721 functions
  if (
    functionCalls.has('ownerOf') || 
    functionCalls.has('safeTransferFrom') || 
    functionCalls.has('tokenURI')
  ) {
    return 'erc721';
  }
  
  // Check for SimpleStorage
  if (
    functionCalls.has('store') && 
    functionCalls.has('retrieve')
  ) {
    return 'simpleStorage';
  }
  
  // Check for Counter
  if (
    functionCalls.has('increment') || 
    functionCalls.has('decrement') || 
    functionCalls.has('count')
  ) {
    return 'counter';
  }
  
  return null;
}

// Helper to detect ERC20 token
async function detectERC20(contractAddress: string): Promise<boolean> {
  try {
    // Use HashIO JSON-RPC to check for ERC20 interface support
    const response = await fetch('https://testnet.hashio.io/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://smartscope.vercel.app'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`,
            data: '0x06fdde03' // name()
          },
          'latest'
        ]
      })
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return !!data.result && data.result !== '0x' && !data.error;
  } catch (error) {
    return false;
  }
}

// Helper to detect ERC721 token
async function detectERC721(contractAddress: string): Promise<boolean> {
  try {
    // Use HashIO JSON-RPC to check for ERC721 interface support
    const supportsERC721Interface = await fetch('https://testnet.hashio.io/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://smartscope.vercel.app'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`,
            data: '0x01ffc9a780ac58cd00000000000000000000000000000000000000000000000000000000' // supportsInterface(0x80ac58cd) - ERC721 interface id
          },
          'latest'
        ]
      })
    });
    
    if (!supportsERC721Interface.ok) {
      return false;
    }
    
    const data = await supportsERC721Interface.json();
    
    // Check for a positive response
    return data.result === '0x0000000000000000000000000000000000000000000000000000000000000001';
  } catch (error) {
    return false;
  }
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
 * Look up function signature for a given selector
 * @param selector The function selector (first 4 bytes of keccak hash)
 * @returns Function metadata including name, signature, input/output types
 */
async function lookupFunctionSignature(selector: string) {
  // Common function selectors database - we'll check here first
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

  // First check if it's a common selector we already know
  if (commonSelectors[selector]) {
    return commonSelectors[selector];
  }
  
  // Try to look it up from 4byte.directory
  try {
    const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Use the first signature (most popular)
        const signature = data.results[0].text_signature;
        
        // Parse the signature
        const match = signature.match(/(\w+)\((.*)\)/);
        if (match) {
          const name = match[1];
          const inputTypesStr = match[2];
          const inputTypes = inputTypesStr ? inputTypesStr.split(',') : [];
          
          return {
            name,
            signature,
            inputTypes,
            outputTypes: ['unknown'], // We can't know this from 4byte.directory
            stateMutability: 'unknown'
          };
        }
      }
    }
  } catch (error) {
    console.error(`Error looking up signature for ${selector}:`, error);
  }
  
  // If all else fails, return a generic placeholder
  return {
    name: `function_${selector.substring(2, 6)}`,
    signature: `function_${selector.substring(2, 6)}()`,
    inputTypes: [],
    outputTypes: ['unknown'],
    stateMutability: 'nonpayable'
  };
} 