#!/usr/bin/env node

/**
 * SmartScope Vercel Deployment Helper
 * 
 * This script helps prepare the application for deployment to Vercel by:
 * 1. Checking required environment variables
 * 2. Creating a sample .env.production file with placeholders
 * 3. Validating the build process for common errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'HEDERA_OPERATOR_ID',
  'HEDERA_OPERATOR_KEY', 
  'HASHIO_API_ENDPOINT',
  'MIRROR_NODE_TESTNET',
  'MIRROR_NODE_MAINNET'
];

// Optional environment variables (good to have)
const OPTIONAL_ENV_VARS = [
  'HEDERA_TEST_ACCOUNT_ADDRESS',
  'GEMINI_API_KEY'
];

console.log(`${colors.bright}${colors.blue}SmartScope - Vercel Deployment Helper${colors.reset}\n`);

// Check if .env files exist
console.log(`${colors.bright}Checking environment files...${colors.reset}`);
const envFiles = ['.env', '.env.local', '.env.production'];
const existingEnvFiles = envFiles.filter(file => fs.existsSync(file));

if (existingEnvFiles.length > 0) {
  console.log(`${colors.green}Found environment files: ${existingEnvFiles.join(', ')}${colors.reset}`);
} else {
  console.log(`${colors.yellow}No environment files found. Will create .env.production for you.${colors.reset}`);
}

// Create a sample .env.production file if it doesn't exist
if (!fs.existsSync('.env.production')) {
  console.log(`${colors.bright}Creating sample .env.production file...${colors.reset}`);
  
  const envSample = `# SmartScope Production Environment Variables
# Replace these placeholders with your actual values in Vercel

# Required Hedera account information
HEDERA_OPERATOR_ID="0.0.YOUR_OPERATOR_ID"
HEDERA_OPERATOR_KEY="YOUR_OPERATOR_PRIVATE_KEY"

# API endpoints
HASHIO_API_ENDPOINT="https://testnet.hashio.io/api"
MIRROR_NODE_TESTNET="https://testnet.mirrornode.hedera.com/api/v1"
MIRROR_NODE_MAINNET="https://mainnet-public.mirrornode.hedera.com/api/v1"

# Optional variables
HEDERA_TEST_ACCOUNT_ADDRESS="0xYOUR_TEST_ACCOUNT_ADDRESS"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
`;
  
  fs.writeFileSync('.env.production', envSample);
  console.log(`${colors.green}Created .env.production with sample values${colors.reset}`);
  console.log(`${colors.yellow}IMPORTANT: Replace the sample values with real values in Vercel environment variables${colors.reset}`);
} else {
  console.log(`${colors.bright}Checking .env.production file...${colors.reset}`);
  const envContent = fs.readFileSync('.env.production', 'utf8');
  
  // Check for required variables in .env.production
  const missingVars = [];
  REQUIRED_ENV_VARS.forEach(variable => {
    if (!envContent.includes(`${variable}=`) && !envContent.includes(`${variable}="`)) {
      missingVars.push(variable);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`${colors.yellow}Missing required variables in .env.production: ${missingVars.join(', ')}${colors.reset}`);
    console.log(`${colors.yellow}Make sure to add these in Vercel environment variables${colors.reset}`);
  } else {
    console.log(`${colors.green}All required variables found in .env.production${colors.reset}`);
  }
}

// Create a Vercel configuration file if it doesn't exist
if (!fs.existsSync('vercel.json')) {
  console.log(`${colors.bright}Creating Vercel configuration file...${colors.reset}`);
  
  const vercelConfig = {
    "version": 2,
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "installCommand": "npm install",
    "framework": "nextjs",
    "regions": ["iad1"],
    "functions": {
      "api/**/*": {
        "memory": 1024
      }
    }
  };
  
  fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
  console.log(`${colors.green}Created vercel.json configuration${colors.reset}`);
}

// Check for large dependencies that might need external packages configured
console.log(`${colors.bright}Checking for large dependencies...${colors.reset}`);
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const largePackages = ['solc', '@hashgraph/sdk'];
  const foundLargePackages = largePackages.filter(pkg => dependencies[pkg]);
  
  if (foundLargePackages.length > 0) {
    console.log(`${colors.yellow}Found large packages that may need special configuration: ${foundLargePackages.join(', ')}${colors.reset}`);
    console.log(`${colors.yellow}These are configured as serverExternalPackages in next.config.js${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}Error reading package.json: ${error.message}${colors.reset}`);
}

// Validate build process
console.log(`\n${colors.bright}Running build validation...${colors.reset}`);
console.log(`${colors.yellow}This will do a test build to identify any issues...${colors.reset}`);

try {
  console.log(`${colors.bright}Checking for linting issues...${colors.reset}`);
  execSync('npm run lint --fix', { stdio: 'inherit' });
  console.log(`${colors.green}Linting completed successfully${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}Linting found issues. Please fix them before deploying.${colors.reset}`);
}

try {
  console.log(`${colors.bright}Starting test build...${colors.reset}`);
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}Build completed successfully!${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}Build process failed. Please fix the issues before deploying.${colors.reset}`);
  process.exit(1);
}

console.log(`\n${colors.bright}${colors.green}✓ SmartScope is ready for Vercel deployment!${colors.reset}`);
console.log(`\n${colors.bright}Deployment steps:${colors.reset}`);
console.log(`1. Install Vercel CLI: ${colors.blue}npm i -g vercel${colors.reset}`);
console.log(`2. Deploy to Vercel: ${colors.blue}vercel${colors.reset}`);
console.log(`3. Link to production: ${colors.blue}vercel --prod${colors.reset}`);
console.log(`\n${colors.yellow}IMPORTANT: Make sure to set all required environment variables in the Vercel dashboard${colors.reset}`); 