import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../../components/ui/accordion';
import { Database, RefreshCw, Loader2, Key, Search, History, Clock } from 'lucide-react';

interface ContractStorageProps {
  contractAddress: string;
  abi?: any[];
}

interface MappingQuery {
  functionName: string;
  key: string;
  keyType: string;
  result?: any;
  error?: string;
  timestamp?: number;
}

interface StateHistory {
  timestamp: number;
  values: Record<string, any>;
}

const ContractStorage: React.FC<ContractStorageProps> = ({
  contractAddress,
  abi = []
}) => {
  const [storageValues, setStorageValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('values');
  const [mappingQueries, setMappingQueries] = useState<MappingQuery[]>([]);
  const [mappingInput, setMappingInput] = useState({ functionName: '', key: '' });
  const [stateHistory, setStateHistory] = useState<StateHistory[]>([]);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedFunctions, setFailedFunctions] = useState<Record<string, string>>({});
  const [mappingQueryLoading, setMappingQueryLoading] = useState<string | null>(null);

  // Find all view functions that represent storage values
  const getCallableFunctions = useCallback(() => {
    if (!abi || !Array.isArray(abi) || abi.length === 0) return [];

    // Get all view/pure functions with outputs (not just no-parameter ones)
    return abi.filter(func =>
      func.type === 'function' &&
      (func.stateMutability === 'view' || func.stateMutability === 'pure') &&
      func.outputs && func.outputs.length > 0 &&
      (!func.inputs || func.inputs.length === 0) // Only include no-parameter functions
    ).map(func => func.name);
  }, [abi]);

  // Get all view functions (including those with parameters)
  const getAllViewFunctions = useCallback(() => {
    if (!abi || !Array.isArray(abi) || abi.length === 0) return [];

    return abi.filter(func =>
      func.type === 'function' &&
      (func.stateMutability === 'view' || func.stateMutability === 'pure' || func.constant === true) &&
      func.outputs && func.outputs.length > 0
    ).map(func => ({
      name: func.name,
      inputs: func.inputs || [],
      outputs: func.outputs || [],
      stateMutability: func.stateMutability || (func.constant ? 'view' : 'nonpayable')
    }));
  }, [abi]);

  // Find mapping-like functions (view functions with a single parameter)
  const getMappingFunctions = useCallback(() => {
    if (!abi || !Array.isArray(abi) || abi.length === 0) return [];

    return abi.filter(func =>
      func.type === 'function' &&
      (func.stateMutability === 'view' || func.stateMutability === 'pure') &&
      func.inputs && func.inputs.length === 1 &&
      func.outputs && func.outputs.length > 0
    ).map(func => ({
      name: func.name,
      keyType: func.inputs[0].type,
      keyName: func.inputs[0].name || 'key',
      outputType: func.outputs[0].type
    }));
  }, [abi]);

  // Define fetchStorageValues with useCallback before using it in useEffect
  const fetchStorageValues = useCallback(async () => {
    setIsLoading(true);
    setStorageValues({}); // Clear existing values while loading

    try {
      const values: Record<string, any> = {};
      const callableFunctions = getCallableFunctions();

      // Track failed functions to show in UI
      const failedFunctions: Record<string, string> = {};

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
              abi,
              // Include additional parameters for Hedera
              includeCallTrace: true,
              requestId: `storage-${funcName}-${Date.now()}`
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Check if the result is valid
            if (data.result !== undefined) {
              values[funcName] = data.result;
            } else if (data.error) {
              failedFunctions[funcName] = data.error;
              console.warn(`Failed to fetch ${funcName}: ${data.error}`);
            }
          } else {
            const errorData = await response.json();
            failedFunctions[funcName] = errorData.error || 'Unknown error';
            console.warn(`Failed to fetch ${funcName}: ${errorData.error || response.statusText}`);
          }
        } catch (err: any) {
          failedFunctions[funcName] = err.message || 'Error fetching value';
          console.warn(`Failed to fetch ${funcName}:`, err);
        }
      }

      // Save current state to history
      setStateHistory(prev => [
        { timestamp: Date.now(), values: { ...values } },
        ...prev.slice(0, 9) // Keep last 10 states
      ]);

      setStorageValues(values);
      
      // If we have failed functions, store them in state to display in UI
      if (Object.keys(failedFunctions).length > 0) {
        setFailedFunctions(failedFunctions);
      }
    } catch (err: any) {
      console.error('Error fetching storage values:', err);
      setError(err.message || 'Failed to fetch contract state');
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, getCallableFunctions, abi]);

  // Function to query mapping values
  const queryMappingValue = useCallback(async (functionName: string, key: string, keyType: string) => {
    try {
      setMappingQueryLoading(functionName);
      
      // Format the key based on its type
      let formattedKey = key;
      let paramValue: any = key;

      // For address types, ensure proper format
      if (keyType.includes('address') && !key.startsWith('0x')) {
        formattedKey = `0x${key}`;
        paramValue = formattedKey;
      } else if (keyType.includes('uint')) {
        // For uint types, convert string to number when possible
        if (!isNaN(Number(key))) {
          paramValue = key; // Keep as string for large numbers
        }
      } else if (keyType === 'bool') {
        // Handle boolean values
        paramValue = key.toLowerCase() === 'true';
      }

      const response = await fetch('/api/call-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName,
          parameters: [{ type: keyType, value: paramValue }],
          isQuery: true,
          abi,
          // Additional Hedera-specific parameters
          includeCallTrace: true,
          requestId: `mapping-${functionName}-${Date.now()}`
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add to mapping queries
        setMappingQueries(prev => [
          {
            functionName,
            key: formattedKey,
            keyType,
            result: data.result,
            timestamp: Date.now()
          },
          ...prev.filter(q =>
            q.functionName !== functionName ||
            q.key !== formattedKey
          ).slice(0, 9) // Keep last 10 queries
        ]);

        return data.result;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to query mapping');
      }
    } catch (err: any) {
      console.error(`Error querying mapping ${functionName}:`, err);
      
      // Add the error to the mapping queries to display in UI
      setMappingQueries(prev => [
        {
          functionName,
          key,
          keyType,
          error: err.message || 'Failed to query mapping',
          timestamp: Date.now()
        },
        ...prev.filter(q =>
          q.functionName !== functionName ||
          q.key !== key
        ).slice(0, 9)
      ]);
      
      throw err;
    } finally {
      setMappingQueryLoading(null);
    }
  }, [contractAddress, abi]);

  // Fetch storage values when component mounts or relevant data changes
  useEffect(() => {
    fetchStorageValues();
  }, [fetchStorageValues]);

  // Format values for display
  const formatValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'null';

    // Handle arrays
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex">
              <span className="text-xs text-muted-foreground mr-2">[{index}]</span>
              <span>{formatValue(`${key}[${index}]`, item)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Special formatting for known function names
    if (key.toLowerCase().includes('balance') || key.endsWith('Balance') ||
        key.toLowerCase().includes('amount') || key.toLowerCase().includes('supply')) {
      try {
        // Format as token balance with 18 decimals
        const num = BigInt(value.toString());
        const formatted = (Number(num) / 10**18).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        });
        return (
          <div>
            <span className="font-medium">{formatted}</span>
            <span className="text-xs text-muted-foreground ml-2">(raw: {num.toString()})</span>
          </div>
        );
      } catch {
        return value.toString();
      }
    }

    // Format addresses
    if (typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)) {
      const address = value.toLowerCase();
      return (
        <div className="flex items-center">
          <span className="font-mono">{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
          <button
            className="ml-2 text-xs text-blue-500 hover:text-blue-700"
            onClick={() => navigator.clipboard.writeText(address)}
          >
            Copy
          </button>
        </div>
      );
    }

    // Format timestamps
    if ((key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline')) &&
        (typeof value === 'string' && /^\d+$/.test(value) || typeof value === 'number')) {
      try {
        const timestamp = Number(value.toString());
        // Check if it's a Unix timestamp (seconds) or milliseconds
        const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
        return (
          <div>
            <span>{date.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground ml-2">(timestamp: {value.toString()})</span>
          </div>
        );
      } catch {
        return value.toString();
      }
    }

    // Generic number formatting for potential token/numeric values
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      try {
        const num = BigInt(value.toString());
        return num.toLocaleString();
      } catch {
        return value.toString();
      }
    }

    // Format objects
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-1 pl-2 border-l-2 border-gray-200">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex">
              <span className="text-xs font-medium mr-2">{k}:</span>
              <span>{formatValue(`${key}.${k}`, v)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Format booleans
    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600' : 'text-red-600'}>
          {value ? 'true' : 'false'}
        </span>
      );
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

  // Add this util function to simplify date formatting
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          Contract State
        </CardTitle>
        <div className="flex items-center space-x-2">
          {error && (
            <Badge variant="destructive" className="mr-2">
              Error: {error}
            </Badge>
          )}
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
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="values">State Values</TabsTrigger>
            <TabsTrigger value="mappings">Mappings</TabsTrigger>
            <TabsTrigger value="allViews">All View Functions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
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
                
                {/* Show failed functions if any */}
                {Object.keys(failedFunctions).length > 0 && (
                  <div className="mt-4 text-left max-w-md mx-auto border rounded-md p-4 bg-red-50">
                    <p className="text-sm font-medium text-red-800 mb-2">Failed to load some state values:</p>
                    <ul className="space-y-1 text-xs text-red-700">
                      {Object.entries(failedFunctions).map(([func, error]) => (
                        <li key={func}>
                          <span className="font-medium">{func}:</span> {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mappings" className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-amber-500" />
                  <h3 className="font-medium">Mapping Query</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMappingForm(!showMappingForm)}
                >
                  {showMappingForm ? 'Hide Form' : 'Show Form'}
                </Button>
              </div>

              {showMappingForm && (
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <Label htmlFor="mapping-function">Function</Label>
                      <select
                        id="mapping-function"
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={mappingInput.functionName}
                        onChange={(e) => setMappingInput(prev => ({ ...prev, functionName: e.target.value }))}
                      >
                        <option value="">Select a function</option>
                        {getMappingFunctions().map(func => (
                          <option key={func.name} value={func.name}>
                            {func.name}({func.keyType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="mapping-key">Key</Label>
                      <div className="flex mt-1">
                        <Input
                          id="mapping-key"
                          placeholder={mappingInput.functionName ?
                            getMappingFunctions().find(f => f.name === mappingInput.functionName)?.keyType || 'key' :
                            'Select a function first'}
                          value={mappingInput.key}
                          onChange={(e) => setMappingInput(prev => ({ ...prev, key: e.target.value }))}
                          className="flex-1 rounded-r-none"
                        />
                        <Button
                          type="button"
                          className="rounded-l-none"
                          disabled={!mappingInput.functionName || !mappingInput.key.trim() || !!mappingQueryLoading}
                          onClick={() => {
                            const func = getMappingFunctions().find(f => f.name === mappingInput.functionName);
                            if (func) {
                              queryMappingValue(func.name, mappingInput.key, func.keyType);
                            }
                          }}
                        >
                          {mappingQueryLoading === mappingInput.functionName ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Search className="h-4 w-4 mr-2" />
                          )}
                          Query
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mappingQueries.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium">Function</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Key</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Value</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {mappingQueries.map((query, index) => (
                        <tr key={index} className={`hover:bg-muted/20 ${query.error ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium">{query.functionName}</td>
                          <td className="px-4 py-3 text-sm font-mono break-all">{query.key}</td>
                          <td className="px-4 py-3 text-sm font-mono break-all">
                            {query.error ? (
                              <span className="text-red-600">{query.error}</span>
                            ) : (
                              formatValue(query.functionName, query.result)
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {query.timestamp ? formatTimestamp(query.timestamp) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No mapping queries yet</p>
                  <p className="text-sm mt-1">
                    Use the form above to query mapping values
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="allViews" className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Database className="h-4 w-4 mr-2 text-blue-500" />
                  <h3 className="font-medium">All View Functions</h3>
                </div>
              </div>

              {getAllViewFunctions().length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    These are all read-only functions in the contract. Functions with parameters can be called from the main function list.
                  </p>

                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Function</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Parameters</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Returns</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {getAllViewFunctions().map((func, index) => (
                          <tr key={index} className="hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-medium">{func.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {func.inputs.length > 0 ? (
                                <ul className="list-disc list-inside">
                                  {func.inputs.map((input, i) => (
                                    <li key={i} className="text-xs">
                                      {input.name || `param${i}`}: {input.type}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground text-xs">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {func.outputs.map((output, i) => (
                                <span key={i} className="text-xs font-mono">
                                  {output.type}{i < func.outputs.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {func.inputs.length === 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await queryMappingValue(func.name, '', '');
                                    } catch (err) {
                                      console.error(`Failed to call ${func.name}:`, err);
                                    }
                                  }}
                                  disabled={mappingQueryLoading === func.name}
                                >
                                  {mappingQueryLoading === func.name ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                  )}
                                  Call
                                </Button>
                              )}
                              {func.inputs.length === 1 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMappingInput({
                                      functionName: func.name,
                                      key: ''
                                    });
                                    setShowMappingForm(true);
                                    setActiveTab('mappings');
                                  }}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Query
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No view functions found in this contract</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {stateHistory.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {stateHistory.map((entry, index) => (
                  <AccordionItem key={index} value={`history-${index}`}>
                    <AccordionTrigger className="hover:bg-muted/20 px-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-500" />
                        <span>
                          {formatTimestamp(entry.timestamp)}
                          {index === 0 ? ' (Current)' : ''}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">Variable</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {Object.entries(entry.values).map(([key, value]) => (
                              <tr key={key} className="hover:bg-muted/20">
                                <td className="px-4 py-3 text-sm font-medium">{key}</td>
                                <td className="px-4 py-3 text-sm font-mono break-all">
                                  {formatValue(key, value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No state history available</p>
                <p className="text-sm mt-1">
                  Refresh the state values to create history entries
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ContractStorage;