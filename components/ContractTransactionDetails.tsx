import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Code, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';

interface TransactionDetailsProps {
  result: any;
  isReadFunction: boolean;
  functionName: string;
}

const ContractTransactionDetails: React.FC<TransactionDetailsProps> = ({
  result,
  isReadFunction,
  functionName
}) => {
  // Start expanded by default to show results immediately
  const [expanded, setExpanded] = useState(true);
  // Default to response tab for read functions to show result immediately
  const [activeTab, setActiveTab] = useState<string>(isReadFunction ? 'response' : 'tx');
  
  if (!result) return null;
  
  // Determine what to show
  const hasAnalysis = result.analysis || result.inputAnalysis;
  const hasTransactionHash = result.transactionHash || result.txId;
  const hasTrace = result.executionTrace;
  
  // Get the main result value to display prominently
  let displayValue = result.value || result.result;
  // If the result is in a nested structure, try to extract it
  if (!displayValue && result.status === "SUCCESS" && typeof result === 'object') {
    // Look for common result properties
    displayValue = result.returnValue || result.output || result.data || result.returnData;
  }
  
  // Format any values for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };
  
  // Format hex values to be more readable
  const formatHexValue = (value: string): React.ReactNode => {
    if (!value || typeof value !== 'string' || !value.startsWith('0x')) {
      return <span>{value}</span>;
    }
    
    // For EVM addresses
    if (value.length === 42) {
      return (
        <div className="flex flex-col">
          <span className="font-mono">
            {value.slice(0, 6)}...{value.slice(-4)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">EVM Address</span>
        </div>
      );
    }
    
    // For transaction hashes
    if (value.length === 66) {
      return (
        <div className="flex flex-col">
          <span className="font-mono">
            {value.slice(0, 10)}...{value.slice(-8)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">Transaction Hash</span>
        </div>
      );
    }
    
    // For data payloads
    if (value.length > 66) {
      return (
        <div className="flex flex-col">
          <span className="font-mono">
            {value.slice(0, 10)}...{value.slice(-8)}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{Math.floor((value.length - 2) / 2)} bytes</span>
        </div>
      );
    }
    
    return <span className="font-mono">{value}</span>;
  };
  
  return (
    <Card className="mt-4 overflow-hidden border-blue-100 dark:border-blue-900">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Code className="mr-2 h-4 w-4" />
            {isReadFunction ? 'Function Call Details' : 'Transaction Details'}
            {hasAnalysis && (
              <Badge variant="secondary" className="ml-2">
                Analyzed
              </Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <CardDescription>
          {isReadFunction
            ? 'What was sent to and returned from the contract function call'
            : 'Details of the blockchain transaction execution'}
        </CardDescription>
      </CardHeader>
      
      {/* Always show the main result value prominently */}
      {displayValue !== undefined && (
        <div className={`px-4 py-3 border-t border-b ${
          isReadFunction 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' 
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
        }`}>
          <div className="flex items-center mb-1">
            <h3 className="text-sm font-semibold">
              {isReadFunction ? 'Return Value:' : 'Transaction Result:'}
            </h3>
          </div>
          <div className="pl-3 border-l-2 border-green-400 dark:border-green-600 bg-white/80 dark:bg-gray-900/80 p-2 rounded">
            <pre className="font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
              {formatValue(displayValue)}
            </pre>
          </div>
        </div>
      )}
      
      {expanded && (
        <CardContent className="pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="request" className="text-xs">
                Request
              </TabsTrigger>
              <TabsTrigger value="response" className="text-xs">
                Response
              </TabsTrigger>
              {!isReadFunction && (
                <TabsTrigger value="tx" className="text-xs">
                  Transaction
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="request" className="space-y-4">
              {hasTrace && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="text-sm font-medium mb-2">Function Call Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Function Name:</p>
                      <p className="font-mono text-sm">{functionName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Contract Address:</p>
                      <p className="font-mono text-sm break-all">{result.executionTrace?.address || 'Unknown'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Call Type:</p>
                      <p className="font-mono text-sm">{result.executionTrace?.callType || (isReadFunction ? 'Read Call' : 'Write Transaction')}</p>
                    </div>
                  </div>
                  
                  {result.executionTrace?.parameters && result.executionTrace.parameters.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Parameters:</p>
                      <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                        {result.executionTrace.parameters.map((param: any, i: number) => (
                          <div key={i} className="text-sm">
                            <span className="font-mono text-blue-600 dark:text-blue-400">param{i}:</span>{' '}
                            {typeof param === 'object' 
                              ? `${param.type || 'unknown'}: ${formatValue(param.value)}`
                              : formatValue(param)
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {result.analysis?.inputs && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center mb-2">
                    <h4 className="text-sm font-medium">Decoded Input Parameters</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Parameters passed to the contract function</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-2">
                    {result.analysis.inputs.map((input: any, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                        <div className="font-medium">{input.name}</div>
                        <div className="text-muted-foreground">{input.type}</div>
                        <div className="font-mono break-all">{formatValue(input.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {result.inputAnalysis?.decodedInput && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="text-sm font-medium mb-2">Transaction Input Data</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Function Signature:</p>
                      <p className="font-mono text-sm">
                        {result.inputAnalysis.decodedInput.name || 'Unknown'}
                        ({result.inputAnalysis.decodedInput.signature && result.inputAnalysis.decodedInput.signature.join(', ')})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Function Selector:</p>
                      <p className="font-mono text-sm">{result.inputAnalysis.decodedInput.selector || result.inputAnalysis.rawInput?.slice(0, 10)}</p>
                    </div>
                    {result.inputAnalysis.decodedInput.args && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Decoded Arguments:</p>
                        <pre className="font-mono text-xs overflow-x-auto p-2 bg-slate-100 dark:bg-slate-800 rounded">
                          {JSON.stringify(result.inputAnalysis.decodedInput.args, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="response" className="space-y-4">
              {result.result !== undefined && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="text-sm font-medium mb-2">Result Value</h4>
                  <pre className="font-mono text-xs overflow-x-auto p-2 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-all">
                    {formatValue(result.result)}
                  </pre>
                </div>
              )}
              
              {result.analysis?.outputs && result.analysis.outputs.length > 0 && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center mb-2">
                    <h4 className="text-sm font-medium">Decoded Output Values</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Values returned from the contract function</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-2">
                    {result.analysis.outputs.map((output: any, i: number) => (
                      <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                        <div className="font-medium">{output.name}</div>
                        <div className="text-muted-foreground">{output.type}</div>
                        <div className="font-mono break-all">{formatValue(output.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {result.decodedLogs && result.decodedLogs.length > 0 && (
                <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="text-sm font-medium mb-2">Emitted Events</h4>
                  <div className="space-y-3">
                    {result.decodedLogs.map((log: any, i: number) => (
                      <div key={i} className="border-l-2 border-amber-400 pl-2 py-1">
                        <p className="font-medium text-sm">{log.name || 'Event'} #{i+1}</p>
                        {log.args && (
                          <pre className="font-mono text-xs overflow-x-auto p-2 bg-slate-100 dark:bg-slate-800 rounded mt-1">
                            {JSON.stringify(log.args, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {!isReadFunction && (
              <TabsContent value="tx" className="space-y-4">
                {hasTransactionHash && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2">Transaction Information</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hash:</p>
                        <p className="font-mono text-sm break-all">{result.transactionHash || result.txId}</p>
                      </div>
                      
                      {result.txData && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Status:</p>
                            <div className="flex items-center">
                              <span className={`h-2 w-2 rounded-full mr-2 ${
                                result.txData.status === '0x1' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              <span className="font-medium">
                                {result.txData.status === '0x1' ? 'Success' : 'Failed'}
                              </span>
                            </div>
                          </div>
                          
                          {result.txData.blockNumber && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Block Number:</p>
                              <p className="font-mono text-sm">{parseInt(result.txData.blockNumber, 16)}</p>
                            </div>
                          )}
                          
                          {result.txData.gasUsed && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Gas Used:</p>
                              <p className="font-mono text-sm">{parseInt(result.txData.gasUsed, 16).toLocaleString()}</p>
                            </div>
                          )}
                          
                          {result.executionTrace?.gasUsed && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Gas Used:</p>
                              <p className="font-mono text-sm">{
                                typeof result.executionTrace.gasUsed === 'string' && result.executionTrace.gasUsed.startsWith('0x')
                                  ? parseInt(result.executionTrace.gasUsed, 16).toLocaleString()
                                  : result.executionTrace.gasUsed
                              }</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {result.inputAnalysis?.transaction && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">From:</p>
                        <p className="font-mono break-all">{formatHexValue(result.inputAnalysis.transaction.from)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">To:</p>
                        <p className="font-mono break-all">{formatHexValue(result.inputAnalysis.transaction.to)}</p>
                      </div>
                      {result.inputAnalysis.transaction.value && result.inputAnalysis.transaction.value !== '0x0' && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Value:</p>
                          <p className="font-mono">
                            {parseInt(result.inputAnalysis.transaction.value, 16).toString()} wei
                          </p>
                        </div>
                      )}
                      {result.inputAnalysis.transaction.nonce && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Nonce:</p>
                          <p className="font-mono">{parseInt(result.inputAnalysis.transaction.nonce, 16)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default ContractTransactionDetails; 