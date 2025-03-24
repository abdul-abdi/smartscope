/**
 * Retry function that implements exponential backoff for transient errors
 * 
 * @param fn Function to execute and retry if it fails
 * @param retries Number of retries (default: 3)
 * @param delay Initial delay in ms (default: 1000)
 * @returns Result of the function execution
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Don't retry if we've run out of retries
    if (retries <= 0) throw error;
    
    // Only retry for specific errors that might be transient
    // Add specific error types here that should be retried
    const isTransientError = 
      error.message.includes('BUSY') ||
      error.message.includes('PLATFORM_TRANSACTION_NOT_CREATED') ||
      error.message.includes('PLATFORM_NOT_ACTIVE') ||
      error.message.includes('CONNECTION_ERROR') ||
      error.message.includes('NETWORK_ERROR');
      
    if (!isTransientError) throw error;
    
    console.log(`Retrying operation after error: ${error.message}. Retries left: ${retries}`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Sleeps for a specified number of milliseconds
 * 
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log an error with consistent formatting
 * 
 * @param message Error message or description
 * @param error The actual error object
 * @param context Additional context information
 */
export function logError(message: string, error: any, context?: Record<string, any>): void {
  console.error('---------------------------');
  console.error(`ERROR: ${message}`);
  console.error(`Time: ${new Date().toISOString()}`);
  
  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  
  console.error('Error details:', error);
  
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  
  console.error('---------------------------');
}

/**
 * Safely parse JSON with error handling
 * 
 * @param json JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logError('Failed to parse JSON', error, { jsonString: json.substring(0, 100) });
    return fallback;
  }
}

/**
 * Checks for the existence of a .env.local file with the required Hedera credentials
 * and provides detailed instructions on how to set up the file.
 * 
 * @returns Object with detailed information about the environment setup
 */
export function checkEnvironmentSetup(): { 
  hasEnvFile: boolean; 
  hasValidCredentials: boolean; 
  instructions: string;
} {
  const hasEnvFile = process.env.NODE_ENV === 'development' && 
                     (process.env.HEDERA_OPERATOR_ID !== undefined || 
                      process.env.HEDERA_OPERATOR_KEY !== undefined);
  
  const hasValidCredentials = process.env.HEDERA_OPERATOR_ID !== undefined && 
                             process.env.HEDERA_OPERATOR_KEY !== undefined;
  
  const instructions = `
To fix this issue:

1. Create a file named '.env.local' in the root directory of your project
2. Add the following lines to the file:

HEDERA_OPERATOR_ID=0.0.XXXXX
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY_HERE

3. Replace XXXXX with your actual Hedera account ID number
4. Replace YOUR_PRIVATE_KEY_HERE with your actual private key
5. Save the file and restart the development server

You can get a Hedera testnet account by:
- Visiting https://portal.hedera.com/register
- Creating an account and requesting testnet access
- Using the Hedera Portal to create a testnet account
- Copying the Account ID and Private Key
`;
  
  return {
    hasEnvFile,
    hasValidCredentials,
    instructions
  };
}

/**
 * Validates if a string is a valid hexadecimal string
 * @param hexString The string to validate
 * @returns boolean indicating if the string is valid hex
 */
export function validateHexString(hexString: string): boolean {
  if (!hexString) return false;
  
  // Remove 0x prefix if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // Check if string contains only hexadecimal characters
  return /^[0-9a-fA-F]*$/.test(hex);
}

/**
 * Extracts a readable error message from Hedera errors
 * @param error The error object from Hedera
 * @returns A readable error message
 */
export function extractHederaErrorMessage(error: any): string | null {
  if (!error) return null;
  
  // Handle string errors
  if (typeof error === 'string') return error;
  
  // Handle error objects
  if (error.message) {
    // Extract the message part
    const message = error.message;
    
    // Look for specific error patterns in Hedera responses
    if (message.includes('INVALID_SIGNATURE')) {
      return 'Invalid signature. Please check your account ID and private key.';
    }
    
    if (message.includes('INSUFFICIENT_PAYER_BALANCE')) {
      return 'Insufficient account balance to complete this operation.';
    }
    
    if (message.includes('CONTRACT_REVERT_EXECUTED')) {
      return 'Contract reverted during execution. Check contract code and parameters.';
    }
    
    if (message.includes('INVALID_CONTRACT_ID')) {
      return 'Invalid contract ID provided.';
    }
    
    if (message.includes('INVALID_FILE_ID')) {
      return 'Invalid file ID provided.';
    }
    
    if (message.includes('CONTRACT_EXECUTION_EXCEPTION')) {
      // Try to extract the revert reason if available
      const revertMatch = message.match(/message: "([^"]+)"/);
      if (revertMatch && revertMatch[1]) {
        return `Contract execution failed: ${revertMatch[1]}`;
      }
      return 'Contract execution failed. Check your contract code.';
    }
    
    if (message.includes('OUT_OF_GAS')) {
      return 'Transaction ran out of gas. Try increasing the gas limit.';
    }
    
    // If no specific pattern matched, return the full message
    return message;
  }
  
  // For unexpected error objects, convert to string
  return String(error);
}

/**
 * Calculates an appropriate gas limit based on bytecode size
 * @param bytecodeSize Size of the bytecode in bytes
 * @returns Recommended gas limit
 */
export function calculateGasLimit(bytecodeSize: number): number {
  // Base gas
  const baseGas = 100000;
  
  // Additional gas based on bytecode size
  // 1 gas per 10 bytes of bytecode as a rough estimate
  const additionalGas = Math.ceil(bytecodeSize / 10);
  
  // Calculate total gas with a safety margin of 20%
  const totalGas = Math.ceil((baseGas + additionalGas) * 1.2);
  
  // Cap at reasonable maximum
  const maxGas = 1000000;
  
  return Math.min(totalGas, maxGas);
}

/**
 * Converts a contract ID from Ethereum format to Hedera format
 * @param evmAddress Ethereum format address (0x...)
 * @returns Hedera format contract ID (0.0.X) or null if invalid
 */
export function evmAddressToContractId(evmAddress: string): string | null {
  if (!evmAddress || !evmAddress.startsWith('0x')) return null;
  
  try {
    // Remove 0x prefix
    const addressWithoutPrefix = evmAddress.slice(2);
    
    // Convert hex to decimal
    const contractNum = BigInt('0x' + addressWithoutPrefix);
    
    // Format as Hedera contract ID
    return `0.0.${contractNum.toString()}`;
  } catch (e) {
    console.error('Error converting EVM address to contract ID:', e);
    return null;
  }
}

/**
 * Converts a Hedera format contract ID to Ethereum format
 * @param hederaId Hedera format contract ID (0.0.X)
 * @returns Ethereum format address (0x...) or null if invalid
 */
export function contractIdToEvmAddress(hederaId: string): string | null {
  if (!hederaId) return null;
  
  try {
    // Parse Hedera ID format (0.0.X)
    const parts = hederaId.split('.');
    if (parts.length !== 3) return null;
    
    // Get the contract number
    const contractNum = BigInt(parts[2]);
    
    // Convert to hex and pad to 40 characters
    let hexAddress = contractNum.toString(16).padStart(40, '0');
    
    // Add 0x prefix
    return '0x' + hexAddress;
  } catch (e) {
    console.error('Error converting contract ID to EVM address:', e);
    return null;
  }
} 