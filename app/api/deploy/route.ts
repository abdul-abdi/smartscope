import { NextResponse } from 'next/server';
import {
  PrivateKey,
  FileCreateTransaction,
  ContractCreateTransaction,
  FileAppendTransaction
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { 
  getHederaCredentials, 
  initializeClient, 
  validateHederaCredentials 
} from '../../utils/hedera';
import { withRetry, logError } from '../../utils/helpers';

// Load environment variables
dotenv.config();

// Maximum chunk size for Hedera file service (in bytes)
const MAX_CHUNK_SIZE = 1024;

// Default gas limit for contract deployment
const DEFAULT_GAS_LIMIT = 500000; // Increased from 100000 to handle larger contracts

export async function POST(request: Request) {
  try {
    // Get bytecode and ABI from request
    const { bytecode, abi } = await request.json();

    if (!bytecode) {
      return NextResponse.json({ error: 'Missing bytecode' }, { status: 400 });
    }

    // Validate Hedera credentials before proceeding
    const validation = validateHederaCredentials();
    if (!validation.isValid) {
      logError('Credential validation failed', { message: validation.message }, { bytecodeLength: bytecode.length });
      return NextResponse.json({ 
        error: validation.message,
        errorType: 'CREDENTIAL_ERROR'
      }, { status: 400 });
    }

    // Get Hedera credentials
    const { operatorId, operatorKey } = getHederaCredentials();
    
    // Use withRetry to handle transient errors
    return await withRetry(() => deployContract(bytecode, abi, operatorId, operatorKey));
  } catch (error: any) {
    logError('Error deploying contract', error, { route: 'deploy' });
    
    // Provide more specific error messages based on error type
    if (error.message.includes('PAYER_ACCOUNT_NOT_FOUND')) {
      return NextResponse.json({
        error: 'The Hedera account specified in your environment variables was not found. Please check your HEDERA_OPERATOR_ID and ensure it exists on the network.',
        errorCode: 'PAYER_ACCOUNT_NOT_FOUND',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Error deploying contract',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function deployContract(bytecode: string, abi: any, operatorId: string, operatorKey: string) {
  try {
    // Create Hedera client using utility function
    const client = await initializeClient(operatorId, operatorKey);
    
    // Create the private key object for signing transactions
    const privateKey = PrivateKey.fromStringED25519(operatorKey);

    // Validate bytecode
    let bytecodeHex = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    
    // Verify bytecode is valid hex
    if (!/^[0-9a-fA-F]+$/.test(bytecodeHex)) {
      throw new Error("Invalid bytecode format. Expected hexadecimal string.");
    }
    
    // Log bytecode size for debugging
    console.log(`Bytecode size: ${bytecodeHex.length} bytes (${Math.ceil(bytecodeHex.length/2/1024)} KB)`);
    
    // Calculate gas based on bytecode size
    const contractGas = calculateGasLimit(bytecodeHex.length);
    console.log(`Using gas limit: ${contractGas}`);

    // If bytecode is too large for a single transaction, we'll use the file service
    if (bytecodeHex.length > 2 * MAX_CHUNK_SIZE) {
      console.log(`Bytecode too large for direct deployment. Using file service with ${Math.ceil(bytecodeHex.length / MAX_CHUNK_SIZE)} chunks.`);
      
      // Create a file on Hedera and store the bytecode
      const fileCreateTx = new FileCreateTransaction()
        .setKeys([privateKey])
        .freezeWith(client);
      
      const fileCreateSign = await fileCreateTx.sign(privateKey);
      const fileCreateSubmit = await fileCreateSign.execute(client);
      const fileCreateRx = await fileCreateSubmit.getReceipt(client);
      const bytecodeFileId = fileCreateRx.fileId;
      
      if (!bytecodeFileId) {
        throw new Error("Failed to create file for bytecode");
      }
      
      console.log(`The bytecode file ID is: ${bytecodeFileId}`);

      // Append contents to the file
      const fileChunks = Math.ceil(bytecodeHex.length / MAX_CHUNK_SIZE);
      
      // Process chunks with proper validation and error handling
      for (let i = 0; i < fileChunks; i++) {
        const chunk = bytecodeHex.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
        
        try {
          const chunkBuffer = Buffer.from(chunk, 'hex');
          
          const fileAppendTx = await new FileAppendTransaction()
            .setFileId(bytecodeFileId)
            .setContents(chunkBuffer)
            .freezeWith(client);
          
          const fileAppendSign = await fileAppendTx.sign(privateKey);
          const fileAppendSubmit = await fileAppendSign.execute(client);
          await fileAppendSubmit.getReceipt(client);
          
          console.log(`Appended chunk ${i+1}/${fileChunks} to file (${chunk.length/2} bytes)`);
        } catch (chunkError) {
          console.error(`Error appending chunk ${i+1}/${fileChunks}:`, chunkError);
          throw new Error(`Failed to append chunk ${i+1}/${fileChunks}: ${chunkError.message}`);
        }
      }

      // Create the contract using the file
      const contractTx = await new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(contractGas)
        .freezeWith(client);
      
      const contractSign = await contractTx.sign(privateKey);
      const contractSubmit = await contractSign.execute(client);
      
      // Handle potential error in contract creation with better error reporting
      try {
        const contractReceipt = await contractSubmit.getReceipt(client);
        const contractId = contractReceipt.contractId;
        
        console.log(`Successfully deployed contract with ID: ${contractId?.toString()}`);
        
        return NextResponse.json({
          contractId: contractId?.toString(),
          contractAddress: contractId?.toSolidityAddress(),
          abi
        });
      } catch (receiptError) {
        console.error("Contract deployment failed during receipt retrieval:", receiptError);
        // Extract meaningful error from Hedera response
        const errorMessage = extractHederaErrorMessage(receiptError);
        throw new Error(`Contract deployment failed: ${errorMessage}`);
      }
    } else {
      // For smaller contracts, we can deploy directly
      console.log("Deploying contract directly (bytecode small enough)");
      
      // Create the contract function call
      const contractCreateTx = new ContractCreateTransaction()
        .setGas(contractGas)
        .setBytecode(Buffer.from(bytecodeHex, 'hex'))
        .freezeWith(client);
      
      const contractCreateSign = await contractCreateTx.sign(privateKey);
      const contractCreateSubmit = await contractCreateSign.execute(client);
      
      // Get the contract ID
      try {
        const contractReceipt = await contractCreateSubmit.getReceipt(client);
        const contractId = contractReceipt.contractId;
        
        console.log(`Successfully deployed contract with ID: ${contractId?.toString()}`);
        
        return NextResponse.json({
          contractId: contractId?.toString(),
          contractAddress: contractId?.toSolidityAddress(),
          abi
        });
      } catch (receiptError) {
        console.error("Contract deployment failed during receipt retrieval:", receiptError);
        // Extract meaningful error from Hedera response
        const errorMessage = extractHederaErrorMessage(receiptError);
        throw new Error(`Contract deployment failed: ${errorMessage}`);
      }
    }
  } catch (error: any) {
    logError('Error in deployContract', error, { operatorId });
    return NextResponse.json(
      { error: error.message || 'Error deploying contract' },
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
  const baseGas = 100000;
  const gasPerByte = 10;
  
  const calculatedGas = baseGas + (bytecodeLength / 2) * gasPerByte; // Divide by 2 because 2 hex chars = 1 byte
  
  // Minimum and maximum gas limits
  const minGas = DEFAULT_GAS_LIMIT;
  const maxGas = 1000000; // 1 million gas
  
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
      
      return `Deployment failed with status: ${errorStatus}`;
    }
  }
  
  // Fall back to the original error message
  return error.message || 'Unknown deployment error';
} 