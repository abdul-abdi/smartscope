const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// URL to your local endpoint (change as needed)
const deployUrl = 'http://localhost:3000/api/deploy';
const directDeployUrl = 'http://localhost:3000/api/direct-deploy';

/**
 * Test contract deployment with the new approach
 */
async function testLargeContractDeployment() {
  try {
    console.log('🧪 Testing SmartScope Contract Deployment');
    console.log('==========================================');
    
    // First test with a regular-sized contract
    console.log('\n✅ TEST 1: Regular-sized contract deployment');
    const regularBytecode = generateContractBytecode(10000); // ~5KB
    await testDeployment(regularBytecode, 'regular');
    
    // Then test with a large contract
    console.log('\n✅ TEST 2: Large contract deployment');
    const largeBytecode = generateContractBytecode(100000); // ~50KB
    await testDeployment(largeBytecode, 'large');
    
    console.log('\n✅ All tests completed successfully!');
    console.log('Note: If running on Vercel, the direct deployment approach for large contracts will work within the timeout constraints.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Test deployment for a given contract bytecode
 */
async function testDeployment(bytecode, type) {
  console.log(`Generated ${type} test bytecode: ${bytecode.length} characters (${Math.ceil(bytecode.length/2/1024)} KB)`);
  
  // Step 1: Deploy with standard endpoint
  console.log(`Step 1: Attempting deployment with standard endpoint`);
  try {
    const deployResponse = await axios.post(deployUrl, {
      bytecode,
      abi: [] // Empty ABI for testing
    });
    
    console.log('Initial deployment response:', deployResponse.data);
    
    // Check if it's a large contract that needs special handling
    if (deployResponse.data.isLarge) {
      console.log('Step 2: Contract identified as large, continuing with direct deployment');
      
      // Get deployment ID
      const deploymentId = deployResponse.data.deploymentId;
      
      // Use the direct deployment endpoint for large contracts
      const directResponse = await axios.post(directDeployUrl, {
        bytecode,
        abi: [],
        deploymentId
      });
      
      console.log('Direct deployment response:', directResponse.data);
      
      if (directResponse.data.success) {
        console.log('✓ Large contract deployment successful');
        console.log(`  Contract ID: ${directResponse.data.contractId}`);
        console.log(`  Contract Address: ${directResponse.data.contractAddress}`);
        console.log(`  Execution time: ${directResponse.data.executionTime}ms`);
      } else {
        throw new Error('Large contract deployment failed: ' + (directResponse.data.error || 'Unknown error'));
      }
    } else {
      // Standard deployment worked directly
      console.log('✓ Standard deployment successful');
      console.log(`  Contract ID: ${deployResponse.data.contractId}`);
      console.log(`  Contract Address: ${deployResponse.data.contractAddress}`);
    }
    return true;
  } catch (error) {
    console.error(`✗ ${type} deployment test failed:`, error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Generate a fake contract bytecode of specified length for testing
 */
function generateContractBytecode(length = 10000) {
  // Start with a valid-looking bytecode prefix
  const prefix = '0x608060405234801561001057600080fd5b50';
  
  // Generate random hex characters for the body
  let body = '';
  
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < length - prefix.length; i++) {
    body += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  
  return prefix + body;
}

// Run the test
console.log('Starting deployment tests...');
testLargeContractDeployment().catch(console.error); 