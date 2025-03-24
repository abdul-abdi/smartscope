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
    try {
      const ast = parser.parse(code, { loc: true });
      analysisWarnings = analyzeContract(ast);
    } catch (parseError: any) {
      logError('Solidity parsing error', parseError, { codeLength: code.length });
      return NextResponse.json({ 
        error: `Parsing error: ${parseError.message}`,
        errorType: 'PARSE_ERROR',
        location: parseError.location
      }, { status: 400 });
    }

    // Use retry logic for compilation which can sometimes fail due to transient issues
    return await withRetry(() => compileContract(code, analysisWarnings));
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

async function compileContract(code: string, analysisWarnings: string[]) {
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
        errors: output.errors.filter((error: any) => error.severity === 'error')
      }, { status: 400 });
    }

    // Extract compiled contract data
    const contractName = Object.keys(output.contracts['contract.sol'])[0];
    
    if (!contractName) {
      return NextResponse.json({ 
        error: 'No contract found in the provided code',
        errorType: 'NO_CONTRACT_FOUND'
      }, { status: 400 });
    }
    
    const contract = output.contracts['contract.sol'][contractName];

    // Add any warnings to the response
    const compilerWarnings = output.errors?.filter((error: any) => error.severity === 'warning')
      .map((warning: any) => warning.formattedMessage) || [];

    // Combine compiler and analysis warnings
    const warnings = [...compilerWarnings, ...analysisWarnings];

    console.log(`Successfully compiled contract: ${contractName}`);
    
    return NextResponse.json({
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      contractName,
      warnings,
    });
  } catch (error: any) {
    logError('Error in compileContract function', error, { codeSnippet: code.substring(0, 100) });
    throw error; // Let the retry mechanism handle it
  }
}

function analyzeContract(ast: any): string[] {
  const warnings: string[] = [];
  let hasExternalCalls = false;

  // This is a simplified analyzer to check for common issues
  parser.visit(ast, {
    ForStatement(node: any) {
      if (!node.test) {
        warnings.push('Warning: Unbounded for loop detected. Consider adding a condition to prevent infinite loops.');
      }
    },
    WhileStatement(node: any) {
      if (node.test && node.test.type === 'BooleanLiteral' && node.test.value === true) {
        warnings.push('Warning: Infinite while loop detected (while(true)). This may cause the transaction to run out of gas.');
      }
    },
    FunctionCall(node: any) {
      if (node.expression && 
          node.expression.type === 'MemberAccess' && 
          (node.expression.memberName === 'call' || 
           node.expression.memberName === 'transfer' || 
           node.expression.memberName === 'send')) {
        hasExternalCalls = true;
        warnings.push('Warning: External call detected. Be careful of potential reentrancy vulnerabilities.');
      }
    }
  });
  
  return warnings;
} 