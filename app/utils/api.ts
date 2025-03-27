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
  const response = await fetch('/api/deploy', {
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
  
  // Ensure we have a contract address
  if (!result.contractAddress && result.contractId) {
    // Convert contract ID to address if needed
    result.contractAddress = result.contractId;
  }
  
  if (!result.contractAddress) {
    throw new Error('No contract address received from deployment');
  }
  
  return {
    contractId: result.contractId,
    contractAddress: result.contractAddress,
    abi: abi
  };
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