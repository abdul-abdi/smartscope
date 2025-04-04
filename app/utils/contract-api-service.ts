import { ContractFunction } from "../types/contract";

/**
 * Analyze a contract and return detailed information about its security and functionality
 */
export const analyzeContract = async (contractAddress: string, abi: ContractFunction[]) => {
  try {
    const response = await fetch('/api/analyze-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        abi,
        includeDetectedFunctions: true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze contract');
    }
    
    return await response.json();
  } catch (err: any) {
    console.error('Error analyzing contract:', err);
    throw new Error(err.message || 'An error occurred while analyzing the contract');
  }
};

/**
 * Verify if a function exists in a contract
 */
export const verifyFunction = async (
  contractAddress: string, 
  functionName: string, 
  inputTypes: string[]
) => {
  try {
    const response = await fetch('/api/verify-function', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        functionName,
        inputTypes
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { exists: false, error: error.message };
    }

    return await response.json();
  } catch (error: any) {
    console.error('Function verification error:', error);
    return { exists: false, error: error.message };
  }
};

/**
 * Call a contract function (either read or write)
 */
export const callContractFunction = async (
  contractAddress: string, 
  functionName: string, 
  parameters: any[],
  abi?: ContractFunction[],
  isReadFunction?: boolean
) => {
  try {
    // Build the request body
    const requestBody: any = {
      contractAddress,
      functionName,
      parameters: parameters || [],
      isQuery: isReadFunction
    };
    
    // Only include ABI if it exists - this allows for fallback to direct selector calling
    const isDirectCall = !abi || abi.length === 0;
    if (!isDirectCall) {
      requestBody.abi = abi;
    } else {
      console.log('No ABI provided for function call - will use direct function selector');
      // Check if this is likely a bytecode-derived function call
      const functionExists = await verifyFunction(contractAddress, functionName, 
        parameters.map(p => (p.type || 'unknown')));
      
      if (!functionExists.exists) {
        console.warn(`Function ${functionName} not verified in bytecode, but attempting call anyway.`);
      }
    }

    // Call the appropriate API endpoint
    const response = await fetch('/api/call-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Add more context to error messages for unverified functions
      if (isDirectCall && errorData.error) {
        throw new Error(`${errorData.error} (Note: Using bytecode-derived function signature without verified ABI)`);
      }
      
      throw new Error(errorData.error || `Error calling function: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error calling contract function:', error);
    throw new Error(error.message || 'An error occurred while calling the contract function');
  }
};

/**
 * Fetch contract ABI
 */
export const fetchContractAbi = async (contractAddress: string, options: {
  forceRefresh?: boolean;
  preferSource?: boolean;
  analysisMethod?: string;
  bypassCache?: boolean;
} = {}) => {
  try {
    // Generate a unique timestamp to prevent caching
    const timestamp = Date.now() + Math.random().toString(36).substring(2);
    
    const response = await fetch('/api/get-contract-abi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        cacheBuster: timestamp,
        forceRefresh: options.forceRefresh || true,
        preferSource: options.preferSource || true,
        analysisMethod: options.analysisMethod || 'bytecode',
        bypassCache: options.bypassCache || true,
        regenerateAbi: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch ABI: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching contract ABI:', error);
    throw error;
  }
};

/**
 * Verify contract ABI functions against bytecode
 */
export const verifyAbi = async (contractAddress: string, abi: ContractFunction[]) => {
  try {
    const response = await fetch('/api/verify-abi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress,
        abi
      }),
    });

    if (!response.ok) {
      return { verified: false, functions: abi };
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying ABI:', error);
    return { verified: false, functions: abi };
  }
}; 