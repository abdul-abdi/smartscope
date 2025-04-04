/**
 * Error codes for contract interaction
 */
export enum ContractErrorCode {
  // Address related errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  
  // Contract related errors
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  CONTRACT_EXECUTION_REVERTED = 'CONTRACT_EXECUTION_REVERTED',
  CONTRACT_FUNCTION_NOT_FOUND = 'CONTRACT_FUNCTION_NOT_FOUND',
  
  // ABI related errors
  ABI_NOT_FOUND = 'ABI_NOT_FOUND',
  ABI_PARSING_ERROR = 'ABI_PARSING_ERROR',
  
  // Parameter related errors
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  PARAMETER_TYPE_MISMATCH = 'PARAMETER_TYPE_MISMATCH',
  
  // Transaction related errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  
  // Network related errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Wallet related errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_REJECTED = 'WALLET_REJECTED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  API_ERROR = 'API_ERROR'
}

/**
 * Standardized contract error class
 */
export class ContractError extends Error {
  constructor(
    message: string,
    public code: ContractErrorCode,
    public details?: any,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'ContractError';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ContractError.prototype);
  }
  
  /**
   * Format error for API response
   */
  toResponse() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      suggestion: this.suggestion
    };
  }
  
  /**
   * Format error for user display
   */
  toUserMessage() {
    let userMessage = this.message;
    
    if (this.suggestion) {
      userMessage += ` ${this.suggestion}`;
    }
    
    return userMessage;
  }
}

/**
 * Error handling service for contract interactions
 */
export class ErrorService {
  /**
   * Parse error from various sources and convert to standardized ContractError
   * @param error Original error from any source
   * @returns Standardized ContractError
   */
  static parseError(error: any): ContractError {
    // If it's already a ContractError, return it
    if (error instanceof ContractError) {
      return error;
    }
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Handle JSON-RPC errors
    if (error?.code === -32000 || errorMessage.includes('execution reverted')) {
      return this.createRevertError(error);
    }
    
    // Handle address errors
    if (errorMessage.includes('address') && (errorMessage.includes('invalid') || errorMessage.includes('not found'))) {
      return this.createAddressError(error);
    }
    
    // Handle contract not found errors
    if (errorMessage.includes('contract') && errorMessage.includes('not found')) {
      return new ContractError(
        'Contract not found at the specified address',
        ContractErrorCode.CONTRACT_NOT_FOUND,
        error,
        'Verify the contract address is correct and the contract is deployed on Hedera testnet.'
      );
    }
    
    // Handle function not found errors
    if (errorMessage.includes('function') && errorMessage.includes('not found')) {
      return new ContractError(
        'Function not found in the contract',
        ContractErrorCode.CONTRACT_FUNCTION_NOT_FOUND,
        error,
        'Check the function name and ensure it exists in the contract.'
      );
    }
    
    // Handle parameter errors
    if (errorMessage.includes('parameter') || errorMessage.includes('argument')) {
      return this.createParameterError(error);
    }
    
    // Handle wallet errors
    if (errorMessage.includes('wallet') || errorMessage.includes('user denied') || errorMessage.includes('user rejected')) {
      return new ContractError(
        'Wallet interaction was rejected',
        ContractErrorCode.WALLET_REJECTED,
        error,
        'You need to confirm the transaction in your wallet.'
      );
    }
    
    // Handle network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return new ContractError(
        'Network error occurred',
        ContractErrorCode.NETWORK_ERROR,
        error,
        'Check your internet connection and try again.'
      );
    }
    
    // Default to unknown error
    return new ContractError(
      errorMessage,
      ContractErrorCode.UNKNOWN_ERROR,
      error
    );
  }
  
  /**
   * Create a standardized error for contract reverts
   * @param error Original error
   * @returns ContractError
   */
  private static createRevertError(error: any): ContractError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Try to extract revert reason
    let revertReason = 'Contract execution reverted';
    let match;
    
    // Look for revert reason in different formats
    if ((match = errorMessage.match(/reverted with reason string '(.+?)'/i))) {
      revertReason = `Contract reverted: ${match[1]}`;
    } else if ((match = errorMessage.match(/reverted: (.+?)($|\s\()/i))) {
      revertReason = `Contract reverted: ${match[1]}`;
    } else if ((match = errorMessage.match(/execution reverted: (.+?)($|\s\()/i))) {
      revertReason = `Contract reverted: ${match[1]}`;
    }
    
    // Create suggestions based on common revert reasons
    let suggestion = 'Check the transaction parameters and contract state.';
    
    if (errorMessage.includes('insufficient funds')) {
      suggestion = 'You do not have enough HBAR to complete this transaction.';
    } else if (errorMessage.includes('gas required exceeds allowance')) {
      suggestion = 'Try increasing the gas limit for this transaction.';
    } else if (errorMessage.includes('execution ran out of gas')) {
      suggestion = 'The transaction ran out of gas. Try increasing the gas limit.';
    } else if (errorMessage.toLowerCase().includes('owner') || errorMessage.toLowerCase().includes('admin')) {
      suggestion = 'This function may be restricted to the contract owner or admin.';
    }
    
    return new ContractError(
      revertReason,
      ContractErrorCode.CONTRACT_EXECUTION_REVERTED,
      error,
      suggestion
    );
  }
  
  /**
   * Create a standardized error for address issues
   * @param error Original error
   * @returns ContractError
   */
  private static createAddressError(error: any): ContractError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    if (errorMessage.includes('not found')) {
      return new ContractError(
        'Address not found',
        ContractErrorCode.ADDRESS_NOT_FOUND,
        error,
        'Verify the address exists on Hedera testnet.'
      );
    }
    
    return new ContractError(
      'Invalid address format',
      ContractErrorCode.INVALID_ADDRESS,
      error,
      'Address should be in EVM format (0x...) or Hedera format (0.0.X).'
    );
  }
  
  /**
   * Create a standardized error for parameter issues
   * @param error Original error
   * @returns ContractError
   */
  private static createParameterError(error: any): ContractError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    if (errorMessage.includes('missing')) {
      return new ContractError(
        'Missing required parameter',
        ContractErrorCode.MISSING_PARAMETER,
        error,
        'Ensure all required parameters are provided.'
      );
    }
    
    if (errorMessage.includes('type')) {
      return new ContractError(
        'Parameter type mismatch',
        ContractErrorCode.PARAMETER_TYPE_MISMATCH,
        error,
        'Check that parameter types match the function signature.'
      );
    }
    
    return new ContractError(
      'Invalid parameter',
      ContractErrorCode.INVALID_PARAMETER,
      error,
      'Check the parameter values and try again.'
    );
  }
  
  /**
   * Log error with detailed information
   * @param error Error to log
   * @param context Additional context
   */
  static logError(error: any, context?: any): void {
    const standardError = this.parseError(error);
    
    console.error('=== CONTRACT ERROR ===');
    console.error(`Message: ${standardError.message}`);
    console.error(`Code: ${standardError.code}`);
    console.error(`Suggestion: ${standardError.suggestion || 'None'}`);
    
    if (context) {
      console.error('Context:', context);
    }
    
    if (standardError.details) {
      console.error('Details:', standardError.details);
    }
    
    console.error('Stack:', error?.stack || 'No stack trace available');
    console.error('=====================');
  }
}
