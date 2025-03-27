import { CompilationResult, DeploymentResult, ContractCallResult, ContractAnalysisResult } from '../types/contract';

/**
 * Compile a Solidity smart contract
 * 
 * @param code The Solidity code to compile
 * @param extraData Optional additional data like external libraries
 * @returns The compilation result including ABI and bytecode
 */
export async function compileContract(
  code: string, 
  extraData?: { externalLibraries?: string[] }
): Promise<CompilationResult> {
  const response = await fetch('/api/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, ...extraData }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to compile contract');
  }
  
  return response.json();
}

/**
 * Compile multiple Solidity smart contract files with imports
 * 
 * @param files A map of file paths to their content
 * @param mainFile The main file to compile (entry point)
 * @param extraData Optional additional data like external libraries
 * @returns The compilation result including ABI and bytecode
 */
export async function compileMultipleFiles(
  files: Record<string, string>,
  mainFile: string,
  extraData?: { externalLibraries?: string[] }
): Promise<CompilationResult> {
  const response = await fetch('/api/compile-multi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files, mainFile, ...extraData }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to compile contracts');
  }
  
  return response.json();
}

/**
 * Deploy a compiled smart contract to Hedera Testnet
 * 
 * @param bytecode The compiled bytecode
 * @param abi The contract ABI
 * @param constructorArgs Optional constructor arguments
 * @returns The deployment result including contract address
 */
export async function deployContract(
  bytecode: string, 
  abi: any[],
  constructorArgs: any[] = []
): Promise<DeploymentResult> {
  // Start deployment with direct-deploy endpoint for Vercel compatibility
  const response = await fetch('/api/direct-deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bytecode, abi, constructorArgs }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deploy contract');
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Deployment failed');
  }
  
  // For immediate deployments that already have the contract address
  if (result.contractAddress) {
    return {
      contractId: result.contractId,
      contractAddress: result.contractAddress,
      abi: abi
    };
  }
  
  // For async deployments that require polling
  if (result.deploymentId) {
    // Poll for completion (max 10 attempts with increasing delay)
    let attempts = 0;
    const maxAttempts = 10;
    let delay = 2000; // Start with 2 seconds
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * 1.5, 10000); // Cap at 10 seconds
      
      // Check deployment status
      const statusResponse = await fetch(`/api/direct-deploy?id=${result.deploymentId}`, {
        method: 'GET',
      });
      
      if (!statusResponse.ok) {
        continue; // Try again if request fails
      }
      
      const status = await statusResponse.json();
      
      // If deployment completed successfully
      if (status.status === 'completed' && status.contractAddress) {
        return {
          contractId: status.contractId,
          contractAddress: status.contractAddress,
          abi: abi
        };
      }
      
      // If deployment failed
      if (status.status === 'error') {
        throw new Error(status.error || 'Deployment failed');
      }
      
      // If still pending, continue polling
    }
    
    // If we've exhausted attempts
    throw new Error('Deployment timed out - check deployment status later');
  }
  
  throw new Error('No contract address or deployment ID received');
}

/**
 * Call a function on a deployed smart contract
 * 
 * @param contractAddress The contract address or ID
 * @param functionName The name of the function to call
 * @param functionInputs The function parameters
 * @param stateMutability The function's state mutability (view, pure, nonpayable, etc.)
 * @param outputs The expected output types
 * @returns The result of the function call
 */
export async function callContractFunction(
  contractAddress: string,
  functionName: string,
  functionInputs: Array<{ name: string; type: string; value: string }>,
  stateMutability: string,
  outputs: Array<{ type: string }>
): Promise<ContractCallResult> {
  const response = await fetch('/api/call-contract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contractAddress,
      functionName,
      functionInputs,
      stateMutability,
      outputs,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to call contract function');
  }
  
  return response.json();
}

/**
 * Analyze a smart contract based on its ABI
 * 
 * @param contractAddress The contract address or ID
 * @param abi Optional contract ABI
 * @returns The analysis result
 */
export async function analyzeContract(
  contractAddress: string,
  abi?: any[]
): Promise<string> {
  const response = await fetch('/api/analyze-contract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contractAddress,
      abi: abi ? JSON.stringify(abi) : undefined,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze contract');
  }
  
  const data = await response.json();
  return data.analysis || '';
} 