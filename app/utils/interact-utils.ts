import { ContractFunction } from "../types/contract";

/**
 * Helper to determine if a function is read-only
 */
export const isReadOnlyFunction = (func: ContractFunction): boolean => {
  if (!func) return false;

  // Priority 1: Check explicit solidity stateMutability markers - these are definitive
  if (func.stateMutability === 'view' || func.stateMutability === 'pure') return true;
  if (func.stateMutability === 'payable' || func.stateMutability === 'nonpayable') return false;
  
  // Priority 2: Check the constant property (older Solidity versions)
  if (func.constant === true) return true;

  // Priority 3: Check function structure characteristics
  const hasInputs = func.inputs && func.inputs.length > 0;
  const hasOutputs = func.outputs && func.outputs.length > 0;
  
  // If the function has no inputs but has outputs, it's likely a pure getter
  if (!hasInputs && hasOutputs) return true;
  
  // Priority 4: Check name patterns
  const name = func.name.toLowerCase();
  
  // Common read patterns - prefixes and full matches
  const readPatterns = [
    /^get/, /^view/, /^is/, /^has/, /^check/, /^calculate/, /^compute/,
    /^find/, /^total/, /^balance/, /^supply/, /^symbol/, /^read/, /^retrieve/,
    /^name$/, /^symbol$/, /^decimals$/, /^totalSupply$/, /^balanceOf$/,
    /^allowance$/, /^owner$/, /^paused$/, /^version$/
  ];
  
  // Common write patterns - prefixes and full matches
  const writePatterns = [
    /^set/, /^add/, /^remove/, /^delete/, /^update/, /^create/, /^mint/,
    /^burn/, /^transfer/, /^approve/, /^store/, /^write/, /^save/, /^put/,
    /^deposit$/, /^withdraw$/, /^claim$/, /^stake$/, /^unstake$/, /^swap$/,
    /^execute$/, /.*transfer.*/, /.*update.*/, /.*create.*/, /.*delete.*/,
    /.*remove.*/, /.*store.*/, /.*save.*/
  ];
  
  // Check if the function name matches any read pattern
  const isReadPattern = readPatterns.some(pattern => pattern.test(name));
  
  // Check if the function name matches any write pattern
  const isWritePattern = writePatterns.some(pattern => pattern.test(name));
  
  // Write patterns override read patterns when both match
  if (isWritePattern) return false;
  if (isReadPattern) return true;
  
  // Priority 5: Default fallback logic
  // If it has outputs and no clear write pattern, lean toward read-only
  if (hasOutputs) return true;
  
  // Default to non-read (state changing) for safety
  return false;
};

/**
 * Format any values for display (simple version)
 */
export const formatSimpleValue = (value: any): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

/**
 * Format hex values to be more readable
 */
export const formatHexValue = (value: string): { display: string, type?: string, size?: number } => {
  if (!value || typeof value !== 'string' || !value.startsWith('0x')) {
    return { display: value };
  }
  
  // For EVM addresses
  if (value.length === 42) {
    return {
      display: `${value.slice(0, 6)}...${value.slice(-4)}`,
      type: 'EVM Address'
    };
  }
  
  // For transaction hashes
  if (value.length === 66) {
    return {
      display: `${value.slice(0, 10)}...${value.slice(-8)}`,
      type: 'Transaction Hash'
    };
  }
  
  // For data payloads
  if (value.length > 66) {
    return {
      display: `${value.slice(0, 10)}...${value.slice(-8)}`,
      size: Math.floor((value.length - 2) / 2)
    };
  }
  
  return { display: value };
};

/**
 * Group contract functions by type (read/write)
 */
