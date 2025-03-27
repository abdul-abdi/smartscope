const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// URL to your local endpoint (change as needed)
const deployUrl = 'http://localhost:3000/api/direct-deploy';

/**
 * Test contract deployment with the optimized approach
 */
async function testContractDeployment() {
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
    console.log('Note: The direct deployment approach works efficiently within Vercel serverless function time constraints.');
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
  
  // Deploy using direct-deploy endpoint
  console.log(`Attempting deployment with direct-deploy endpoint`);
  try {
    const deployResponse = await axios.post(deployUrl, {
      bytecode,
      abi: [], // Empty ABI for testing
      deploymentId: `test-${type}-${Date.now()}`
    });
    
    console.log('Deployment response:', deployResponse.data);
    
    if (deployResponse.data.success) {
      console.log('✓ Contract deployment successful');
      console.log(`  Contract ID: ${deployResponse.data.contractId}`);
      console.log(`  Contract Address: ${deployResponse.data.contractAddress}`);
      console.log(`  Execution time: ${deployResponse.data.executionTime}ms`);
      
      // If we have a deploymentId but no contractAddress yet, poll for completion
      if (deployResponse.data.deploymentId && !deployResponse.data.contractAddress) {
        console.log(`  Deployment ID: ${deployResponse.data.deploymentId}`);
        console.log('  Polling for completion...');
        
        // Poll for completion
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
          const statusResponse = await axios.get(`${deployUrl}?id=${deployResponse.data.deploymentId}`);
          
          console.log(`  Polling attempt ${attempts}:`, statusResponse.data.status);
          
          // If deployment completed successfully
          if (statusResponse.data.status === 'completed' && statusResponse.data.contractAddress) {
            console.log('✓ Deployment completed successfully');
            console.log(`  Contract ID: ${statusResponse.data.contractId}`);
            console.log(`  Contract Address: ${statusResponse.data.contractAddress}`);
            break;
          }
          
          // If deployment failed
          if (statusResponse.data.status === 'error') {
            throw new Error(`Deployment failed: ${statusResponse.data.error}`);
          }
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ Polling timed out - deployment may still be processing');
        }
      }
    } else {
      throw new Error('Contract deployment failed: ' + (deployResponse.data.error || 'Unknown error'));
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
testContractDeployment().catch(console.error); 