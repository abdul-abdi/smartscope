import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  formatToEvmAddress, 
  executeJsonRpcCall 
} from '../../utils/contract-utils';

export async function POST(request: Request) {
  try {
    const { 
      contractAddress, 
      functionName, 
      parameters = [], 
      abi 
    } = await request.json();

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    if (!functionName) {
      return NextResponse.json({ error: 'Function name is required' }, { status: 400 });
    }
    
    // Format contract address to EVM format
    const evmAddress = formatToEvmAddress(contractAddress);
    
    // Find the function in the ABI
    let functionAbi;
    if (abi && Array.isArray(abi)) {
      functionAbi = abi.find(item => 
        item.name === functionName && 
        item.type === 'function'
      );
    }
    
    if (!functionAbi) {
      console.warn(`Function '${functionName}' not found in the provided ABI`);
    }
    
    try {
      // Create a contract interface
      const iface = new ethers.utils.Interface(functionAbi ? [functionAbi] : []);
      
      // Encode function call with parameters
      const inputTypes = functionAbi ? functionAbi.inputs.map((input: any) => input.type) : [];
      const inputValues = parameters.map((param: any) => param.value);
      
      // For functions not in ABI, use a simple approach
      let data;
      try {
        data = iface.encodeFunctionData(functionName, inputValues);
      } catch (encodeError) {
        // Fallback for simple functions - just use the function selector
        const functionSignature = `${functionName}(${inputTypes.join(',')})`;
        data = ethers.utils.id(functionSignature).slice(0, 10);
      }
      
      // Prepare the transaction object for gas estimation
      const txObject = {
        to: evmAddress,
        data,
        // For payable functions, you might want to include a value
        value: '0x0'
      };
      
      // Estimate gas using eth_estimateGas JSON-RPC method
      const gasEstimate = await executeJsonRpcCall('eth_estimateGas', [txObject]);
      
      // Return the gas estimate
      return NextResponse.json({ 
        gasEstimate,
        estimatedGasInGwei: parseInt(gasEstimate, 16) / 1e9,
        estimatedCost: `${(parseInt(gasEstimate, 16) * 10) / 1e9} HBAR (assuming 10 GWEI gas price)`
      });
    } catch (error: any) {
      // Look for specific error messages
      const errorMessage = error.message || 'Gas estimation failed';
      
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('exceeds block gas limit')) {
        userFriendlyError = 'Transaction would exceed the block gas limit. This operation may be too complex to execute.';
      } else if (errorMessage.includes('always failing')) {
        userFriendlyError = 'Transaction would fail. Check your parameters and contract state.';
      } else if (errorMessage.includes('revert')) {
        userFriendlyError = 'Transaction would revert. Check your parameters or contract conditions.';
      }
      
      return NextResponse.json({ 
        error: userFriendlyError,
        details: errorMessage
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error estimating gas:', error);
    return NextResponse.json({ 
      error: error.message || 'Gas estimation failed' 
    }, { status: 500 });
  }
} 