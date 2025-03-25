import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Database, RefreshCw, Loader2, EyeIcon, Key } from 'lucide-react';

interface ContractStorageProps {
  contractAddress: string;
  abi?: any[]; // Added ABI prop to check available functions
}

const ContractStorage: React.FC<ContractStorageProps> = ({ 
  contractAddress,
  abi = []
}) => {
  const [storageValues, setStorageValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('values');
  
  // Find no-parameter view functions that might represent storage values
  const getCallableFunctions = useCallback(() => {
    if (!abi || !Array.isArray(abi) || abi.length === 0) return [];
    
    return abi.filter(func => 
      func.type === 'function' && 
      (func.stateMutability === 'view' || func.stateMutability === 'pure') &&
      (!func.inputs || func.inputs.length === 0) &&
      func.outputs && func.outputs.length > 0
    ).map(func => func.name);
  }, [abi]);
  
  // Define fetchStorageValues with useCallback before using it in useEffect
  const fetchStorageValues = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const values: Record<string, any> = {};
      const callableFunctions = getCallableFunctions();
      
      // For each callable function, try to call it to get storage values
      for (const funcName of callableFunctions) {
        try {
          const response = await fetch('/api/call-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress,
              functionName: funcName,
              parameters: [],
              isQuery: true,
              abi
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            // Add the value to our storage values object
            values[funcName] = data.result;
          }
        } catch (err) {
          console.log(`Failed to fetch ${funcName}:`, err);
        }
      }
      
      setStorageValues(values);
    } catch (err) {
      console.error('Error fetching storage values:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getCallableFunctions, abi]);
  
  // Fetch storage values when component mounts or relevant data changes
  useEffect(() => {
    fetchStorageValues();
  }, [fetchStorageValues]);
  
  // Format values for display
  const formatValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'null';
    
    // Generic number formatting for potential token/numeric values
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      try {
        const num = BigInt(value.toString());
        return num.toLocaleString();
      } catch {
        return value.toString();
      }
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    return value.toString();
  };
  
  // Get the variable type
  const getVariableType = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'unknown';
    
    // Try to determine type from ABI if available
    if (abi && Array.isArray(abi)) {
      const funcDef = abi.find(func => func.name === key && func.type === 'function');
      if (funcDef && funcDef.outputs && funcDef.outputs.length > 0) {
        return funcDef.outputs[0].type || typeof value;
      }
    }
    
    // Fallback to heuristic determination
    if (typeof value === 'string') {
      if (/^0x[a-fA-F0-9]{40}$/i.test(value)) {
        return 'address';
      } else if (/^\d+$/.test(value)) {
        return 'uint256';
      }
    }
    
    if (typeof value === 'boolean') {
      return 'bool';
    }
    
    if (typeof value === 'object') {
      return 'struct';
    }
    
    return typeof value;
  };
  
  return (
    <Card>
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          Contract State
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchStorageValues}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="values">State Values</TabsTrigger>
            <TabsTrigger value="slots">Storage Layout</TabsTrigger>
          </TabsList>
          
          <TabsContent value="values" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading state values...</span>
              </div>
            ) : Object.keys(storageValues).length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Function</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Type</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(storageValues).map(([key, value]) => (
                      <tr key={key} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm font-medium">{key}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className="font-mono">
                            {getVariableType(key, value)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono break-all">
                          {formatValue(key, value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No readable state values available</p>
                <p className="text-sm mt-1">
                  Contract might not have any readable state variables 
                  or might require parameters to read values.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="slots" className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/10">
              <div className="flex items-center mb-4">
                <Key className="h-4 w-4 mr-2 text-amber-500" />
                <h3 className="font-medium">Storage Layout</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Storage layout information is only available for contracts with verified source code.
              </p>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(`https://hashscan.io/testnet/contract/${contractAddress}`, '_blank')}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Contract on HashScan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ContractStorage; 