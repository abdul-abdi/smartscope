import { NextRequest, NextResponse } from 'next/server';
import {
  PrivateKey,
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
  prepareContractForDeployment
} from '../../utils/helpers';

// Load environment variables
dotenv.config();

// Default gas limit for large contract deployment
const DEFAULT_LARGE_GAS_LIMIT = 15000000; // Increased to match main deploy route

// Simple in-memory status store - for production use Redis or a database
const deploymentStatuses = new Map<string, {
  status: 'pending' | 'completed' | 'error';
  contractId?: string;
  contractAddress?: string;
  error?: string;
  timestamp: number;
}>();

// Cleanup function to prevent memory leaks
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STATUS_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Periodically clean up old deployment statuses
function cleanupDeploymentStatuses() {
  const now = Date.now();
  let cleanedCount = 0;
  
  deploymentStatuses.forEach((status, id) => {
    // Remove statuses older than the expiry time
    if (now - status.timestamp > STATUS_EXPIRY) {
      deploymentStatuses.delete(id);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired deployment statuses`);
  }
  
  // Schedule next cleanup
  setTimeout(cleanupDeploymentStatuses, CLEANUP_INTERVAL);
}

// Start the cleanup process
setTimeout(cleanupDeploymentStatuses, CLEANUP_INTERVAL);

/**
 * Direct deployment endpoint for large contracts
 * This approach avoids the file service chunking approach and instead
 * uses direct bytecode deployment with optimized gas settings
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Parse request body
    const data = await req.json();
    const { 
      bytecode, 
      abi, 
      gas = DEFAULT_LARGE_GAS_LIMIT,
      deploymentId = `deployment-${Date.now()}`,
      operatorId: customOperatorId, 
      operatorKey: customOperatorKey
    } = data;
    
    // Validate request
    if (!bytecode) {
      return NextResponse.json({ error: 'Missing bytecode' }, { status: 400 });
    }
    
    // Store initial status
    deploymentStatuses.set(deploymentId, {
      status: 'pending',
      timestamp: Date.now()
    });
    
    // Prep bytecode but use the original bytecode for deployment
    const preparedContract = prepareContractForDeployment(bytecode, abi);
    // Use the original bytecode instead of the optimized one
    const bytecodeForDeployment = bytecode; // Use original instead of preparedContract.bytecode
    
    // Get Hedera credentials
    const { operatorId, operatorKey } = customOperatorId && customOperatorKey 
      ? { operatorId: customOperatorId, operatorKey: customOperatorKey }
      : getHederaCredentials();
    
    // Initialize client - with retry for connection issues
    const client = await withRetry(() => initializeClient(operatorId, operatorKey));
    
    // Create the private key object for signing with better format detection
    let privateKey;
    try {
      // First try to parse as ED25519 key which is recommended for Hedera
      if (operatorKey.startsWith('302e020100300506032b657004')) {
        privateKey = PrivateKey.fromStringDer(operatorKey);
        console.log("Using DER format private key");
      } else {
        privateKey = PrivateKey.fromStringED25519(operatorKey);
        console.log("Using ED25519 format private key");
      }
    } catch (error) {
      console.warn("Falling back to generic key parsing method");
      privateKey = PrivateKey.fromString(operatorKey);
    }
    
    // Clean bytecode format
    const bytecodeHex = bytecodeForDeployment.startsWith('0x') 
      ? bytecodeForDeployment.slice(2) 
      : bytecodeForDeployment;
    
    // Convert to buffer once
    const bytecodeBuffer = Buffer.from(bytecodeHex, 'hex');
    
    // Log deployment attempt with more details
    console.log(`[${deploymentId}] Direct large contract deployment started`);
    console.log(`Bytecode size: ${bytecodeBuffer.length} bytes (${Math.ceil(bytecodeBuffer.length/1024)} KB)`);
    console.log(`Using gas limit: ${gas}`);
    
    // Create transaction with higher gas limit and max transaction fee
    const contractCreateTx = new ContractCreateTransaction()
      .setGas(gas)
      .setBytecode(bytecodeBuffer)
      .setMaxTransactionFee(new Hbar(100)) // Increased to match main deploy route
      .freezeWith(client);
    
    console.log(`[${deploymentId}] Signing transaction`);
    const contractCreateSign = await contractCreateTx.sign(privateKey);
    
    console.log(`[${deploymentId}] Executing transaction`);
    const contractCreateSubmit = await contractCreateSign.execute(client);
    
    console.log(`[${deploymentId}] Waiting for receipt`);
    const contractReceipt = await contractCreateSubmit.getReceipt(client);
    const contractId = contractReceipt.contractId;
    
    if (!contractId) {
      throw new Error('Contract deployment failed: No contract ID received');
    }
    
    console.log(`[${deploymentId}] Successfully deployed contract with ID: ${contractId.toString()}`);
    
    // Update status to completed
    deploymentStatuses.set(deploymentId, {
      status: 'completed',
      contractId: contractId.toString(),
      contractAddress: contractId.toSolidityAddress(),
      timestamp: Date.now()
    });
    
    // Return success
    return NextResponse.json({
      success: true,
      deploymentId,
      contractId: contractId.toString(),
      contractAddress: contractId.toSolidityAddress(),
      executionTime: Date.now() - startTime,
      optimization: {
        originalSize: preparedContract.size.original,
        optimizedSize: preparedContract.size.optimized,
        savingsPercent: preparedContract.size.savingsPercent.toFixed(2)
      }
    });
  } catch (error: any) {
    console.error('Error in direct deployment:', error);
    
    const errorMessage = error.message || 'Unknown error';
    const deploymentId = error.deploymentId || `error-${Date.now()}`;
    
    // Update status to error
    if (deploymentId) {
      deploymentStatuses.set(deploymentId, {
        status: 'error',
        error: errorMessage,
        timestamp: Date.now()
      });
    }
    
    // Return error response
    return NextResponse.json({
      success: false,
      error: errorMessage,
      deploymentId
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check deployment status
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deploymentId = url.searchParams.get('id');
  
  if (!deploymentId) {
    return NextResponse.json({ error: 'Missing deployment ID' }, { status: 400 });
  }
  
  const status = deploymentStatuses.get(deploymentId);
  
  if (!status) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
  }
  
  // Return status info
  return NextResponse.json({
    deploymentId,
    status: status.status,
    contractId: status.contractId,
    contractAddress: status.contractAddress,
    error: status.error,
    timestamp: status.timestamp
  });
} 