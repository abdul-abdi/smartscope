import { ethers } from 'ethers';

// HashIO JSON-RPC endpoint for Hedera testnet
export const HASHIO_API_ENDPOINT = 'https://testnet.hashio.io/api';

// Mirror Node API endpoints
export const MIRROR_NODE_TESTNET = 'https://testnet.mirrornode.hedera.com/api/v1';
export const MIRROR_NODE_MAINNET = 'https://mainnet-public.mirrornode.hedera.com/api/v1';

/**
 * Converts any contract address format to EVM format
 * Handles both Hedera (0.0.X) and EVM formats
 */
export function formatToEvmAddress(contractAddress: string): string {
  try {
    // If already starts with 0x, ensure it doesn't have double prefix
    if (contractAddress.startsWith('0x')) {
      // Remove any duplicate 0x prefix (like "0x0x...")
      if (contractAddress.startsWith('0x0x')) {
        return '0x' + contractAddress.substring(4);
      }
      return contractAddress;
    }
    
    // For shard.realm.num format
    if (contractAddress.includes('.')) {
      const parts = contractAddress.split('.');
      // If we have a valid Hedera ID format
      if (parts.length === 3) {
        // Create EVM address with proper padding
        return '0x' + parts[2].padStart(40, '0');
      }
    }
    
    // For numeric format without dots
    if (/^\d+$/.test(contractAddress)) {
      return '0x' + contractAddress.padStart(40, '0');
    }
    
    // Default: assume it's a valid address without 0x prefix
    return '0x' + contractAddress;
  } catch (error) {
    console.error('Error formatting to EVM address:', error);
    // Return as-is with 0x prefix as a fallback
    return contractAddress.startsWith('0x') ? contractAddress : '0x' + contractAddress;
  }
}

/**
 * Get contract information from the Hedera Mirror Node API
 */
export async function getContractInfoFromMirrorNode(
  contractAddress: string, 
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<any> {
  try {
    // Remove 0x prefix if present
    const address = contractAddress.replace(/^0x/, '');
    
    const baseUrl = network === 'testnet' ? MIRROR_NODE_TESTNET : MIRROR_NODE_MAINNET;
    const mirrorNodeUrl = `${baseUrl}/contracts/${address}`;
    console.log('Fetching contract info from mirror node:', mirrorNodeUrl);
    
    const response = await fetch(mirrorNodeUrl);
    if (!response.ok) {
      throw new Error(`Mirror node request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn('Error getting contract info from mirror node:', error.message);
    throw error;
  }
}

/**
 * Execute a JSON-RPC call to the HashIO API
 * With improved error handling for contract reverts
 */
export async function executeJsonRpcCall(method: string, params: any[]): Promise<any> {
  const requestId = crypto.randomUUID().substring(0, 8);
  
  const jsonRpcPayload = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    params
  };

  try {
    const response = await fetch(HASHIO_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://smartscope.app',
      },
      body: JSON.stringify(jsonRpcPayload),
    });

    if (!response.ok) {
      throw new Error(`JSON-RPC request failed with status: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (responseData.error) {
      // Check for common contract revert errors
      const errorMessage = responseData.error.message || 'JSON-RPC error';
      
      // Enhanced error handling for contract reverts
      if (errorMessage.includes('revert') || errorMessage.includes('REVERT')) {
        // Extract the revert reason if available
        let revertReason = 'Contract execution reverted';
        
        // Try to extract custom revert message from different error formats
        const revertMatch = errorMessage.match(/reverted:?\s*(.*?)($|\s\()/i);
        if (revertMatch && revertMatch[1]) {
          revertReason = `Contract reverted: ${revertMatch[1].trim()}`;
        }
        
        // Create an error with a cleaner message that includes the request ID
        const error = new Error(`[Request ID: ${requestId}] ${revertReason}`);
        
        // Add extra information to the error object
        Object.assign(error, {
          code: 'CONTRACT_REVERT',
          originalError: responseData.error,
          revertReason: revertReason,
          requestId: requestId
        });
        
        throw error;
      }
      
      // For other errors, still include the request ID for better debugging
      throw new Error(`[Request ID: ${requestId}] ${errorMessage}`);
    }
    
    return responseData.result;
  } catch (error: any) {
    // If it's already a handled error, just rethrow it
    if (error.code === 'CONTRACT_REVERT') {
      throw error;
    }
    
    // Otherwise add request ID to any error
    console.error(`Error in JSON-RPC ${method} call [${requestId}]:`, error);
    const enhancedError = new Error(`[Request ID: ${requestId}] ${error.message}`);
    
    // Preserve stack trace and additional properties
    enhancedError.stack = error.stack;
    throw enhancedError;
  }
}

/**
 * Get contract bytecode using eth_getCode
 */
export async function getContractBytecode(contractAddress: string): Promise<string> {
  const evmAddress = formatToEvmAddress(contractAddress);
  return executeJsonRpcCall('eth_getCode', [evmAddress, 'latest']);
}

/**
 * Encode function call with parameters
 */
export function encodeFunctionCall(functionName: string, parameters: any[] = []): string {
  try {
    // Simple cases without parameters
    if (!parameters.length) {
      return ethers.utils.id(functionName + '()').slice(0, 10);
    }
    
    // For functions with parameters, we need to encode them properly
    // This is a simplified version and might need more sophisticated handling
    // for complex parameter types
    
    // Extract the function name and parameter types
    const match = functionName.match(/^([^(]+)\(([^)]*)\)$/);
    if (match) {
      const name = match[1];
      const paramTypes = match[2].split(',').filter(p => p);
      
      if (paramTypes.length !== parameters.length) {
        throw new Error('Parameter count mismatch');
      }
      
      // Create an interface with this function
      const iface = new ethers.utils.Interface([`function ${name}(${paramTypes.join(',')}) returns ()`]);
      return iface.encodeFunctionData(name, parameters);
    }
    
    // Simple fallback with just the function name and assumption
    // that parameters are primitives
    const signature = `${functionName}(${parameters.map(() => 'uint256').join(',')})`;
    return ethers.utils.id(signature).slice(0, 10);
  } catch (error: any) {
    console.error('Error encoding function call:', error);
    // Fallback to a simple selector
    return ethers.utils.id(functionName + '()').slice(0, 10);
  }
}

/**
 * Common function signatures for standard contracts (ERC20, ERC721, etc.)
 */
export const FUNCTION_SIGNATURES: Record<string, { 
  name: string, 
  stateMutability: string, 
  inputs: any[], 
  outputs: any[] 
}> = {
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
};

/**
 * Format and process output results based on ABI output types
 */
export function formatOutputResult(result: any, outputs: any[]): any {
  if (!result || !outputs || outputs.length === 0) {
    return result;
  }
  
  try {
    // For a single output parameter
    if (outputs.length === 1) {
      return result;
    }
    
    // For multiple output parameters (tuple)
    if (Array.isArray(result)) {
      // Create a named object if we have names for the outputs
      const namedOutputs = outputs.every(output => output.name);
      if (namedOutputs) {
        return outputs.reduce((obj, output, index) => {
          obj[output.name] = result[index];
          return obj;
        }, {});
      }
      // Otherwise return as array
      return result;
    }
    
    return result;
  } catch (error) {
    console.warn('Error formatting output result:', error);
    return result;
  }
} 