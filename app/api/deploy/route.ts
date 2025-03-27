import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractCreateFlow, ContractFunctionParameters, AccountId, PrivateKey, Long } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { 
  getHederaCredentials, 
  initializeClient, 
  validateHederaCredentials 
} from '../../utils/hedera';
import { 
  withRetry, 
  logError, 
  prepareContractForDeployment,
  recombineContractBytecodeAndMetadata
} from '../../utils/helpers';

// Load environment variables
dotenv.config();

// Default gas limit for contract deployment
const DEFAULT_GAS_LIMIT = 4000000;

// Environment variables for Hedera network access
const operatorId = process.env.HEDERA_OPERATOR_ID;
const operatorKey = process.env.HEDERA_OPERATOR_KEY;
const networkName = process.env.HEDERA_NETWORK || 'testnet';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { bytecode, abi, constructorArgs = [], deploymentId } = await request.json();
    
    // Validate required fields
    if (!bytecode) {
      return NextResponse.json(
        { error: 'Bytecode is required' },
        { status: 400 }
      );
    }
    
    // Create Hedera client
    if (!operatorId || !operatorKey) {
      return NextResponse.json(
        { error: 'Hedera credentials not configured' },
        { status: 500 }
      );
    }
    
    const client = Client.forName(networkName);
    client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
    
    // Setup the contract create transaction
    let contractCreateTx = new ContractCreateFlow()
      .setGas(1000000)
      .setBytecode(bytecode);
    
    // Add constructor parameters if any
    if (constructorArgs.length > 0) {
      // Find constructor definition from ABI
      const constructorDef = abi.find(item => item.type === 'constructor');
      if (constructorDef) {
        // Create parameters object
        let params = new ContractFunctionParameters();
        
        // Add each parameter according to its type
        constructorDef.inputs.forEach((input: any, index: number) => {
          const value = constructorArgs[index];
          switch (input.type) {
            case 'string':
              params = params.addString(value);
              break;
            case 'address':
              params = params.addAddress(value);
              break;
            case 'bool':
              params = params.addBool(Boolean(value));
              break;
            case 'uint8':
              params = params.addUint8(Number(value));
              break;
            case 'uint16':
              params = params.addUint16(Number(value));
              break;
            case 'uint32':
              params = params.addUint32(Number(value));
              break;
            case 'uint64':
              // Convert BigInt to Long for Hedera SDK
              params = params.addUint64(Long.fromString(value.toString()));
              break;
            case 'uint256':
              // Convert BigInt to string for Hedera SDK
              params = params.addUint256(value.toString());
              break;
            case 'int8':
              params = params.addInt8(Number(value));
              break;
            case 'int16':
              params = params.addInt16(Number(value));
              break;
            case 'int32':
              params = params.addInt32(Number(value));
              break;
            case 'int64':
              // Convert BigInt to Long for Hedera SDK
              params = params.addInt64(Long.fromString(value.toString()));
              break;
            case 'int256':
              // Convert BigInt to string for Hedera SDK
              params = params.addInt256(value.toString());
              break;
            case 'bytes32':
              params = params.addBytes32(value);
              break;
            // Add more types as needed
            default:
              if (input.type.includes('[]')) {
                // Handle array types - only support string arrays and address arrays
                // which are the most common in constructor params
                if (input.type === 'string[]') {
                  params = params.addStringArray(value);
                } else if (input.type === 'address[]') {
                  params = params.addAddressArray(value);
                } else {
                  console.warn(`Array type ${input.type} not directly supported. Converting to bytes.`);
                  // Fallback to bytes for unsupported array types
                  const bytesValue = Buffer.from(JSON.stringify(value));
                  params = params.addBytes(bytesValue);
                }
              } else {
                console.warn(`Unsupported parameter type: ${input.type}`);
                // Default to bytes for unknown types
                params = params.addBytes(Buffer.from(value.toString()));
              }
          }
        });
        
        // Set constructor parameters
        contractCreateTx = contractCreateTx.setConstructorParameters(params);
      }
    }
    
    // Execute the contract create transaction
    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    
    // Get the new contract ID
    const contractId = contractCreateRx.contractId;
    
    if (!contractId) {
      throw new Error('Failed to get contract ID from receipt');
    }
    
    // Convert contract ID to Solidity address format
    const contractAddress = contractId.toSolidityAddress();
    
    return NextResponse.json({
      contractId: contractId.toString(),
      contractAddress: contractAddress,
      transactionId: contractCreateSubmit.transactionId.toString(),
      message: 'Contract deployed successfully'
    });
  } catch (error) {
    console.error('Error deploying contract:', error);
    
    // Provide a friendly error message based on the error type
    let errorMessage = 'Failed to deploy contract';
    
    if (error instanceof Error) {
      if (error.message.includes('INSUFFICIENT_GAS')) {
        errorMessage = 'Deployment failed due to insufficient gas. Try increasing the gas limit.';
      } else if (error.message.includes('CONTRACT_REVERT_EXECUTED')) {
        errorMessage = 'Contract deployment reverted. Check your constructor logic.';
      } else if (error.message.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
        errorMessage = 'Insufficient account balance to deploy the contract.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Calculate appropriate gas limit based on bytecode size
 */
function calculateGasLimit(bytecodeLength: number): number {
  // Base gas plus additional gas per byte of bytecode
  // These numbers are rough estimates and may need adjustment
  const baseGas = 1000000;
  const gasPerByte = 100;
  
  const calculatedGas = baseGas + (bytecodeLength / 2) * gasPerByte; // Divide by 2 because 2 hex chars = 1 byte
  
  // Minimum and maximum gas limits
  const minGas = DEFAULT_GAS_LIMIT;
  const maxGas = 15000000;
  
  return Math.min(maxGas, Math.max(minGas, Math.ceil(calculatedGas)));
}

/**
 * Extract a useful error message from Hedera error responses
 */
function extractHederaErrorMessage(error: any): string {
  // Check if it's a receipt status error
  if (error.message && error.message.includes('receipt for transaction')) {
    const statusMatch = error.message.match(/error status (.+?)($|\s)/);
    if (statusMatch && statusMatch[1]) {
      const errorStatus = statusMatch[1];
      
      // Map common error codes to user-friendly messages
      const errorMap: Record<string, string> = {
        'CONTRACT_REVERT_EXECUTED': 'Smart contract execution reverted',
        'ERROR_DECODING_BYTESTRING': 'Error decoding contract bytecode. This usually indicates the bytecode is corrupted or too large.',
        'CONTRACT_EXECUTION_EXCEPTION': 'Exception during contract execution',
        'INSUFFICIENT_GAS': 'Not enough gas provided for contract deployment',
        'LOCAL_CALL_MODIFICATION_EXCEPTION': 'Contract attempted to modify state during static call',
        'INVALID_FILE_ID': 'The file ID provided for the contract bytecode is invalid',
        'INSUFFICIENT_ACCOUNT_BALANCE': 'Insufficient account balance to execute transaction'
      };
      
      if (errorMap[errorStatus]) {
        return `${errorMap[errorStatus]} (${errorStatus})`;
      }
      
      return `Error deploying contract: ${errorStatus}`;
    }
  }
  
  return error.message || 'Unknown error during contract deployment';
} 