export const groupFunctionsByType = (functions: ContractFunction[], searchQuery: string = '') => {
  const filteredFunctions = functions.filter(f => {
    if (!searchQuery) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return {
    readFunctions: filteredFunctions.filter(f => isReadOnlyFunction(f)),
    writeFunctions: filteredFunctions.filter(f => !isReadOnlyFunction(f))
  };
};

/**
 * Group read functions by common patterns
 */
export const groupReadFunctions = (readFunctions: ContractFunction[]) => {
  const groups: Record<string, ContractFunction[]> = {
    'State & Balances': [],
    'Metadata': [],
    'Permissions': [],
    'Configuration': [],
    'Other Read Functions': []
  };

  readFunctions.forEach(func => {
    // Metadata functions
    if (['name', 'symbol', 'decimals', 'totalSupply', 'version'].includes(func.name)) {
      groups['Metadata'].push(func);
    }
    // State & Balance functions
    else if (func.name.includes('balance') || func.name.includes('total') ||
            func.name.startsWith('get') || func.name.includes('count')) {
      groups['State & Balances'].push(func);
    }
    // Permission functions
    else if (func.name.includes('allowance') || func.name.includes('allowed') ||
            func.name.includes('owner') || func.name.includes('hasRole') ||
            func.name.includes('permission')) {
      groups['Permissions'].push(func);
    }
    // Configuration functions
    else if (func.name.includes('fee') || func.name.includes('rate') ||
            func.name.includes('config') || func.name.includes('param') ||
            func.name.includes('settings')) {
      groups['Configuration'].push(func);
    }
    // Fallback
    else {
      groups['Other Read Functions'].push(func);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, funcs]) => funcs.length > 0)
  );
};

/**
 * Group write functions by common patterns
 */
export const groupWriteFunctions = (writeFunctions: ContractFunction[]) => {
  const groups: Record<string, ContractFunction[]> = {
    'Token Operations': [],
    'Admin Functions': [],
    'Ownership': [],
    'Other Write Functions': []
  };

  writeFunctions.forEach(func => {
    // Token operations
    if (['transfer', 'mint', 'burn', 'approve', 'transferFrom'].includes(func.name)) {
      groups['Token Operations'].push(func);
    }
    // Admin functions
    else if (func.name.startsWith('set') || func.name.includes('admin') ||
            func.name.includes('config') || func.name.includes('update')) {
      groups['Admin Functions'].push(func);
    }
    // Ownership functions
    else if (func.name.includes('owner') || func.name.includes('role') ||
            func.name.includes('grant') || func.name.includes('revoke')) {
      groups['Ownership'].push(func);
    }
    // Fallback
    else {
      groups['Other Write Functions'].push(func);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, funcs]) => funcs.length > 0)
  );
};

/**
 * Copy to clipboard utility
 */
export const copyToClipboard = (text: string): Promise<void> => {
  return navigator.clipboard.writeText(text);
};

/**
 * Enhanced value formatter for contract storage displays
 */
export const formatEnhancedValue = (key: string, value: any): { 
  formatted: string | Record<string, any>, 
  meta?: { type?: string, raw?: string }
} => {
  if (value === null || value === undefined) {
    return { formatted: 'null' };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return { 
      formatted: value.map((item, index) => formatEnhancedValue(`${key}[${index}]`, item).formatted)
    };
  }

  // Format as token balance
  if (key.toLowerCase().includes('balance') || key.endsWith('Balance') ||
      key.toLowerCase().includes('amount') || key.toLowerCase().includes('supply')) {
    try {
      const num = BigInt(value.toString());
      const formatted = (Number(num) / 10**18).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
      });
      return { 
        formatted, 
        meta: { raw: num.toString() }
      };
    } catch {
      return { formatted: value.toString() };
    }
  }

  // Format addresses
  if (typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)) {
    const address = value.toLowerCase();
    return { 
      formatted: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      meta: { type: 'address', raw: address }
    };
  }

  // Format timestamps
  if ((key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline')) &&
      (typeof value === 'string' && /^\d+$/.test(value) || typeof value === 'number')) {
    try {
      const timestamp = Number(value.toString());
      const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
      return { 
        formatted: date.toLocaleString(),
        meta: { type: 'timestamp', raw: value.toString() }
      };
    } catch {
      return { formatted: value.toString() };
    }
  }

  // Generic number formatting
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    try {
      const num = BigInt(value.toString());
      return { 
        formatted: num.toLocaleString(),
        meta: { raw: value }
      };
    } catch {
      return { formatted: value.toString() };
    }
  }

  // Format objects
  if (typeof value === 'object' && value !== null) {
    const formatted: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      formatted[k] = formatEnhancedValue(`${key}.${k}`, v).formatted;
    }
    return { formatted };
  }

  // Format booleans
  if (typeof value === 'boolean') {
    return { 
      formatted: value.toString(),
      meta: { type: 'boolean' }
    };
  }

  return { formatted: value.toString() };
}; 