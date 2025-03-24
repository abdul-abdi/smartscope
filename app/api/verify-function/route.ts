import { ethers } from 'ethers';
import { NextResponse } from 'next/server';
import { 
  formatToEvmAddress, 
  getContractBytecode 
} from '../../utils/contract-utils';

export async function POST(request: Request) {
  try {
    const { contractAddress, functionName, functionType, inputTypes } = await request.json();

    if (!contractAddress || !functionName) {
      return NextResponse.json({ 
        exists: false,
        error: 'Contract address and function name are required' 
      }, { status: 400 });
    }

    console.log(`Verifying function existence: ${functionName}(${inputTypes?.join(',') || ''}) in contract ${contractAddress}`);
    
    // Build the function signature and get its selector
    const inputTypesString = inputTypes ? inputTypes.join(',') : '';
    const functionSignature = `${functionName}(${inputTypesString})`;
    const functionSelector = ethers.utils.id(functionSignature).slice(0, 10); // Take first 10 chars (0x + 8 chars)
    
    console.log(`Function signature: ${functionSignature}`);
    console.log(`Function selector: ${functionSelector}`);

    try {
      // Get contract bytecode using our shared utility function
      const bytecode = await getContractBytecode(contractAddress);
      
      if (!bytecode || bytecode === '0x') {
        return NextResponse.json({ 
          exists: false,
          error: 'Contract does not exist or has no deployed code'
        });
      }
      
      // Check if the function selector is present in the bytecode
      const selectorWithoutPrefix = functionSelector.slice(2); // Remove 0x prefix
      
      const exists = bytecode.includes(selectorWithoutPrefix);
      console.log(`Function selector ${selectorWithoutPrefix} ${exists ? 'FOUND' : 'NOT FOUND'} in bytecode`);
      
      return NextResponse.json({ exists });
    } catch (error: any) {
      return NextResponse.json({ 
        exists: false, 
        error: error.message || 'Failed to verify function existence' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in verify-function endpoint:', error);
    return NextResponse.json({ 
      exists: false, 
      error: error.message || 'Failed to verify function existence' 
    }, { status: 500 });
  }
} 