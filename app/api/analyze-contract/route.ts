import { NextRequest, NextResponse } from 'next/server';
import { Client, ContractCallQuery, ContractInfoQuery, ContractId, Hbar } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import { getHederaCredentials, initializeClient, formatContractId } from '../../utils/hedera';
import { ContractFunction } from '../../types/contract';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config();

const analyzeAbi = (abi: ContractFunction[]) => {
  // Count function types
  const readFunctions = abi.filter(func => 
    func.stateMutability === 'view' || 
    func.stateMutability === 'pure' || 
    func.constant === true
  );
  
  const writeFunctions = abi.filter(func => 
    func.stateMutability === 'nonpayable' || 
    func.stateMutability === 'payable'
  );
  
  // Look for common patterns
  const hasOwnership = abi.some(func => 
    func.name === 'owner' || 
    func.name === 'transferOwnership' || 
    func.name === 'renounceOwnership'
  );
  
  const isERC20 = abi.some(func => func.name === 'totalSupply') &&
                 abi.some(func => func.name === 'balanceOf') &&
                 abi.some(func => func.name === 'transfer');
  
  const isERC721 = abi.some(func => func.name === 'balanceOf') &&
                  abi.some(func => func.name === 'ownerOf') &&
                  abi.some(func => func.name === 'transferFrom');
                  
  const hasAccessControl = abi.some(func => 
    func.name === 'hasRole' || 
    func.name === 'getRoleMember'
  );
  
  const hasPausable = abi.some(func => 
    func.name === 'pause' || 
    func.name === 'unpause' || 
    func.name === 'paused'
  );
  
  const hasUpgradeable = abi.some(func => 
    func.name === 'upgradeTo' || 
    func.name === 'upgradeToAndCall'
  );
  
  // Build analysis text
  let analysis = '';
  
  // Contract type
  analysis += 'Contract Type:\n';
  if (isERC20) {
    analysis += '- This appears to be an ERC20 token contract\n';
  } else if (isERC721) {
    analysis += '- This appears to be an ERC721 NFT contract\n';
  } else {
    analysis += '- This appears to be a custom or utility contract\n';
  }
  
  // Function breakdown
  analysis += '\nFunction Breakdown:\n';
  analysis += `- ${readFunctions.length} read functions\n`;
  analysis += `- ${writeFunctions.length} write functions\n`;
  
  // Key features
  analysis += '\nKey Features:\n';
  if (hasOwnership) {
    analysis += '- Has ownership control (Ownable pattern)\n';
  }
  
  if (hasAccessControl) {
    analysis += '- Implements role-based access control\n';
  }
  
  if (hasPausable) {
    analysis += '- Contract can be paused (emergency stop mechanism)\n';
  }
  
  if (hasUpgradeable) {
    analysis += '- Contract is upgradeable\n';
  }
  
  // Contract security considerations
  analysis += '\nSecurity Considerations:\n';
  if (hasUpgradeable) {
    analysis += '- Upgradeable contracts should be verified for secure upgrade mechanisms\n';
  }
  
  if (writeFunctions.some(f => f.name.includes('mint') || f.name.includes('create'))) {
    analysis += '- Contains minting functions - ensure proper access controls\n';
  }
  
  if (writeFunctions.some(f => f.name.includes('burn') || f.name.includes('destroy'))) {
    analysis += '- Contains burning/destruction functions - ensure proper access controls\n';
  }
  
  if (writeFunctions.some(f => f.stateMutability === 'payable')) {
    analysis += '- Contains payable functions - ensure proper fund handling\n';
  }
  
  if (!hasOwnership && !hasAccessControl && writeFunctions.length > 0) {
    analysis += '- No obvious access control - may allow unauthorized operations\n';
  }
  
  // Usage guidance
  analysis += '\nInteraction Guidance:\n';
  
  if (readFunctions.some(f => f.name === 'balanceOf')) {
    analysis += '- Use balanceOf to check token balances\n';
  }
  
  if (writeFunctions.some(f => f.name === 'transfer' || f.name === 'transferFrom')) {
    analysis += '- Use transfer/transferFrom to move tokens\n';
  }
  
  if (writeFunctions.some(f => f.name === 'approve')) {
    analysis += '- Use approve to authorize a spender\n';
  }
  
  return analysis;
};

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, abi } = await request.json();
    
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }
    
    let contractAbi;
    
    // Parse ABI if provided
    if (abi) {
      try {
        contractAbi = JSON.parse(abi);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid ABI format' }, { status: 400 });
      }
    } else {
      // Attempt to get ABI from Hedera's explorer API
      try {
        // Example: use ethers provider to get deployed code
        const provider = new ethers.providers.JsonRpcProvider('https://testnet.hashio.io/api');
        const code = await provider.getCode(contractAddress);
        
        if (code === '0x') {
          return NextResponse.json(
            { error: 'Contract not found or has no deployed code' }, 
            { status: 404 }
          );
        }
        
        // In a real application, you would use a service like Sourcify or Etherscan to get the ABI
        // For this example, we'll return a generic message
        return NextResponse.json({
          analysis: 'Contract exists but ABI was not provided. Please provide an ABI for detailed analysis.'
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to fetch contract data: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    // Analyze the contract ABI
    const analysis = analyzeAbi(contractAbi);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('Contract analysis error:', error);
    return NextResponse.json(
      { error: `Failed to analyze contract: ${error.message}` },
      { status: 500 }
    );
  }
}

async function fetchContractInfoFromMirrorNode(contractAddress: string): Promise<string> {
  // Format the contract ID or address for the mirror node request
  let formattedId = contractAddress;
  
  // If it's a 0x address, use it directly
  if (contractAddress.startsWith('0x')) {
    formattedId = contractAddress;
  } 
  // If it matches Hedera format (0.0.X), we need to extract just the numeric part
  else if (contractAddress.match(/^\d+\.\d+\.\d+$/)) {
    const parts = contractAddress.split('.');
    const contractNum = parts[2];
    formattedId = contractNum;
  }
  // Handle the case where it's a string of hex digits without 0x prefix
  else if (contractAddress.match(/^[0-9a-fA-F]+$/)) {
    formattedId = contractAddress;
  }
  
  console.log('Querying mirror node for contract:', formattedId);
  
  // Fetch from mirror node API (using testnet by default)
  const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${formattedId}`;
  console.log('Mirror node URL:', mirrorNodeUrl);
  
  const response = await fetch(mirrorNodeUrl);
  
  if (!response.ok) {
    throw new Error(`Mirror node response not OK: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('Mirror node data:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
  
  // Format the response as a nice analysis message
  return `
    Contract Analysis for ${data.contract_id || formattedId}:
    -----------------------------
    EVM Address: ${data.evm_address || 'Not available'}
    Created: ${data.created_timestamp || 'Unknown'}
    File ID: ${data.file_id || 'Not available'}
    Admin Key: ${data.admin_key ? 'Has admin key' : 'No admin key'}
    Auto Renew Period: ${data.auto_renew_period ? data.auto_renew_period + ' seconds' : 'None'}
    Expiration Time: ${data.expiry_timestamp || 'No expiration'}
    Memo: ${data.memo || 'None'}
    Balance: ${data.balance || '0'} tinybars
    
    Note: This is a basic analysis. For a more thorough security audit,
    the contract's bytecode or source code should be examined.
  `;
}

async function analyzeContract(contractId: string, operatorId: string, operatorKey: string) {
  // Initialize Hedera client
  let client: Client | null = null;
  
  try {
    client = await initializeClient(operatorId, operatorKey);
    
    // Convert Ethereum-style address to Hedera format if needed
    let hederaContractId;
    try {
      if (contractId.startsWith('0x')) {
        // Convert the hex address to a proper Hedera contract ID
        const contractNum = parseInt(contractId.substring(2), 16);
        console.log('Converted contract number:', contractNum);
        hederaContractId = ContractId.fromString(`0.0.${contractNum}`);
      } else if (contractId.match(/^\d+\.\d+\.\d+$/)) {
        // Already in Hedera format like 0.0.1234
        hederaContractId = ContractId.fromString(contractId);
      } else {
        // Try to extract the numeric part from a string like 000000000000000000000000000000000057f89a
        const matches = contractId.match(/0*([a-f0-9]+)$/i);
        if (matches && matches[1]) {
          const contractNum = parseInt(matches[1], 16);
          console.log('Extracted contract number:', contractNum);
          hederaContractId = ContractId.fromString(`0.0.${contractNum}`);
        } else {
          throw new Error(`Unable to parse contract ID: ${contractId}`);
        }
      }
      console.log('Using Hedera contract ID:', hederaContractId.toString());
    } catch (error) {
      console.error('Error parsing contract ID:', error);
      // Fallback to simple string ID
      console.log('Falling back to simple contract ID');
      hederaContractId = contractId;
    }

    // Instead of using CostQuery with a query on a contract, let's use a very simple approach
    return `
      Contract Analysis for ${typeof hederaContractId === 'string' ? hederaContractId : hederaContractId.toString()}:
      -----------------------------
      Note: Due to query limitations, detailed contract information is not available.
      
      To view full contract details, please visit:
      https://hashscan.io/testnet/contract/${typeof hederaContractId === 'string' ? hederaContractId : hederaContractId.toString()}
      
      For enhanced contract interaction, consider using:
      1. HashIO JSON-RPC relay for reading contract state
      2. The "Interact" page in SmartScope for function calls
      3. A mirror node API for historical data
    `;
  } catch (error) {
    console.error('Error in analyzeContract:', error);
    throw error;
  } finally {
    // No need to close the client as Client.forTestnet() doesn't return a closeable connection
    // The SDK handles connection pooling internally
  }
}

/**
 * Enhance contract analysis with information from the ABI
 */
function enhanceAnalysisWithAbi(analysis: string, abi: any[]): string {
  try {
    // Count function types
    const readFunctions = abi.filter(item => 
      item.type === 'function' && 
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
    );
    
    const writeFunctions = abi.filter(item => 
      item.type === 'function' && 
      item.stateMutability !== 'view' && 
      item.stateMutability !== 'pure'
    );
    
    const events = abi.filter(item => item.type === 'event');
    
    // Create function categories
    const tokenFunctions = abi.filter(item => 
      ['transfer', 'balanceOf', 'totalSupply', 'approve', 'mint', 'burn'].includes(item.name)
    );
    
    const accessControlFunctions = abi.filter(item => 
      ['owner', 'hasRole', 'grantRole', 'revokeRole', 'transferOwnership'].includes(item.name)
    );
    
    const pausableFunctions = abi.filter(item => 
      ['pause', 'unpause', 'paused'].includes(item.name)
    );
    
    // Build analysis
    let abiAnalysis = '\n\n## Contract Interface Analysis\n';
    
    abiAnalysis += `\nThis contract has ${readFunctions.length} read functions, ${writeFunctions.length} write functions, and ${events.length} events.\n`;
    
    if (tokenFunctions.length > 0) {
      abiAnalysis += `\nToken functionality: This appears to be a token contract with functions like ${tokenFunctions.map(f => f.name).join(', ')}.\n`;
    }
    
    if (accessControlFunctions.length > 0) {
      abiAnalysis += `\nAccess control: This contract implements access control with functions like ${accessControlFunctions.map(f => f.name).join(', ')}.\n`;
    }
    
    if (pausableFunctions.length > 0) {
      abiAnalysis += `\nPausable functionality: This contract can be paused and unpaused.\n`;
    }
    
    // Combine with original analysis
    return analysis + abiAnalysis;
  } catch (error) {
    console.warn('Error enhancing analysis with ABI:', error);
    return analysis;
  }
} 