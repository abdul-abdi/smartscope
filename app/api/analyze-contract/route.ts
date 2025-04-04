import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
import { ContractFunction } from '../../types/contract';
import { formatToEvmAddressAsync, getContractBytecode } from '../../utils/contract-utils';
import { ContractError, ContractErrorCode, ErrorService } from '../../utils/error-service';

// Load environment variables
dotenv.config();

// Common security patterns to check for in bytecode and ABI
const SECURITY_PATTERNS = [
  {
    name: 'Reentrancy Guard',
    pattern: /nonReentrant|reentrancyGuard|_notEntered/i,
    description: 'Uses reentrancy protection to prevent recursive calls',
    severity: 'positive'
  },
  {
    name: 'Unchecked External Calls',
    pattern: /call\{value/i,
    description: 'Uses low-level calls without proper checks',
    severity: 'warning'
  },
  {
    name: 'Integer Overflow/Underflow',
    pattern: /SafeMath|safe[A-Z]/i,
    description: 'Uses SafeMath or safe arithmetic operations',
    severity: 'positive'
  },
  {
    name: 'Access Control',
    pattern: /onlyOwner|Ownable|AccessControl|auth|require\(msg.sender/i,
    description: 'Implements access control mechanisms',
    severity: 'positive'
  },
  {
    name: 'Self Destruct',
    pattern: /selfdestruct|suicide/i,
    description: 'Contains self-destruct functionality',
    severity: 'warning'
  },
  {
    name: 'Timestamp Dependence',
    pattern: /block\.timestamp/i,
    description: 'Uses block timestamp which can be manipulated by miners',
    severity: 'info'
  },
  {
    name: 'Delegatecall',
    pattern: /delegatecall/i,
    description: 'Uses delegatecall which can be dangerous if not properly secured',
    severity: 'warning'
  },
  {
    name: 'ERC20 Compliance',
    pattern: /ERC20|IERC20|totalSupply|balanceOf|transfer\(|transferFrom|approve|allowance/i,
    description: 'Appears to implement ERC20 token standard',
    severity: 'info'
  },
  {
    name: 'ERC721 Compliance',
    pattern: /ERC721|IERC721|ownerOf|safeTransferFrom|transferFrom|approve|getApproved|setApprovalForAll|isApprovedForAll/i,
    description: 'Appears to implement ERC721 NFT standard',
    severity: 'info'
  }
];

// Common optimization patterns
const OPTIMIZATION_PATTERNS = [
  {
    name: 'Gas Optimization',
    pattern: /unchecked|\+\+i|i\+\+|--i|i--|\+=|\-=|\*=|\/=/i,
    description: 'Uses gas optimization techniques',
    severity: 'positive'
  },
  {
    name: 'Storage Packing',
    pattern: /uint8|uint16|uint32|uint64|bytes1|bytes2|bytes4|bytes8|bytes16|bytes32/i,
    description: 'Uses smaller integer types which can be packed together',
    severity: 'positive'
  },
  {
    name: 'Memory vs Storage',
    pattern: /memory|storage/i,
    description: 'Explicitly declares memory/storage usage',
    severity: 'positive'
  }
];

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
    const { contractAddress, abi, includeDetectedFunctions } = await request.json();

    if (!contractAddress) {
      throw new ContractError(
        'Contract address is required',
        ContractErrorCode.MISSING_PARAMETER
      );
    }

    // Format the address to EVM format
    const evmAddress = await formatToEvmAddressAsync(contractAddress);

    // Get contract bytecode
    const bytecode = await getContractBytecode(evmAddress);

    if (!bytecode || bytecode === '0x') {
      throw new ContractError(
        'Contract not found or has no deployed code',
        ContractErrorCode.CONTRACT_NOT_FOUND
      );
    }

    let contractAbi: any[] = [];
    let detectedFunctions: any[] = [];

    // Parse ABI if provided
    if (abi) {
      try {
        contractAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;
      } catch (error) {
        throw new ContractError(
          'Invalid ABI format',
          ContractErrorCode.ABI_PARSING_ERROR
        );
      }
    } else {
      // If no ABI provided, return a message but still provide bytecode analysis
      return NextResponse.json({
        analysis: 'Contract exists but ABI was not provided. Basic analysis is provided below.',
        bytecodeSize: bytecode.length / 2 - 1, // Convert hex to bytes
        contractAddress: evmAddress,
        recommendations: [
          'Provide an ABI for more detailed analysis',
          'Check HashScan for verified source code',
          'Use the Interact feature to explore contract functions'
        ]
      });
    }

    // Try to detect functions from bytecode if requested
    if (includeDetectedFunctions) {
      try {
        // Get potential function selectors from bytecode
        const selectorRegex = /63([0-9a-f]{8})/gi;
        let match;
        const selectors = new Set<string>();
        
        while ((match = selectorRegex.exec(bytecode)) !== null) {
          selectors.add("0x" + match[1]);
        }
        
        console.log(`Found ${selectors.size} potential function selectors in bytecode`);
        
        // Try to resolve selectors to function signatures using 4byte directory
        if (selectors.size > 0) {
          const resolvedSignatures = new Map<string, any>();
          
          // Process selectors in batches to avoid excessive API calls
          const selectorBatches = Array.from(selectors).reduce((acc, selector, i) => {
            const batchIndex = Math.floor(i / 10);
            if (!acc[batchIndex]) acc[batchIndex] = [];
            acc[batchIndex].push(selector);
            return acc;
          }, [] as string[][]);
          
          for (const batch of selectorBatches) {
            await Promise.all(batch.map(async (selector) => {
              try {
                const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
                if (response.ok) {
                  const data = await response.json();
                  if (data.results && data.results.length > 0) {
                    // Get the most likely signature (highest ID is usually newest)
                    const signature = data.results[data.results.length - 1].text_signature;
                    resolvedSignatures.set(selector, signature);
                  }
                }
              } catch (error) {
                console.warn(`Failed to resolve selector ${selector}:`, error);
              }
            }));
          }
          
          // Convert signatures to ABI-like format
          detectedFunctions = Array.from(resolvedSignatures.entries()).map(([selector, signature]) => {
            try {
              // Parse signature like "transfer(address,uint256)"
              const funcNameMatch = signature.match(/^([^(]+)\(/);
              const funcName = funcNameMatch ? funcNameMatch[1] : "unknown";
              
              // Parse parameters
              const paramsMatch = signature.match(/\((.*)\)/);
              const paramsStr = paramsMatch ? paramsMatch[1] : "";
              
              const inputs = paramsStr.split(',').filter(Boolean).map((param, i) => {
                const components = param.trim().split(' ');
                const type = components[0] || 'unknown';
                const name = components[1] || `param${i}`;
                return { type, name };
              });
              
              // Find if this function already exists in the contractAbi
              const existingFunc = contractAbi.find(item => {
                if (item.type !== 'function') return false;
                if (item.name !== funcName) return false;
                if (item.inputs.length !== inputs.length) return false;
                
                // Check if parameter types match
                return item.inputs.every((input, index) => 
                  input.type === inputs[index].type);
              });
              
              // Only include if not already in ABI
              if (!existingFunc) {
                return {
                  type: 'function',
                  name: funcName,
                  inputs,
                  outputs: [],
                  stateMutability: 'nonpayable', // Default assumption
                  humanReadableSignature: signature,
                  selector
                };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to parse signature ${signature}:`, error);
              return null;
            }
          }).filter(Boolean);
          
          console.log(`Resolved ${detectedFunctions.length} additional functions from bytecode`);
        }
      } catch (error) {
        console.warn('Error detecting functions from bytecode:', error);
      }
    }

    // Analyze the contract ABI
    const abiAnalysis = analyzeAbi(contractAbi);

    // Analyze bytecode for common patterns
    const bytecodeAnalysis = analyzeBytecode(bytecode);

    // Combine analyses
    const combinedAnalysis = `${abiAnalysis}\n\n${bytecodeAnalysis}`;

    // Generate security score
    const securityScore = calculateSecurityScore(contractAbi, bytecode);

    const response: any = {
      analysis: combinedAnalysis,
      securityScore: securityScore.score,
      securityBreakdown: securityScore.breakdown,
      contractAddress: evmAddress,
      bytecodeSize: bytecode.length / 2 - 1,
      functionCount: contractAbi.filter(item => item.type === 'function').length,
      eventCount: contractAbi.filter(item => item.type === 'event').length
    };
    
    // Include detected functions if requested and available
    if (includeDetectedFunctions && detectedFunctions.length > 0) {
      response.detectedFunctions = detectedFunctions;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    const standardError = error instanceof ContractError
      ? error
      : ErrorService.parseError(error);

    ErrorService.logError(error, { endpoint: 'analyze-contract' });

    return NextResponse.json(
      standardError.toResponse(),
      { status: 400 }
    );
  }
}

/**
 * Analyze bytecode for common patterns and security issues
 */
function analyzeBytecode(bytecode: string): string {
  // Convert bytecode to string for analysis
  const bytecodeStr = bytecode.toString();

  // Check for security patterns
  const securityFindings = SECURITY_PATTERNS.map(pattern => {
    const matches = bytecodeStr.match(pattern.pattern);
    return {
      name: pattern.name,
      found: !!matches,
      description: pattern.description,
      severity: pattern.severity
    };
  }).filter(finding => finding.found);

  // Check for optimization patterns
  const optimizationFindings = OPTIMIZATION_PATTERNS.map(pattern => {
    const matches = bytecodeStr.match(pattern.pattern);
    return {
      name: pattern.name,
      found: !!matches,
      description: pattern.description,
      severity: pattern.severity
    };
  }).filter(finding => finding.found);

  // Generate bytecode analysis text
  let analysis = '## Bytecode Analysis\n\n';

  // Add bytecode size information
  const bytecodeSize = bytecode.length / 2 - 1; // Convert hex to bytes
  analysis += `Bytecode Size: ${bytecodeSize} bytes\n\n`;

  // Add security findings
  if (securityFindings.length > 0) {
    analysis += '### Security Findings\n\n';
    securityFindings.forEach(finding => {
      const icon = finding.severity === 'positive' ? '✅' :
                  finding.severity === 'warning' ? '⚠️' : 'ℹ️';
      analysis += `${icon} **${finding.name}**: ${finding.description}\n`;
    });
    analysis += '\n';
  }

  // Add optimization findings
  if (optimizationFindings.length > 0) {
    analysis += '### Optimization Findings\n\n';
    optimizationFindings.forEach(finding => {
      analysis += `✅ **${finding.name}**: ${finding.description}\n`;
    });
    analysis += '\n';
  }

  // Add security recommendations
  analysis += '### Security Recommendations\n\n';

  // Check for missing reentrancy protection
  if (!securityFindings.some(f => f.name === 'Reentrancy Guard')) {
    analysis += '⚠️ Consider implementing reentrancy guards for functions that perform external calls.\n';
  }

  // Check for unchecked external calls
  if (securityFindings.some(f => f.name === 'Unchecked External Calls')) {
    analysis += '⚠️ Ensure all external calls are checked for success and handle failures appropriately.\n';
  }

  // Check for missing SafeMath
  if (!securityFindings.some(f => f.name === 'Integer Overflow/Underflow')) {
    analysis += '⚠️ Consider using SafeMath or Solidity 0.8+ built-in overflow checking for arithmetic operations.\n';
  }

  // Check for self-destruct
  if (securityFindings.some(f => f.name === 'Self Destruct')) {
    analysis += '⚠️ The contract contains self-destruct functionality. Ensure it is properly secured with access controls.\n';
  }

  // Add general recommendations
  analysis += 'ℹ️ Consider having your contract audited by a professional security firm.\n';

  return analysis;
}

/**
 * Calculate a security score based on contract analysis
 */
function calculateSecurityScore(abi: any[], bytecode: string): { score: number; breakdown: any } {
  // Convert bytecode and ABI to string for analysis
  const bytecodeStr = bytecode.toString();
  const abiStr = JSON.stringify(abi);
  const codeToAnalyze = bytecodeStr + ' ' + abiStr;

  // Check for security patterns
  const securityFindings = SECURITY_PATTERNS.map(pattern => {
    const matches = codeToAnalyze.match(pattern.pattern);
    return {
      name: pattern.name,
      found: !!matches,
      description: pattern.description,
      severity: pattern.severity
    };
  }).filter(finding => finding.found);

  // Calculate base score
  let score = 50; // Start with neutral score

  // Adjust score based on findings
  securityFindings.forEach(finding => {
    if (finding.severity === 'positive') {
      score += 10;
    } else if (finding.severity === 'warning') {
      score -= 15;
    } else if (finding.severity === 'info') {
      score += 5;
    }
  });

  // Check for access control
  const hasAccessControl = abi.some((func: any) =>
    func.name === 'owner' ||
    func.name === 'hasRole' ||
    func.name === 'onlyOwner'
  );

  if (hasAccessControl) {
    score += 10;
  } else {
    score -= 10;
  }

  // Check for pausable functionality
  const hasPausable = abi.some((func: any) =>
    func.name === 'pause' ||
    func.name === 'unpause' ||
    func.name === 'paused'
  );

  if (hasPausable) {
    score += 5;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Create breakdown of score factors
  const breakdown = {
    securityPatterns: securityFindings.length,
    accessControl: hasAccessControl,
    pausable: hasPausable,
    bytecodeSize: bytecode.length / 2 - 1,
    findings: securityFindings
  };

  return { score, breakdown };
}

