import { NextResponse } from 'next/server';
import * as solc from 'solc';
import parser from '@solidity-parser/parser';
import { logError } from '../../utils/helpers';
import { withRetry } from '../../utils/helpers';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid contract code' }, { status: 400 });
    }

    // Basic contract analysis
    let analysisWarnings: string[] = [];
    let analysisErrors: string[] = [];
    let securityScore = 100;
    try {
      const ast = parser.parse(code, { loc: true });
      const analysis = analyzeContract(ast, code);
      analysisWarnings = analysis.warnings;
      analysisErrors = analysis.errors;
      securityScore = analysis.securityScore;
    } catch (parseError: any) {
      logError('Solidity parsing error', parseError, { codeLength: code.length });
      return NextResponse.json({ 
        error: `Parsing error: ${parseError.message}`,
        errorType: 'PARSE_ERROR',
        location: parseError.location
      }, { status: 400 });
    }

    // Don't proceed with compilation if there are critical errors
    if (analysisErrors.length > 0) {
      return NextResponse.json({ 
        error: analysisErrors[0],
        errorType: 'VALIDATION_ERROR',
        errors: analysisErrors,
        warnings: analysisWarnings,
        securityScore,
        compilerVersion: 'N/A'
      }, { status: 400 });
    }

    // Use retry logic for compilation which can sometimes fail due to transient issues
    return await withRetry(() => compileContract(code, analysisWarnings, securityScore));
  } catch (error: any) {
    logError('Error in compile route', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error compiling contract',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

async function compileContract(code: string, analysisWarnings: string[], securityScore: number) {
  try {
    // Setup compiler input
    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: code
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    // Compile contract
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Check for compilation errors
    if (output.errors && output.errors.some((error: any) => error.severity === 'error')) {
      const errorMessages = output.errors
        .filter((error: any) => error.severity === 'error')
        .map((error: any) => error.formattedMessage)
        .join('\n');
      
      return NextResponse.json({ 
        error: errorMessages,
        errorType: 'COMPILATION_ERROR',
        errors: output.errors.filter((error: any) => error.severity === 'error'),
        warnings: analysisWarnings,
        securityScore
      }, { status: 400 });
    }

    // Extract compiled contract data
    const contractName = Object.keys(output.contracts['contract.sol'])[0];
    
    if (!contractName) {
      return NextResponse.json({ 
        error: 'No contract found in the provided code',
        errorType: 'NO_CONTRACT_FOUND',
        warnings: analysisWarnings,
        securityScore
      }, { status: 400 });
    }
    
    const contract = output.contracts['contract.sol'][contractName];

    // Add any warnings to the response
    const compilerWarnings = output.errors?.filter((error: any) => error.severity === 'warning')
      .map((warning: any) => warning.formattedMessage) || [];

    // Combine compiler and analysis warnings
    const warnings = [...compilerWarnings, ...analysisWarnings];

    // Perform additional bytecode analysis
    const bytecodeAnalysis = analyzeBytecode(contract.evm.bytecode.object);
    warnings.push(...bytecodeAnalysis.warnings);
    
    // Update security score based on bytecode analysis
    const updatedSecurityScore = Math.max(0, securityScore - bytecodeAnalysis.securityImpact);

    console.log(`Successfully compiled contract: ${contractName}`);
    
    return NextResponse.json({
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      contractName,
      warnings,
      securityScore: updatedSecurityScore,
      compilerVersion: solc.version(),
      gasEstimates: contract.evm.gasEstimates,
      methodIdentifiers: contract.evm.methodIdentifiers,
      deployedBytecodeSize: contract.evm.deployedBytecode.object.length / 2,
    });
  } catch (error: any) {
    logError('Error in compileContract function', error, { codeSnippet: code.substring(0, 100) });
    throw error; // Let the retry mechanism handle it
  }
}

function analyzeContract(ast: any, code: string): { warnings: string[], errors: string[], securityScore: number } {
  const warnings: string[] = [];
  const errors: string[] = [];
  let securityScore = 100;
  let hasExternalCalls = false;
  let hasReentrancyProtection = false;
  let hasDelegateCall = false;
  let hasUnboundedLoop = false;
  const stateVars = new Set<string>();
  const writtenAfterCall = new Set<string>();

  // Extract all state variables first
  parser.visit(ast, {
    StateVariableDeclaration(node: any) {
      node.variables.forEach((variable: any) => {
        stateVars.add(variable.name);
      });
    }
  });

  // Now do the complete analysis
  parser.visit(ast, {
    ForStatement(node: any) {
      if (!node.test) {
        warnings.push('Unbounded for loop detected. Consider adding a condition to prevent infinite loops.');
        hasUnboundedLoop = true;
        securityScore -= 15;
      }
    },
    WhileStatement(node: any) {
      if (node.test && node.test.type === 'BooleanLiteral' && node.test.value === true) {
        warnings.push('Infinite while loop detected (while(true)). This may cause the transaction to run out of gas.');
        hasUnboundedLoop = true;
        securityScore -= 20;
      }
    },
    ModifierInvocation(node: any) {
      if (node.name.name === 'nonReentrant') {
        hasReentrancyProtection = true;
      }
    },
    FunctionCall(node: any) {
      if (node.expression && 
          node.expression.type === 'MemberAccess') {
        
        // Check for external calls
        if (node.expression.memberName === 'call' || 
            node.expression.memberName === 'transfer' || 
            node.expression.memberName === 'send') {
          hasExternalCalls = true;
          
          // Check return value validation for calls (only low-level calls, not transfer)
          if (node.expression.memberName === 'call' && 
              (!node.parent || node.parent.type !== 'IfStatement' && 
               node.parent.type !== 'BinaryOperation' && 
               node.parent.type !== 'VariableDeclarationStatement')) {
            warnings.push('Unchecked external call detected. Always check the return value of low-level calls.');
            securityScore -= 15;
          }
        }
        
        // Check for delegatecall which is more dangerous
        if (node.expression.memberName === 'delegatecall') {
          hasDelegateCall = true;
          warnings.push('Delegatecall usage detected. Ensure you trust the called contract completely as it can access your entire state.');
          securityScore -= 20;
        }
      }
    },
    ContractDefinition(node: any) {
      if (node.baseContracts) {
        for (const base of node.baseContracts) {
          if (base.baseName.name === 'ReentrancyGuard') {
            hasReentrancyProtection = true;
          }
        }
      }
    },
    ExpressionStatement(node: any) {
      // Check for state variables written after external calls
      if (node.expression.type === 'Assignment' && hasExternalCalls) {
        const varName = node.expression.left.name;
        if (stateVars.has(varName)) {
          writtenAfterCall.add(varName);
        }
      }
    }
  });

  // Post processing
  if (hasExternalCalls && !hasReentrancyProtection && writtenAfterCall.size > 0) {
    warnings.push(`State variable(s) ${Array.from(writtenAfterCall).join(', ')} modified after external calls without reentrancy protection.`);
    securityScore -= 25; // Critical security issue
  }

  // Check for floating pragma
  const pragmaRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)/;
  if (pragmaRegex.test(code)) {
    warnings.push('Floating pragma detected. Consider using a fixed compiler version for production.');
    securityScore -= 5;
  }

  // Check for outdated Solidity version
  const oldVersionRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)\s*0\.[1-7]\.\d+/;
  if (oldVersionRegex.test(code)) {
    warnings.push('Outdated Solidity version detected. Consider using version 0.8.0 or later for built-in overflow protection.');
    securityScore -= 15;
  }

  // Check for contract size
  if (code.length > 24576) {
    warnings.push('Contract code is very large and may exceed deployment size limits on Hedera.');
    securityScore -= 10;
  }

  // Check for use of dangerous functions
  if (code.includes('selfdestruct') || code.includes('suicide')) {
    warnings.push('Use of selfdestruct/suicide detected, which will be deprecated in future Solidity versions.');
    securityScore -= 10;
  }

  if (code.includes('tx.origin')) {
    warnings.push('Use of tx.origin detected, which can lead to phishing attacks. Consider using msg.sender instead.');
    securityScore -= 15;
  }

  // Ensure security score doesn't go below 0
  securityScore = Math.max(0, securityScore);
  
  return { warnings, errors, securityScore };
}

function analyzeBytecode(bytecode: string): { warnings: string[], securityImpact: number } {
  const warnings: string[] = [];
  let securityImpact = 0;
  
  // Check bytecode size
  const bytecodeSize = bytecode.length / 2; // Convert hex string to bytes
  if (bytecodeSize > 24576) { // 24KB bytecode size
    warnings.push(`Bytecode size (${bytecodeSize} bytes) exceeds 24KB and may not deploy on all EVM-compatible chains.`);
    securityImpact += 10;
  }
  
  // Check for bytecode signatures of known vulnerabilities
  // These are simplified examples - real checks would be more complex
  
  // Check for EXTCODESIZE zero-address check (common protection against contract calls)
  // This is a very simplified check - in practice would need more sophisticated analysis
  if (!bytecode.includes('3b') || !bytecode.includes('73000000000000000000000000000000000000000')) {
    warnings.push('May be missing zero-address validation for external contract calls.');
    securityImpact += 5;
  }
  
  return { warnings, securityImpact };
} 