import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
import { 
  AccountId, 
  Client, 
  FileCreateTransaction, 
  FileAppendTransaction, 
  ContractCreateTransaction, 
  ContractFunctionParameters, 
  Hbar, 
  PrivateKey,
  FileContentsQuery,
  TransactionReceipt
} from '@hashgraph/sdk';
import { 
  getHederaCredentials,
  initializeClient,
  validateHederaCredentials
} from '../../utils/hedera';
import { extractHederaErrorMessage, validateHexString } from '../../utils/helpers';
import { logError } from '../../utils/helpers';
// Define a local updateDeploymentStatus function
// This avoids importing the function as a route export

// Store deployment statuses in memory
// In a production app, you'd use a more persistent storage like Redis
const deploymentStatuses = new Map<string, {
  progress: number;
  stage: string;
  status: 'pending' | 'completed' | 'error';
  contractAddress?: string;
  error?: string;
  timestamp?: number;
}>();

// Local helper function to update deployment status
function updateDeploymentStatus(
  deploymentId: string, 
  data: {
    progress?: number;
    stage?: string;
    status?: 'pending' | 'completed' | 'error';
    contractAddress?: string;
    error?: string;
  }
): void {
  const currentStatus = deploymentStatuses.get(deploymentId) || {
    progress: 0,
    stage: 'Initializing',
    status: 'pending',
    timestamp: Date.now()
  };

  deploymentStatuses.set(deploymentId, {
    ...currentStatus,
    ...data,
    timestamp: Date.now()
  });
  
  // Log status update for debugging
  console.log(`Status update for ${deploymentId}:`, {
    ...currentStatus,
    ...data
  });
}

dotenv.config();

