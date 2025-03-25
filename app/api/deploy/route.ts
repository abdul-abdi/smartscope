import { NextResponse } from 'next/server';
import {
  PrivateKey,
  FileCreateTransaction,
  ContractCreateTransaction,
  Hbar
} from '@hashgraph/sdk';
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
const DEFAULT_GAS_LIMIT = 500000;

export async function POST(request: Request) {
  try {
    // Get bytecode and ABI from request
    const { bytecode, abi, deploymentId } = await request.json();

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
    
    // Optimize the bytecode for deployment
    const preparedContract = prepareContractForDeployment(bytecode, abi);
    const bytecodeForDeployment = preparedContract.bytecode;
    const bytecodeHex = bytecodeForDeployment.startsWith('0x') ? bytecodeForDeployment.slice(2) : bytecodeForDeployment;
    
    // Calculate size to determine deployment approach
    const bytecodeSizeInBytes = Buffer.from(bytecodeHex, 'hex').length;
    
    // Generate a deployment ID if not provided
    const actualDeploymentId = deploymentId || `deployment-${Date.now()}`;
    
    // For large contracts, use direct deployment but with a smaller gas limit
    // This avoids the file service chunking which is problematic on Vercel
    if (bytecodeSizeInBytes > 32 * 1024) { // If larger than 32KB
      console.log(`Large contract detected (${bytecodeSizeInBytes} bytes). Using direct deployment with optimized gas settings.`);
      
      // Return information for client-side handling of large contract
      return NextResponse.json({
        deploymentId: actualDeploymentId,
        bytecodeSize: bytecodeSizeInBytes,
        isLarge: true,
        message: "Contract exceeds recommended size for single-step deployment. Use the large contract deployment endpoint.",
        nextStep: "/api/direct-deploy",
        optimizedSize: preparedContract.size.optimized,
        originalSize: preparedContract.size.original,
        savingsPercent: preparedContract.size.savingsPercent
      });
    }
    
    // For smaller contracts, use direct deployment approach
    return await withRetry(() => deployContractDirect(
      bytecodeForDeployment, 
      abi, 
      operatorId, 
      operatorKey,
      preparedContract
    ));
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

async function deployContractDirect(bytecode: string, abi: any, operatorId: string, operatorKey: string, preparedContract: any) {
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

    // Create the contract function call
    const contractCreateTx = new ContractCreateTransaction()
      .setGas(contractGas)
      .setBytecode(Buffer.from(bytecodeHex, 'hex'))
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(client);
    
    const contractCreateSign = await contractCreateTx.sign(privateKey);
    const contractCreateSubmit = await contractCreateSign.execute(client);
    
    // Get the contract ID
    try {
      const contractReceipt = await contractCreateSubmit.getReceipt(client);
      const contractId = contractReceipt.contractId;
      
      console.log(`Successfully deployed contract with ID: ${contractId?.toString()}`);
      
      // Return successful response with contract details
      return NextResponse.json({
        contractId: contractId?.toString(),
        contractAddress: contractId?.toSolidityAddress(),
        abi,
        metadata: preparedContract.metadata,
        optimization: {
          originalSize: preparedContract.size.original,
          optimizedSize: preparedContract.size.optimized,
          savingsPercent: preparedContract.size.savingsPercent
        }
      });
    } catch (receiptError) {
      console.error("Contract deployment failed during receipt retrieval:", receiptError);
      // Extract meaningful error from Hedera response
      const errorMessage = extractHederaErrorMessage(receiptError);
      throw new Error(`Contract deployment failed: ${errorMessage}`);
    }
  } catch (error: any) {
    logError('Error in deployContractDirect', error, { operatorId });
    throw error;
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
      
      return `Error deploying contract: ${errorStatus}`;
    }
  }
  
  return error.message || 'Unknown error during contract deployment';
} 