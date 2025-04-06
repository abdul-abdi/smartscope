import { NextResponse } from 'next/server';
import {
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  PrivateKey
} from '@hashgraph/sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import {
  getHederaCredentials,
  initializeClient,
  formatContractId,
  validateHederaCredentials
} from '../../utils/hedera';
import {
  formatToEvmAddress,
  formatToEvmAddressAsync,
  addressFormatDebugInfo,
  getContractInfoFromMirrorNode,
  executeJsonRpcCall,
  formatOutputResult,
  encodeFunctionCall
} from '../../utils/contract-utils';
import {
  analyzeContractCallResult,
  decodeTransactionInput,
  monitorTransaction
} from '../../utils/transaction-monitor';
import { withRetry, logError } from '../../utils/helpers';

// Load environment variables
dotenv.config();

// HashIO JSON-RPC endpoint for Hedera testnet
const HASHIO_API_ENDPOINT = 'https://testnet.hashio.io/api';

export async function POST(request: Request) {
  let requestId = ''; // Initialize requestId
  try {
    // Extract request ID early if possible, or generate one
    // (Assuming headers might contain an ID, otherwise use a timestamp/random string)
    // For simplicity, let's use a basic log marker for now
    const rawBody = await request.json();
    requestId = rawBody.requestId || `req_${Date.now()}`; // Use provided requestId or generate one
    const logPrefix = `[${requestId}] `;

    console.log(`${logPrefix}Received raw request body:`, JSON.stringify(rawBody)); // Log raw body immediately

    const {
      contractAddress,
      functionName,
      parameters,
      isQuery,
      abi,
      returnResult = false,
      includeInputAnalysis = true,
      includeCallTrace = true
    } = rawBody; // Destructure from the already parsed body

    // Use a consistent prefix for all logs from this endpoint
    // const logPrefix = requestId ? `[${requestId}] ` : ''; // logPrefix is already defined above

    console.log(`${logPrefix}Call request details - Contract: ${contractAddress}, Function: ${functionName}, isQuery: ${isQuery}`); // Log key details

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    if (!functionName) {
      return NextResponse.json({ error: 'Function name is required' }, { status: 400 });
    }

    console.log(`${logPrefix}Received call request`);

    // Ensure we have a properly formatted EVM address
    // Use the async version that will query Mirror Node for exact mapping
    let evmAddress = await formatToEvmAddressAsync(contractAddress);

    // Log debug information about address format
    const addressDebug = addressFormatDebugInfo(contractAddress);
    console.log(`${logPrefix}Address debug info:`, addressDebug);

    console.log(`${logPrefix}Using EVM address: ${evmAddress}`);

    // Validate contract exists on Hedera
    let contractValidated = false;
    let mirrorNodeData = null;

    // First, try to get contract info from mirror node to validate it exists
    try {
      mirrorNodeData = await getContractInfoFromMirrorNode(contractAddress);
      console.log(`${logPrefix}Contract exists with ID:`, mirrorNodeData.contract_id);

      // Store the contract ID for SDK calls if needed
      contractValidated = true;

      // Store the EVM address for JSON-RPC calls
      if (mirrorNodeData.evm_address) {
        // Ensure proper formatting of the EVM address from mirror node
        evmAddress = formatToEvmAddress(mirrorNodeData.evm_address.startsWith('0x')
          ? mirrorNodeData.evm_address
          : '0x' + mirrorNodeData.evm_address);

        console.log(`${logPrefix}Using EVM address from mirror node:`, evmAddress);
      }
    } catch (mirrorError) {
      console.warn(`${logPrefix}Mirror node validation failed:`, mirrorError.message);
      // Continue with the request anyway - the contract might still be valid
    }

    // Only verify the function if we have an ABI
    let functionExists = false;
    let verifiedAbi = null;
    
    // Check if we're operating in non-ABI mode
    const isDirectCall = !abi || !Array.isArray(abi) || abi.length === 0;
    
    if (isDirectCall) {
      console.log(`${logPrefix}No ABI provided, will use direct function call`);
      // When no ABI is provided, we'll assume the function exists and try to call it directly
      functionExists = true; 
    } else {
      try {
        // Determine server-relative API URL for internal fetch calls
        // We need to use absolute URLs for server-side API calls
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;
        console.log(`${logPrefix}Constructed internal API baseUrl: ${baseUrl}`); // Log the constructed baseUrl

        // Verify the function exists in the contract
        if (abi && Array.isArray(abi)) {
          // First try specific function verification
          const verifyResponse = await fetch(`${baseUrl}/api/verify-function`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contractAddress: evmAddress, // Use the formatted EVM address
              functionName,
              functionType: isQuery ? 'view' : 'nonpayable',
              inputTypes: parameters ? parameters.map((param: any) =>
                typeof param === 'object' && param.type ? param.type : typeof param
              ) : []
            }),
          });

          if (!verifyResponse.ok) {
            console.warn(`${logPrefix}Function verification API returned error: ${verifyResponse.status}`);
          } else {
            const verifyData = await verifyResponse.json();
            functionExists = verifyData.exists;

            console.log(`${logPrefix}Function verification result:`, verifyData);
          }

          if (!functionExists) {
            console.warn(`${logPrefix}Function '${functionName}' verification failed, trying ABI verification`);

            // If ABI is provided, try to verify using the ABI verification endpoint
            try {
              const abiVerifyResponse = await fetch(`${baseUrl}/api/verify-abi`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contractAddress: evmAddress, // Use the formatted EVM address
                  abi
                }),
              });

              if (!abiVerifyResponse.ok) {
                console.warn(`${logPrefix}ABI verification API returned error: ${abiVerifyResponse.status}`);
              } else {
                const abiVerifyData = await abiVerifyResponse.json();
                verifiedAbi = abiVerifyData.verifiedFunctions || [];

                // Check if our function is in the verified functions
                const verifiedFunction = verifiedAbi.find((func: any) =>
                  func.name === functionName && func.verified
                );

                if (verifiedFunction) {
                  functionExists = true;
                  console.log(`${logPrefix}Function '${functionName}' verified via ABI verification`);
                } else {
                  console.warn(`${logPrefix}Function '${functionName}' not found in verified ABI functions`);
                }
              }
            } catch (abiVerifyError) {
              console.warn(`${logPrefix}Error verifying ABI:`, abiVerifyError);
            }
          }
        } else {
          // Without an ABI, do a simple function verification
          try {
            const verifyResponse = await fetch(`${baseUrl}/api/verify-function`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contractAddress: evmAddress, // Use the formatted EVM address
                functionName,
                functionType: isQuery ? 'view' : 'nonpayable',
                inputTypes: parameters ? parameters.map((param: any) =>
                  typeof param === 'object' && param.type ? param.type : typeof param
                ) : []
              }),
            });

            if (!verifyResponse.ok) {
              console.warn(`${logPrefix}Function verification API returned error: ${verifyResponse.status}`);
            } else {
              const verifyData = await verifyResponse.json();
              functionExists = verifyData.exists;
              console.log(`${logPrefix}Function verification result:`, verifyData);
            }
          } catch (verifyError) {
            console.warn(`${logPrefix}Error calling verify-function API:`, verifyError);
          }
        }
      } catch (verifyError) {
        console.warn(`${logPrefix}Error in verification flow:`, verifyError);
        // Continue anyway - the function might still exist
      }
    }

    // Warn if function doesn't exist, but don't block the call
    if (!functionExists && !isDirectCall) {
      console.warn(`${logPrefix}Function '${functionName}' might not exist in contract`);
    }

    // Reject placeholder function names (those with function_XXXX format)
    if (functionName.startsWith('function_')) {
      return NextResponse.json({
        error: 'Cannot call functions with placeholder names. This function was identified by its selector but the actual name is unknown.',
        errorType: 'UNKNOWN_FUNCTION_NAME'
      }, { status: 400 });
    }

    // Determine if this is a read function (view/pure) or a write function
    // First check the explicitly passed isQuery flag
    let isReadFunction = !!isQuery;

    // If not specified, try to determine from ABI
    if (isQuery === undefined && abi && Array.isArray(abi)) {
      const functionAbi = abi.find(item =>
        item.name === functionName &&
        item.type === 'function'
      );

      if (functionAbi) {
        // Check for view or pure state mutability
        isReadFunction =
          functionAbi.stateMutability === 'view' ||
          functionAbi.stateMutability === 'pure';

        console.log(`${logPrefix}Determined from ABI that ${functionName} is ${isReadFunction ? 'a read' : 'a write'} function`);
      }
    }

    // Now that we know if it's a read function, check if we should block the call for non-existent functions
    // --- Start of Block to Comment Out ---
    // if (!functionExists && isReadFunction) {
    //   // If this is a read function and we're confident it doesn't exist, return an error
    //   // This helps prevent unnecessary errors in the UI for non-existent functions
    //   return NextResponse.json({
    //     error: `Function '${functionName}' does not appear to exist in this contract. It may have been extracted from source code or ABI but is not implemented in the bytecode.`,
    //     errorType: 'FUNCTION_NOT_FOUND',
    //     suggestion: 'Try a different function or verify the contract implements this functionality.'
    //   }, { status: 400 });
    // }
    // --- End of Block to Comment Out ---

    console.log(`${logPrefix}Call request: ${functionName} at ${contractAddress}, isQuery: ${isReadFunction}, params:`, parameters);

    // Validate if this function exists in the provided ABI (if available)
    let functionAbi;
    if (abi && Array.isArray(abi)) {
      functionAbi = abi.find(item =>
        item.name === functionName &&
        item.type === 'function'
      );

      if (!functionAbi) {
        console.warn(`${logPrefix}Function '${functionName}' not found in the provided ABI`);
      } else {
        console.log(`${logPrefix}Validated function '${functionName}' exists in ABI`);
      }
    }

    // For direct calls without ABI, try both modes if we get an error
    const shouldAttemptBothModes = isDirectCall;

    // For read functions, try using JSON-RPC eth_call
    if (isReadFunction) {
      try {
        console.log(`${logPrefix}Calling read function via eth_call`);
        const result = await callContractViaJsonRpc(evmAddress, functionName, parameters || [], true);
        console.log(`${logPrefix}Read call successful:`, result);

        // Process the result based on ABI output types if available
        let processedResult = result;
        if (functionAbi && functionAbi.outputs && functionAbi.outputs.length > 0) {
          try {
            processedResult = formatOutputResult(result, functionAbi.outputs);
          } catch (formatError) {
            console.warn(`${logPrefix}Could not format result according to ABI:`, formatError);
          }
        }

        // Generate call analysis if requested
        let analysis = null;
        if (includeCallTrace && abi && Array.isArray(abi)) {
          try {
            const analysisResult = await analyzeContractCallResult(
              contractAddress,
              functionName,
              parameters || [],
              processedResult,
              abi
            );
            analysis = analysisResult.analysis;
          } catch (analysisError) {
            console.warn(`${logPrefix}Error analyzing call:`, analysisError);
          }
        }

        return NextResponse.json({
          result: processedResult,
          analysis,
          functionType: 'read',
          executionTrace: {
            functionName,
            address: evmAddress,
            parameters: parameters || [],
            callType: 'eth_call'
          }
        });
      } catch (jsonRpcError: any) {
        console.warn(`${logPrefix}Read call failed:`, jsonRpcError.message);

        // Check if this is a contract revert
        const isContractRevert = jsonRpcError.code === 'CONTRACT_REVERT' ||
                                 jsonRpcError.message.includes('revert') ||
                                 jsonRpcError.message.includes('REVERT');

        // Get a clean error message without technical details
        let userFriendlyError = jsonRpcError.message;
        let suggestion = '';

        if (isContractRevert) {
          // Extract the revert reason for user display
          const revertReason = jsonRpcError.revertReason ||
            (jsonRpcError.message.includes('revert') ?
              jsonRpcError.message.match(/revert(?:ed)?:?\s*(.*?)($|\s\()/i)?.[1]?.trim() :
              'Contract execution reverted');

          // Depending on the revert reason, provide more specific guidance
          if (revertReason.includes('out of bounds') || revertReason.includes('invalid index')) {
            userFriendlyError = `The parameter you provided is out of range.`;
            suggestion = `This could happen if you're requesting a non-existent item (like proposal #${parameters?.[0] || 'X'} when there are fewer proposals).`;
          } else if (revertReason.includes('not owner') || revertReason.includes('unauthorized') || revertReason.includes('caller is not')) {
            userFriendlyError = `This operation requires specific permissions that your account doesn't have.`;
            suggestion = 'This function is likely restricted to the contract owner or an admin role.';
          } else if (revertReason.includes('insufficient') || revertReason.includes('exceeds balance')) {
            userFriendlyError = `Insufficient balance for this operation.`;
            suggestion = 'Check that you have enough tokens/balance to perform this action.';
          } else if (revertReason.includes('paused')) {
            userFriendlyError = `This contract is currently paused.`;
            suggestion = 'The contract has a pause mechanism that is currently active. Try again later or contact the contract owner.';
          } else if (revertReason.includes('deadline') || revertReason.includes('expired')) {
            userFriendlyError = `The operation deadline has expired.`;
            suggestion = 'This transaction has a time limit that has passed. Try again with a new deadline.';
          } else if (revertReason.includes('already') || revertReason.includes('exists')) {
            userFriendlyError = `This operation cannot be completed because the item already exists or the action was already performed.`;
          } else if (revertReason.includes('zero address')) {
            userFriendlyError = `Invalid address: cannot use the zero address.`;
            suggestion = 'Provide a valid non-zero address for this parameter.';
          } else {
            userFriendlyError = `Function call reverted: ${revertReason}`;

            // Check for common error patterns in the revert reason
            if (revertReason.toLowerCase().includes('invalid')) {
              suggestion = 'Check that your input parameters are in the correct format.';
            } else if (revertReason.toLowerCase().includes('not found')) {
              suggestion = 'The requested item or resource does not exist in the contract.';
            }
          }
        } else if (jsonRpcError.message.includes('gas')) {
          userFriendlyError = 'Transaction failed due to gas estimation or gas limit issues.';
          suggestion = 'This function may require more gas than expected. Try increasing the gas limit in your wallet.';
        } else if (jsonRpcError.message.includes('execution timeout')) {
          userFriendlyError = 'The function execution timed out.';
          suggestion = 'This function may be too complex or the network is congested. Try again later.';
        }

        // Return a more user-friendly error message
        return NextResponse.json({
          error: userFriendlyError,
          errorType: 'READ_CALL_FAILED',
          errorDetails: {
            message: jsonRpcError.message,
            isRevert: isContractRevert,
            requestId: jsonRpcError.requestId || 'unknown'
          },
          // Provide a suggestion based on the error or function type
          suggestion: suggestion || (functionName.startsWith('get') ?
            "This function appears to be a getter but it may modify state. Try running it as a write function." :
            undefined)
        }, { status: 400 });
      }
    }

    // For write functions (or if read attempt fails), execute a transaction

    // Try first with JSON-RPC for consistency
    try {
      console.log(`${logPrefix}Calling write function via HashIO JSON-RPC`);
      const result = await callContractViaJsonRpc(evmAddress, functionName, parameters || [], false);
      console.log(`${logPrefix}HashIO write call successful:`, result);

      // For convenience, if this was a "getter" that was called as a write function
      // (common with functions like "getProposalCount" that modify state but return a value)
      let returnValue;
      let txData = null;

      // Check if the function name suggests it's a getter function
      const isGetterFunction =
        functionName.startsWith('get') ||
        (functionAbi && functionAbi.outputs && functionAbi.outputs.length > 0);

      if (isGetterFunction || returnResult) {
        // Try to extract the return value from the transaction receipt
        try {
          if (typeof result === 'object' && result.transactionHash) {
            // Use proper transaction polling instead of arbitrary timeout
            let receipt = null;
            let attempts = 0;
            const maxAttempts = 10;

            while (!receipt && attempts < maxAttempts) {
              attempts++;
              console.log(`Polling for transaction receipt: attempt ${attempts}/${maxAttempts}`);

              // Query for transaction receipt and logs
              receipt = await executeJsonRpcCall('eth_getTransactionReceipt', [result.transactionHash]);

              if (!receipt && attempts < maxAttempts) {
                // Exponential backoff with max wait time of ~2 seconds
                const backoffTime = Math.min(500 * Math.pow(1.5, attempts-1), 2000);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
              }
            }

            if (receipt) {
              txData = receipt;

              // Extract return value if available
              if (txData && txData.logs && txData.logs.length > 0) {
                returnValue = txData.logs[0].data;
              }
            } else {
              console.warn(`${logPrefix}Transaction receipt not available after multiple attempts`);
            }
          }
        } catch (receiptError) {
          console.warn(`${logPrefix}Could not get transaction receipt:`, receiptError);
        }
      }

      // Decode the transaction input if requested
      let inputAnalysis = null;
      if (includeInputAnalysis && result.transactionHash && abi && Array.isArray(abi)) {
        try {
          inputAnalysis = await decodeTransactionInput(result.transactionHash, abi);
        } catch (analysisError) {
          console.warn(`${logPrefix}Error analyzing transaction input:`, analysisError);
        }
      }

      // Return both the transaction result and any extracted return value
      return NextResponse.json({
        result: result.status || 'SUCCESS',
        returnValue,
        txData,
        transactionHash: result.transactionHash,
        inputAnalysis,
        functionType: 'write',
        executionTrace: {
          functionName,
          address: evmAddress,
          parameters: parameters || [],
          callType: 'eth_sendTransaction',
          gasUsed: txData?.gasUsed || 'unknown'
        }
      });
    } catch (jsonRpcError: any) {
      console.warn(`${logPrefix}HashIO write call failed:`, jsonRpcError.message);

      // Fall back to Hedera SDK
      try {
        console.log(`${logPrefix}Falling back to Hedera SDK for state-changing operation`);

        // Validate Hedera credentials
        const validation = validateHederaCredentials();
        if (!validation.isValid) {
          return NextResponse.json({
            error: validation.message,
            errorType: 'CREDENTIAL_ERROR'
          }, { status: 400 });
        }

        const { operatorId, operatorKey } = getHederaCredentials();

        // Convert parameters to Hedera SDK format
        const hederaParams = parameters?.map((param: any) => {
          return {
            type: typeof param === 'object' && param.type ? param.type : typeof param,
            value: typeof param === 'object' && param.value !== undefined ? param.value : param
          };
        }) || [];

        // Execute the contract transaction using Hedera SDK
        console.log(`${logPrefix}Executing contract transaction via Hedera SDK with params:`, hederaParams);

        const txResult = await executeContractTransaction(
          contractAddress,
          functionName,
          hederaParams,
          operatorId,
          operatorKey
        );

        console.log(`${logPrefix}Hedera transaction successful:`, txResult);

        return NextResponse.json({
          result: "SUCCESS",
          txId: txResult,
          functionType: 'write',
          executionMethod: 'hedera-sdk',
          executionTrace: {
            functionName,
            contractId: contractAddress,
            parameters: hederaParams,
            callType: 'ContractExecuteTransaction'
          }
        });
      } catch (hederaError: any) {
        console.error(`${logPrefix}Both JSON-RPC and Hedera SDK calls failed:`, hederaError);

        return NextResponse.json({
          error: `Transaction failed: ${hederaError.message || jsonRpcError.message}`,
          errorType: 'TRANSACTION_FAILED'
        }, { status: 400 });
      }
    }
  } catch (error: any) {
    const logPrefix = `[${requestId || 'unknown_req'}] `; // Ensure logPrefix is available in catch
    console.error(`${logPrefix}Unhandled error in /api/call-contract:`, error);
    // Ensure a consistent error response format
    return NextResponse.json({ 
      error: 'An unexpected server error occurred.', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Call a contract function via HashIO JSON-RPC
 */
async function callContractViaJsonRpc(
  contractAddress: string,
  functionName: string,
  parameters: any[],
  isQuery: boolean
) {
  try {
    // Ensure the address has 0x prefix
    const address = contractAddress.startsWith('0x') ? contractAddress : `0x${contractAddress}`;

    // Encode function signature and parameters to create calldata
    const calldata = encodeFunctionSignature(functionName, parameters);

    if (isQuery) {
      // For read functions, use eth_call
      const callObject = {
        to: address,
        data: calldata
      };

      // Execute the call
      const result = await executeJsonRpcCall('eth_call', [callObject, 'latest']);
      return result;
    } else {
      // For write functions, need to get the nonce and gas price first
      // Use the test account - for now we don't support real transactions from user accounts
      // Just use the Hedera test account private key

      // The sender address derived from the test account private key
      // TODO: Replace with a proper wallet/account mechanism
      const senderAddress = process.env.HEDERA_TEST_ACCOUNT_ADDRESS || '0x67D8d32E9Bf1a9968a5ff53B87d777Aa8EBBEe69';

      // Get current gas price
      const gasPrice = await executeJsonRpcCall('eth_gasPrice', []);

      // Get current nonce for sender
      const nonce = await executeJsonRpcCall('eth_getTransactionCount', [senderAddress, 'latest']);

      // Create transaction object
      const txObject = {
        from: senderAddress,
        to: address,
        data: calldata,
        gasPrice,
        gas: '0x7A120', // 500,000 gas
        nonce
      };

      // Sign and send transaction
      // This is a dummy implementation - we should use proper wallet signing
      // For now, we just send the transaction object and hope the RPC will handle it
      // This will only work if the RPC endpoint has the private key for senderAddress
      const txHash = await executeJsonRpcCall('eth_sendTransaction', [txObject]);

      // Wait for the transaction to be mined
      const receipt = await withRetry(
        async () => {
          const rec = await executeJsonRpcCall('eth_getTransactionReceipt', [txHash]);
          if (!rec) throw new Error('Receipt not available');
          return rec;
        },
        5, // retry 5 times
        2000 // 2 seconds between retries
      );

      return {
        transactionHash: txHash,
        ...receipt
      };
    }
  } catch (error: any) {
    logError('JSON-RPC contract call error', error);
    throw new Error(error.message || 'Failed to call contract via JSON-RPC');
  }
}

/**
 * Encode the function parameters for the contract call
 */
function encodeParameters(parameters: any[]): string {
  if (!parameters || parameters.length === 0) {
    return '0x';
  }

  try {
    // Basic encoding - this is a simplified version
    // In a real application, we should use ethers to properly encode all parameter types

    // Just concatenate all parameters for now
    let encoded = '';

    parameters.forEach(param => {
      if (typeof param === 'string') {
        // If it's already a hex string with 0x prefix, use it directly
        if (param.startsWith('0x')) {
          encoded += param.slice(2);
        } else {
          // Otherwise convert to hex
          const hex = Buffer.from(param).toString('hex');
          encoded += hex;
        }
      } else if (typeof param === 'number') {
        // Convert number to hex and pad to 32 bytes
        const hex = param.toString(16);
        encoded += hex.padStart(64, '0');
      } else if (typeof param === 'boolean') {
        // Convert boolean to 0 or 1 and pad
        encoded += (param ? '1' : '0').padStart(64, '0');
      } else {
        // Default case - convert to string
        const hex = Buffer.from(String(param)).toString('hex');
        encoded += hex;
      }
    });

    return `0x${encoded}`;
  } catch (error) {
    console.error('Error encoding parameters:', error);
    return '0x';
  }
}

/**
 * Generate the function signature and encode it with parameters
 */
function encodeFunctionSignature(functionName: string, parameters: any[]): string {
  try {
    // Check if we have a full function signature with parameter types
    // e.g., "transfer(address,uint256)"
    if (functionName.includes('(') && functionName.includes(')')) {
      // Extract just the function name
      const baseName = functionName.split('(')[0].trim();
      // Extract the parameter types
      const paramTypesStr = functionName.match(/\((.*)\)/)?.[1] || '';
      const paramTypes = paramTypesStr.split(',').filter(p => p.trim());

      // Create an interface with this function
      const iface = new ethers.utils.Interface([`function ${functionName}`]);

      // Encode the function call
      const encodedData = iface.encodeFunctionData(baseName, parameters);
      return encodedData;
    }

    // Handle the case where we just have a function name without parameter types
    // Use a simple approximation based on the number of parameters

    // Create parameter type strings based on the actual parameter values
    const paramTypes = parameters.map(param => {
      if (typeof param === 'string') {
        // Check if it's an address (0x followed by 40 hex chars)
        if (/^0x[0-9a-fA-F]{40}$/.test(param)) {
          return 'address';
        }
        return 'string';
      } else if (typeof param === 'number') {
        return 'uint256';
      } else if (typeof param === 'boolean') {
        return 'bool';
      } else {
        return 'string';
      }
    });

    // Create the function signature
    const signature = `${functionName}(${paramTypes.join(',')})`;

    // Hash the signature to get the function selector (first 4 bytes)
    const selector = ethers.utils.id(signature).slice(0, 10);

    // For simple cases, try to use ethers.js for encoding
    try {
      const iface = new ethers.utils.Interface([`function ${signature}`]);
      return iface.encodeFunctionData(functionName, parameters);
    } catch {
      // Fallback to a basic encoding
      const encodedParams = encodeParameters(parameters);
      if (encodedParams === '0x') {
        return selector;
      }
      return selector + encodedParams.slice(2);
    }
  } catch (error) {
    console.error('Error encoding function signature:', error);
    // Last resort: just hash the function name
    return ethers.utils.id(functionName).slice(0, 10);
  }
}

/**
 * Execute a contract transaction using the Hedera SDK
 */
async function executeContractTransaction(
  contractAddress: string,
  functionName: string,
  parameters: Array<{ type: string; value: any }>,
  operatorId: string,
  operatorKey: string
): Promise<string> {
  try {
    console.log('Executing contract transaction via Hedera SDK');
    console.log('Contract ID:', contractAddress);
    console.log('Function:', functionName);
    console.log('Parameters:', parameters);

    // Initialize the Hedera client
    const client = await initializeClient(operatorId, operatorKey);

    // Format the contract ID correctly for the SDK
    const formattedContractId = formatContractId(contractAddress);

    // Build the function parameters
    const functionParams = new ContractFunctionParameters();

    // Add parameters in order
    parameters.forEach(param => {
      const { type, value } = param;

      // Handle common parameter types
      // This is simplified - a real implementation would handle all types
      if (type === 'address' || type.includes('address')) {
        functionParams.addAddress(value);
      } else if (type === 'string' || type.includes('string')) {
        functionParams.addString(value);
      } else if (type === 'bool' || type.includes('bool')) {
        functionParams.addBool(value === true || value === 'true');
      } else if (type.includes('int') || type.includes('uint')) {
        // For numbers, handle different sizes
        if (type.includes('8')) {
          functionParams.addUint8(Number(value));
        } else if (type.includes('16')) {
          functionParams.addUint16(Number(value));
        } else if (type.includes('32')) {
          functionParams.addUint32(Number(value));
        } else if (type.includes('64')) {
          functionParams.addUint64(Number(value));
        } else {
          // Default to uint256
          functionParams.addUint256(value.toString());
        }
      } else {
        // Default case, try as string
        functionParams.addString(String(value));
      }
    });

    // Create the contract transaction
    let transaction = new ContractExecuteTransaction()
      .setContractId(formattedContractId)
      .setGas(1000000) // Set appropriate gas limit
      .setFunction(functionName, functionParams);

    // Set a higher max fee to avoid INSUFFICIENT_TX_FEE errors
    transaction = transaction.setMaxTransactionFee(new Hbar(5)); // 5 HBAR max fee

    // Convert operator key string to PrivateKey object
    const privateKey = PrivateKey.fromString(operatorKey);

    // Sign and execute the transaction
    const signedTx = await transaction.freezeWith(client).sign(privateKey);
    const response = await signedTx.execute(client);

    // Get the receipt to check status
    const receipt = await response.getReceipt(client);

    console.log('Transaction executed with status:', receipt.status.toString());

    return response.transactionId.toString();
  } catch (error: any) {
    console.error('Error executing contract transaction:', error);

    // Improve error messages for common errors
    if (error.message.includes('CONTRACT_REVERT_EXECUTED')) {
      throw new Error(`The function '${functionName}' reverted. Check parameters and permissions.`);
    }

    throw error;
  }
}

/**
 * Parse parameter types from a function signature
 */
function parseParameterTypes(signature: string): string[] {
  try {
    // Extract the parameter types from a signature like 'transfer(address,uint256)'
    const match = signature.match(/\((.*)\)/);
    if (match && match[1]) {
      // Split by comma, but respect nested types
      const types: string[] = [];
      let currentType = '';
      let nestLevel = 0;

      for (let i = 0; i < match[1].length; i++) {
        const char = match[1][i];

        if (char === '(' || char === '[' || char === '{') {
          nestLevel++;
          currentType += char;
        } else if (char === ')' || char === ']' || char === '}') {
          nestLevel--;
          currentType += char;
        } else if (char === ',' && nestLevel === 0) {
          // Only split on commas at the top level
          if (currentType) {
            types.push(currentType.trim());
            currentType = '';
          }
        } else {
          currentType += char;
        }
      }

      // Add the last type if there is one
      if (currentType) {
        types.push(currentType.trim());
      }

      return types;
    }
    return [];
  } catch {
    return [];
  }
}