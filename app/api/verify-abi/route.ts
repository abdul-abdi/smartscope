import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  formatToEvmAddress,
  getContractBytecode,
  executeJsonRpcCall
} from '../../utils/contract-utils';

// 4byte.directory API endpoint for function signature lookup
const FOURBYTE_API_URL = 'https://www.4byte.directory/api/v1/signatures/';

// Cache for verification results
const verificationCache = new Map<string, any>();

export async function POST(request: Request) {
  try {
    const { contractAddress, abi } = await request.json();

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    if (!abi || !Array.isArray(abi)) {
      return NextResponse.json({ error: 'Valid ABI array is required' }, { status: 400 });
    }

    console.log(`Verifying ABI for contract: ${contractAddress}`);
    
    // Create a cache key from contract address and a hash of the ABI
    const cacheKey = `${contractAddress}-${Buffer.from(JSON.stringify(abi)).toString('base64').substring(0, 10)}`;
    
    // Check cache first
    if (verificationCache.has(cacheKey)) {
      console.log('Using cached verification results');
      return NextResponse.json(verificationCache.get(cacheKey));
    }
    
    // Get contract bytecode for verification
    const bytecode = await getContractBytecode(contractAddress);
    
    if (!bytecode || bytecode === '0x') {
      return NextResponse.json({ 
        error: 'Contract does not exist or has no deployed code',
        verifiedFunctions: []
      }, { status: 400 });
    }
    
    // Process functions from ABI
    const functionsToVerify = abi.filter(item => item.type === 'function');
    
    // Array to hold verification results
    const verificationResults = await Promise.all(
      functionsToVerify.map(async (func) => {
        const result = await verifyFunction(contractAddress, func, bytecode);
        return {
          ...func,
          verified: result.exists,
          humanReadableSignature: generateHumanReadableSignature(func),
          selector: result.selector
        };
      })
    );
    
    // Get only verified functions (those that exist in the bytecode)
    const verifiedFunctions = verificationResults.filter(func => func.verified);
    
    // Fetch additional metadata from trusted sources
    await enrichFunctionMetadata(verifiedFunctions);
    
    // Cache the results
    const response = {
      total: functionsToVerify.length,
      verified: verifiedFunctions.length,
      verifiedFunctions
    };
    
    verificationCache.set(cacheKey, response);
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in verify-abi endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to verify ABI',
      verifiedFunctions: []
    }, { status: 500 });
  }
}

/**
 * Verify a single function exists in the contract bytecode
 */
async function verifyFunction(
  contractAddress: string, 
  func: any, 
  bytecode: string
): Promise<{ exists: boolean, selector: string }> {
  try {
    // Generate function signature
    const signature = `${func.name}(${func.inputs.map((input: any) => input.type).join(',')})`;
    
    // Calculate function selector
    const selector = ethers.utils.id(signature).slice(0, 10);
    const selectorWithoutPrefix = selector.slice(2); // Remove 0x prefix
    
    // Check if the selector exists in bytecode
    const exists = bytecode.includes(selectorWithoutPrefix);
    
    if (exists) {
      console.log(`Function verified: ${signature} -> ${selector}`);
    } else {
      console.log(`Function not found in bytecode: ${signature} -> ${selector}`);
      
      // Try an extra verification with eth_call for view functions
      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        try {
          const evmAddress = formatToEvmAddress(contractAddress);
          const callObject = {
            to: evmAddress,
            data: selector
          };
          
          await executeJsonRpcCall('eth_call', [callObject, 'latest']);
          // If no error was thrown, the function exists
          console.log(`Function verified via eth_call: ${signature}`);
          return { exists: true, selector };
        } catch (callError) {
          // Failed to call, likely doesn't exist or requires parameters
          console.log(`Function eth_call verification failed: ${signature}`);
        }
      }
    }
    
    return { exists, selector };
  } catch (error) {
    console.error(`Error verifying function ${func.name}:`, error);
    return { exists: false, selector: '' };
  }
}

/**
 * Generate a human-readable function signature
 */
function generateHumanReadableSignature(func: any): string {
  try {
    // Function name
    let signature = `${func.name}(`;
    
    // Add parameter types and names
    if (func.inputs && func.inputs.length > 0) {
      signature += func.inputs.map((input: any) => {
        return `${input.type}${input.name ? ` ${input.name}` : ''}`;
      }).join(', ');
    }
    
    signature += ')';
    
    // Add state mutability if it's not nonpayable
    if (func.stateMutability && func.stateMutability !== 'nonpayable') {
      signature += ` ${func.stateMutability}`;
    }
    
    // Add return types
    if (func.outputs && func.outputs.length > 0) {
      signature += ' returns (';
      signature += func.outputs.map((output: any) => {
        return `${output.type}${output.name ? ` ${output.name}` : ''}`;
      }).join(', ');
      signature += ')';
    }
    
    return signature;
  } catch (error) {
    console.error('Error generating human-readable signature:', error);
    return func.name || 'unknown';
  }
}

/**
 * Enrich function metadata from trusted sources
 */
async function enrichFunctionMetadata(functions: any[]): Promise<void> {
  // For each function, try to fetch additional information from 4byte directory
  for (const func of functions) {
    if (!func.selector) continue;
    
    try {
      // Try to fetch metadata from 4byte directory
      const url = `${FOURBYTE_API_URL}?hex_signature=${func.selector}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Find the best match from results
          const bestMatch = data.results.find((result: any) => 
            result.text_signature.startsWith(`${func.name}(`)
          ) || data.results[0];
          
          // Add additional metadata
          func.standardSignature = bestMatch.text_signature;
          func.popularity = data.results.length; // How many implementations exist
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch metadata for ${func.name}:`, error);
    }
  }
} 