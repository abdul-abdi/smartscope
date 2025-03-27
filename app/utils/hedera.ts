import { Client, PrivateKey, AccountBalanceQuery } from '@hashgraph/sdk';

/**
 * Initialize a Hedera client using environment credentials or with provided credentials
 * 
 * @param operatorId Optional Account ID for the Hedera account, if not provided uses environment variables
 * @param operatorKey Optional Private key for the Hedera account, if not provided uses environment variables
 * @returns Initialized Hedera client
 */
export async function initializeClient(operatorId?: string, operatorKey?: string): Promise<Client> {
  try {
    // If credentials are not provided, get them from environment
    if (!operatorId || !operatorKey) {
      const credentials = getHederaCredentials();
      operatorId = credentials.operatorId;
      operatorKey = credentials.operatorKey;
    }

    // Create the private key object from the string
    // Check if the key looks like a DER-encoded key or a hex key
    let privateKey;
    try {
      // First try to parse as ED25519 key
      if (operatorKey.startsWith('302e020100300506032b657004')) {
        privateKey = PrivateKey.fromStringDer(operatorKey);
        console.log("Using DER format private key");
      } else {
        privateKey = PrivateKey.fromStringED25519(operatorKey);
        console.log("Using ED25519 format private key");
      }
    } catch (error) {
      // Fallback to generic parsing
      console.warn("Using fallback key parsing, this may not be optimal");
      privateKey = PrivateKey.fromString(operatorKey);
    }
    
    // Create and initialize the client
    const client = Client.forTestnet();
    client.setOperator(operatorId, privateKey);
    
    // Test the connection with a simple query
    try {
      // Perform a simple query to verify connection
      const balance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);
      
      console.log(`Connection test successful. Account balance: ${balance.hbars.toString()}`);
    } catch (testError: any) {
      console.error('Connection test failed:', testError);
      throw new Error(`Connection test failed: ${testError.message}`);
    }
    
    return client;
  } catch (error: any) {
    console.error('Error initializing Hedera client:', error);
    throw new Error(`Failed to initialize Hedera client: ${error.message}`);
  }
}

/**
 * Validate Hedera credentials for format and completeness
 * 
 * @returns Object containing validation status and message
 */
export function validateHederaCredentials(): { isValid: boolean; message: string } {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  
  if (!operatorId || !operatorKey) {
    return { 
      isValid: false, 
      message: 'Missing Hedera credentials. Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local' 
    };
  }
  
  // Validate operator ID format (should be 0.0.X)
  if (!operatorId.match(/^0\.0\.\d+$/)) {
    return { 
      isValid: false, 
      message: `Invalid operator ID format: ${operatorId}. Expected format: 0.0.X` 
    };
  }
  
  // Validate private key format (basic check)
  if (operatorKey.length < 32) {
    return { 
      isValid: false, 
      message: 'Invalid operator key format. Please check your HEDERA_OPERATOR_KEY' 
    };
  }
  
  return { isValid: true, message: 'Credentials validated' };
}

/**
 * Get Hedera credentials from environment variables or use defaults
 * 
 * @returns Object containing operatorId and operatorKey
 */
export function getHederaCredentials(): { operatorId: string, operatorKey: string } {
  // Get credentials from environment variables
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  
  if (!operatorId || !operatorKey) {
    console.warn('Environment variables for Hedera credentials not properly set, using defaults');
    
    // For demo purposes only - never include private keys in code
    return {
      operatorId: "0.0.3",
      operatorKey: "302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
    };
  }
  
  return { operatorId, operatorKey };
}

/**
 * Format a contract ID to match Hedera's expected format
 * 
 * @param contractAddress Contract address or ID
 * @returns Properly formatted contract ID
 */
export function formatContractId(contractAddress: string): string {
  // If already in Hedera format (0.0.X), return as is
  if (contractAddress.match(/^\d+\.\d+\.\d+$/)) {
    return contractAddress;
  }
  
  // If it starts with 0x, it's an EVM address format
  if (contractAddress.startsWith('0x')) {
    try {
      // Try to get the contract ID from the address
      // This is a simplified approach for demo - in a real app, would call Hedera SDK
      
      // For testing purposes we'll use a hardcoded mapping
      // This should be replaced with a proper lookup in production
      const evmAddressToContractId: Record<string, string> = {
        '0x0000000000000000000000000000000000057f89a': '0.0.5765274'
      };
      
      if (evmAddressToContractId[contractAddress.toLowerCase()]) {
        return evmAddressToContractId[contractAddress.toLowerCase()];
      }
      
      // If address isn't in our mapping, try to extract from the last part
      const lastPart = contractAddress.substring(contractAddress.length - 8);
      const contractNum = parseInt(lastPart, 16);
      return `0.0.${contractNum}`;
    } catch (error) {
      console.error('Error converting EVM address to contract ID:', error);
      return contractAddress;
    }
  }
  
  // If it's a string of numbers only (mirror node format)
  if (/^\d+$/.test(contractAddress)) {
    return `0.0.${contractAddress}`;
  }
  
  // If it's a string of all zeros followed by a contract number
  // Example: 000000000000000000000000000000000057f89a
  if (/^0+[a-f0-9]+$/.test(contractAddress)) {
    try {
      // Extract the last meaningful portion (removing leading zeros)
      const clean = contractAddress.replace(/^0+/, '');
      const contractNum = parseInt(clean, 16);
      return `0.0.${contractNum}`;
    } catch (error) {
      console.error('Error converting hex to contract ID:', error);
    }
  }
  
  // Otherwise, use as is (with a warning)
  console.warn(`Unrecognized contract ID format: ${contractAddress}`);
  return contractAddress;
} 