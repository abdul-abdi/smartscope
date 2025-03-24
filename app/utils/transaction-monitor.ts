import { ethers } from 'ethers';
import { executeJsonRpcCall } from './contract-utils';

// Cache to store decoded transaction data
const txDecodingCache = new Map<string, any>();

/**
 * Decodes input data from a contract transaction
 */
export async function decodeTransactionInput(txHash: string, abi: any[]): Promise<any> {
  try {
    // Check cache first
    if (txDecodingCache.has(txHash)) {
      return txDecodingCache.get(txHash);
    }
    
    // Get transaction data
    const tx = await executeJsonRpcCall('eth_getTransactionByHash', [txHash]);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Get the input data and to address
    const { input, to } = tx;
    
    // Create interface from ABI
    const iface = new ethers.utils.Interface(abi);
    
    // Try to decode the function call
    let decodedData;
    try {
      decodedData = iface.parseTransaction({ data: input });
    } catch (error) {
      // If we can't decode with the interface, return raw data
      decodedData = {
        raw: input,
        selector: input.slice(0, 10),
        error: 'Could not decode transaction data with provided ABI'
      };
    }
    
    // Get transaction receipt for events and status
    const receipt = await executeJsonRpcCall('eth_getTransactionReceipt', [txHash]);
    
    // Decode any logs (events) if possible
    let decodedLogs = [];
    if (receipt && receipt.logs) {
      decodedLogs = receipt.logs.map((log: any) => {
        try {
          return {
            ...iface.parseLog(log),
            rawData: log.data,
            topics: log.topics
          };
        } catch (error) {
          return {
            raw: log,
            error: 'Could not decode log with provided ABI'
          };
        }
      });
    }
    
    // Create result object
    const result = {
      transaction: {
        hash: txHash,
        to,
        from: tx.from,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gas: tx.gas,
        nonce: tx.nonce,
        status: receipt ? (receipt.status === '0x1' ? 'SUCCESS' : 'FAILED') : 'PENDING'
      },
      decodedInput: decodedData,
      decodedLogs,
      rawInput: input,
      rawReceipt: receipt
    };
    
    // Cache the result
    txDecodingCache.set(txHash, result);
    
    return result;
  } catch (error: any) {
    console.error('Error decoding transaction:', error);
    return {
      error: error.message || 'Failed to decode transaction',
      txHash
    };
  }
}

/**
 * Gets detailed information about a contract call response 
 */
export async function analyzeContractCallResult(
  contractAddress: string,
  functionName: string,
  parameters: any[],
  result: any,
  abi: any[]
): Promise<any> {
  try {
    // Find function ABI
    const functionAbi = abi.find(item => 
      item.type === 'function' && 
      item.name === functionName
    );
    
    if (!functionAbi) {
      return {
        result,
        analysis: {
          error: 'Function ABI not found in provided ABI'
        }
      };
    }
    
    // Create a human-readable description of inputs
    const inputDescription = functionAbi.inputs.map((input: any, index: number) => {
      return {
        name: input.name || `param${index}`,
        type: input.type,
        value: parameters[index]
      };
    });
    
    // Format the result based on output types
    let formattedResult = result;
    const outputTypes = functionAbi.outputs || [];
    
    // Create a human-readable description of outputs
    let outputDescription = [];
    
    if (outputTypes.length > 0 && result !== null && result !== undefined) {
      // For multiple return values in a tuple
      if (Array.isArray(result) && outputTypes.length > 1) {
        outputDescription = outputTypes.map((output: any, index: number) => {
          return {
            name: output.name || `result${index}`,
            type: output.type,
            value: result[index]
          };
        });
      } 
      // For a single return value
      else {
        outputDescription = [{
          name: outputTypes[0]?.name || 'result',
          type: outputTypes[0]?.type || 'unknown',
          value: result
        }];
      }
    }
    
    return {
      result: formattedResult,
      analysis: {
        functionName,
        methodId: ethers.utils.id(`${functionName}(${functionAbi.inputs.map((i: any) => i.type).join(',')})`).slice(0, 10),
        inputs: inputDescription,
        outputs: outputDescription,
        stateMutability: functionAbi.stateMutability
      }
    };
  } catch (error: any) {
    console.error('Error analyzing contract call result:', error);
    return {
      result,
      analysis: {
        error: error.message || 'Failed to analyze contract call result'
      }
    };
  }
}

/**
 * Monitors a transaction until it is confirmed
 */
export async function monitorTransaction(
  txHash: string, 
  callback?: (status: string, receipt: any) => void
): Promise<any> {
  let attempts = 0;
  const maxAttempts = 20;
  
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        if (attempts >= maxAttempts) {
          const error = new Error(`Transaction monitoring timed out after ${maxAttempts} attempts`);
          if (callback) callback('TIMEOUT', null);
          return reject(error);
        }
        
        const receipt = await executeJsonRpcCall('eth_getTransactionReceipt', [txHash]);
        
        if (!receipt) {
          // Still pending
          attempts++;
          if (callback) callback('PENDING', null);
          setTimeout(checkStatus, 3000); // Check again in 3 seconds
          return;
        }
        
        const status = receipt.status === '0x1' ? 'SUCCESS' : 'FAILED';
        
        if (callback) callback(status, receipt);
        resolve({
          status,
          receipt,
          txHash
        });
      } catch (error) {
        console.error('Error monitoring transaction:', error);
        attempts++;
        setTimeout(checkStatus, 3000);
      }
    };
    
    checkStatus();
  });
} 