// Constants
const MAX_CHUNK_SIZE = 1024; // Maximum chunk size in bytes
const MAX_LOG_SIZE = 100; // Maximum number of characters to log for large data
const WAIT_BETWEEN_OPERATIONS = 1000; // ms to wait between operations

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const data = await req.json();
    const { 
      bytecode, 
      abi,
      constructorParams = [], 
      gas = 500000,
      network = 'testnet', 
      operatorId,
      operatorKey,
      fileOnly = false,
      existingFileId = null,
      deploymentId = 'deployment-123' // Accept a deployment ID from the client
    } = data;
    
    // Use the provided deployment ID or fallback
    const uniqueDeploymentId = deploymentId || `deployment-${Date.now()}`;
    console.log(`Received large contract deployment request with ID: ${uniqueDeploymentId}`);
    
    // Initial status update
    updateDeploymentStatus(uniqueDeploymentId, {
      progress: 10,
      stage: 'Processing bytecode',
      status: 'pending'
    });
    
    if (!bytecode) {
      updateDeploymentStatus(uniqueDeploymentId, {
        status: 'error',
        error: 'Bytecode is required'
      });
      return NextResponse.json({ 
        error: 'Bytecode is required' 
      }, { status: 400 });
    }
    
    // Validate bytecode format
    if (!validateHexString(bytecode)) {
      updateDeploymentStatus(uniqueDeploymentId, {
        status: 'error',
        error: 'Invalid bytecode format'
      });
      return NextResponse.json({ 
        error: 'Invalid bytecode format. Must be a valid hexadecimal string' 
      }, { status: 400 });
    }
    
    // Remove 0x prefix if present
    const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    
    // Calculate bytecode size
    const bytecodeBuffer = Buffer.from(cleanBytecode, 'hex');
    const bytecodeSizeInBytes = bytecodeBuffer.length;
    
    // Log bytecode details (truncated for large bytecode)
    console.log(`Bytecode size: ${bytecodeSizeInBytes} bytes`);
    console.log(`Clean bytecode prefix: ${cleanBytecode.substring(0, MAX_LOG_SIZE)}...`);
    
    updateDeploymentStatus(uniqueDeploymentId, {
      progress: 20,
      stage: 'Initializing Hedera client',
      status: 'pending'
    });
    
    // Use environment credentials if not provided
    const actualOperatorId = operatorId || process.env.HEDERA_OPERATOR_ID;
    const actualOperatorKey = operatorKey || process.env.HEDERA_OPERATOR_KEY;
    
    if (!actualOperatorId || !actualOperatorKey) {
      updateDeploymentStatus(uniqueDeploymentId, {
        status: 'error',
        error: 'Missing Hedera credentials'
      });
      return NextResponse.json({ 
        error: 'Missing Hedera credentials. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local or provide them in the request.' 
      }, { status: 400 });
    }
    
    // Initialize Hedera client
    let client: Client;
    
    try {
      // Use existing client initialization with our provided or env credentials
      client = await initializeClient(actualOperatorId, actualOperatorKey);
    } catch (error) {
      console.error('Error initializing client with credentials:', error);
      updateDeploymentStatus(uniqueDeploymentId, {
        status: 'error',
        error: 'Invalid operator credentials or connection error'
      });
      return NextResponse.json({ 
        error: 'Invalid operator credentials or connection error' 
      }, { status: 400 });
    }
    
    // Create the private key object for signing transactions
    const privateKey = PrivateKey.fromStringED25519(actualOperatorKey);
    
    // Prepare response data
    const result: any = {
      bytecodeSize: bytecodeSizeInBytes,
      chunking: bytecodeSizeInBytes > MAX_CHUNK_SIZE,
      deploymentMethod: bytecodeSizeInBytes > MAX_CHUNK_SIZE * 2 ? 'file' : 'direct',
    };
    
    let fileId = null;
    
    // If fileOnly is true or bytecode is too large, use file service
    if (fileOnly || bytecodeSizeInBytes > MAX_CHUNK_SIZE * 2 || existingFileId) {
      updateDeploymentStatus(uniqueDeploymentId, {
        progress: 30,
        stage: 'Creating file on Hedera',
        status: 'pending'
      });
      
      // If existing file ID is provided, use it
      if (existingFileId) {
        try {
          // Import missing FileId class
          const { FileId } = require('@hashgraph/sdk');
          fileId = FileId.fromString(existingFileId);
          console.log(`Using existing file ID: ${fileId.toString()}`);
          result.fileId = fileId.toString();
        } catch (error) {
          console.error('Error parsing existing file ID:', error);
          updateDeploymentStatus(uniqueDeploymentId, {
            status: 'error',
            error: `Invalid file ID format: ${existingFileId}`
          });
          return NextResponse.json({ 
            error: `Invalid file ID format: ${existingFileId}` 
          }, { status: 400 });
        }
      } else {
        // Create a new file - but start with an empty file
        try {
          // Create empty file first
          console.log(`Creating empty file for bytecode`);
          
          const createFileTransaction = new FileCreateTransaction()
            .setKeys([privateKey])
            .setMaxTransactionFee(new Hbar(5));
            
          const createFileResponse = await createFileTransaction
            .execute(client);
            
          const createFileReceipt = await createFileResponse.getReceipt(client);
          fileId = createFileReceipt.fileId;
          
          if (fileId === null) {
            throw new Error('File ID is null after file creation');
          }
          
          console.log(`File created with ID: ${fileId.toString()}`);
          result.fileId = fileId.toString();
          
          // Wait before next operation to avoid sequence issues
          await sleep(WAIT_BETWEEN_OPERATIONS);
          
          // Upload bytecode in chunks
          const numChunks = Math.ceil(bytecodeBuffer.length / MAX_CHUNK_SIZE);
          console.log(`Uploading bytecode in ${numChunks} chunks`);
          
          for (let i = 0; i < numChunks; i++) {
            const start = i * MAX_CHUNK_SIZE;
            const end = Math.min(start + MAX_CHUNK_SIZE, bytecodeBuffer.length);
            const chunk = bytecodeBuffer.slice(start, end);
            
            console.log(`Appending chunk ${i+1}/${numChunks} (${chunk.length} bytes)`);
            
            // Update deployment status
            updateDeploymentStatus(uniqueDeploymentId, {
              progress: Math.min(30 + Math.round(40 * (i + 1) / numChunks), 70),
              stage: `Uploading bytecode (${Math.round(100 * (i + 1) / numChunks)}%)`,
              status: 'pending'
            });
            
            const appendFileTransaction = new FileAppendTransaction()
              .setFileId(fileId)
              .setContents(chunk)
              .setMaxTransactionFee(new Hbar(5));
              
            const appendFileResponse = await appendFileTransaction
              .execute(client);
              
            await appendFileResponse.getReceipt(client);
            console.log(`Chunk ${i+1} appended successfully`);
            
            // Wait between append operations to avoid sequence issues
            if (i < numChunks - 1) {
              await sleep(WAIT_BETWEEN_OPERATIONS);
            }
          }
          
          console.log('All chunks appended successfully');
          
          // Verify file contents
          try {
            updateDeploymentStatus(uniqueDeploymentId, {
              progress: 75,
              stage: 'Verifying uploaded bytecode',
              status: 'pending'
            });
            
            // Wait before verification
            await sleep(WAIT_BETWEEN_OPERATIONS);
            
            console.log(`Verifying file contents for ${fileId.toString()}`);
            const fileContents = await new FileContentsQuery()
              .setFileId(fileId)
              .execute(client);
            
            console.log(`Retrieved file size: ${fileContents.length} bytes`);
            if (fileContents.length !== bytecodeBuffer.length) {
              console.warn(`File size mismatch: expected ${bytecodeBuffer.length} bytes, got ${fileContents.length} bytes`);
            }
          } catch (err) {
            console.warn('Verification failed, continuing anyway:', err);
          }
        } catch (error) {
          console.error('Error creating or appending to file:', error);
          const errorMessage = extractHederaErrorMessage(error) || 'File creation failed';
          updateDeploymentStatus(uniqueDeploymentId, {
            status: 'error',
            error: errorMessage
          });
          return NextResponse.json({ 
            error: errorMessage
          }, { status: 500 });
        }
      }
      
      // If only creating a file, return the file ID
      if (fileOnly) {
        updateDeploymentStatus(uniqueDeploymentId, {
          progress: 100,
          stage: 'File created successfully',
          status: 'completed'
        });
        return NextResponse.json({
          success: true,
          fileId: fileId?.toString(),
          bytecodeSize: bytecodeSizeInBytes
        });
      }
    }
    
    // Deploy the contract
    try {
      updateDeploymentStatus(uniqueDeploymentId, {
        progress: 80,
        stage: 'Creating contract on Hedera',
        status: 'pending'
      });
      
      // Final wait before contract creation
      await sleep(WAIT_BETWEEN_OPERATIONS);
      
      let contractTransaction;
      
      if (fileId) {
        // Deploy from file
        console.log(`Deploying contract from file ${fileId.toString()}`);
        
        contractTransaction = new ContractCreateTransaction()
          .setBytecodeFileId(fileId)
          .setGas(gas);
      } else {
        // Direct deployment (for smaller contracts)
        console.log('Deploying contract directly with bytecode');
        
        contractTransaction = new ContractCreateTransaction()
          .setBytecode(bytecodeBuffer)
          .setGas(gas);
      }
      
      // Add constructor parameters if any
      if (constructorParams && constructorParams.length > 0) {
        console.log(`Adding ${constructorParams.length} constructor parameters`);
        
        const params = new ContractFunctionParameters();
        
        // Process parameters
        for (const param of constructorParams) {
          const { type, value } = param;
          
          switch (type) {
            case 'string':
              params.addString(value);
              break;
            case 'address':
              params.addAddress(value);
              break;
            case 'uint256':
            case 'uint':
              params.addUint256(value);
              break;
            case 'int256':
            case 'int':
              params.addInt256(value);
              break;
            case 'bool':
              params.addBool(value === 'true' || value === true);
              break;
            default:
              console.warn(`Unsupported parameter type: ${type}`);
              break;
          }
        }
        
        contractTransaction.setConstructorParameters(params);
      }
      
      updateDeploymentStatus(uniqueDeploymentId, {
        progress: 90,
        stage: 'Finalizing contract deployment',
        status: 'pending'
      });
      
      // Execute transaction
      const contractResponse = await contractTransaction
        .setMaxTransactionFee(new Hbar(20))
        .execute(client);
      
      // Get receipt
      let contractReceipt: TransactionReceipt;
      try {
        contractReceipt = await contractResponse.getReceipt(client);
      } catch (receiptError) {
        console.error("Error getting receipt:", receiptError);
        
        // If ERROR_DECODING_BYTESTRING specifically, try using direct bytecode
        if (fileId && receiptError.toString().includes('ERROR_DECODING_BYTESTRING')) {
          console.log('Received ERROR_DECODING_BYTESTRING. Trying direct bytecode method as fallback...');
          
          updateDeploymentStatus(uniqueDeploymentId, {
            progress: 85,
            stage: 'Retrying with direct bytecode method',
            status: 'pending'
          });
          
          // Wait before retry
          await sleep(WAIT_BETWEEN_OPERATIONS);
          
          // Retry with direct bytecode
          const retryTransaction = new ContractCreateTransaction()
            .setBytecode(bytecodeBuffer)
            .setGas(gas)
            .setMaxTransactionFee(new Hbar(20));
            
          const retryResponse = await retryTransaction.execute(client);
          contractReceipt = await retryResponse.getReceipt(client);
          console.log('Fallback method successful!');
        } else {
          // Re-throw other errors
          throw receiptError;
        }
      }
      
      const contractId = contractReceipt.contractId;
      
      console.log(`Contract deployed successfully with ID: ${contractId?.toString()}`);
      
      // Update final status
      updateDeploymentStatus(uniqueDeploymentId, {
        progress: 100,
        stage: 'Contract deployed successfully',
        status: 'completed',
        contractAddress: contractId?.toSolidityAddress()
      });
      
      // Return success response
      return NextResponse.json({
        success: true,
        contractId: contractId?.toString(),
        contractAddress: contractId?.toSolidityAddress(),
        fileId: fileId?.toString(),
        bytecodeSize: bytecodeSizeInBytes,
        gas,
        deploymentId: uniqueDeploymentId
      });
    } catch (error) {
      console.error('Error deploying contract:', error);
      const errorMessage = extractHederaErrorMessage(error) || 'Contract deployment failed';
      
      updateDeploymentStatus(uniqueDeploymentId, {
        status: 'error',
        error: errorMessage
      });
      
      return NextResponse.json({ 
        error: errorMessage,
        fileId: fileId?.toString(), // Return the file ID even if contract deployment fails
        deploymentId: uniqueDeploymentId
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in handle-large-contracts:', error);
    
    // Use a default deployment ID in the global catch block
    const fallbackDeploymentId = 'error-' + Date.now();
    
    updateDeploymentStatus(fallbackDeploymentId, {
      status: 'error',
      error: 'Unexpected error occurred'
    });
    
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      deploymentId: fallbackDeploymentId
    }, { status: 500 });
  }
} 