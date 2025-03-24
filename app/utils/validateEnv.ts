import { validateHederaCredentials } from './hedera';

/**
 * Validates the required environment variables and configurations
 * Can be called during app startup to ensure proper configuration
 */
export function validateEnvironment() {
  console.log('Validating environment configuration...');
  
  // Check for required environment variables
  const requiredVars = [
    'HEDERA_OPERATOR_ID',
    'HEDERA_OPERATOR_KEY'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please add them to your .env.local file');
    
    // In development, we'll continue but with warnings
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode with missing environment variables');
    } else {
      // In production, exit if env vars are missing
      process.exit(1);
    }
  }
  
  // Validate Hedera credentials
  const validation = validateHederaCredentials();
  if (!validation.isValid) {
    console.error(`Hedera credential validation failed: ${validation.message}`);
    
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
  
  console.log('Environment configuration validated successfully');
}

// Run validation when this module is imported directly
if (require.main === module) {
  validateEnvironment();
} 