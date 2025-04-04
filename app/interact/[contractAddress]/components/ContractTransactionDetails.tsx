import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Code, HelpCircle, Loader2, Copy, CheckSquare, Info, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';
import { Badge } from '../../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { formatSimpleValue, formatHexValue, copyToClipboard } from '../../../utils/interact-utils';

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
  const [copied, setCopied] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  if (!result) return null;
  
  // Determine what to show
  const hasAnalysis = result.analysis || result.inputAnalysis;
  const hasTransactionHash = result.transactionHash || result.txId;
  const hasTrace = result.executionTrace;
  
  // Get the main result value to display prominently
  let displayValue = result.value || result.result || result.returnValue;
  // If the result is in a nested structure, try to extract it
  if (!displayValue && result.status === "SUCCESS" && typeof result === 'object') {
    // Look for common result properties
    displayValue = result.output || result.data || result.returnData;
  }

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Improve hex value formatting with better type detection and human-readable formatting
  const renderHexValue = (value: string): React.ReactNode => {
    if (!value || typeof value !== 'string') {
      return <span>{value}</span>;
    }
    
    // For non-hex values, return as is
    if (!value.startsWith('0x')) {
      return <span>{value}</span>;
    }
    
    const formatted = formatHexValue(value);
    let friendlyDisplay: React.ReactNode = formatted.display;
    let typeLabel = formatted.type;
    
    // Attempt to make address values more recognizable
    if (formatted.type === 'address' || (value.length === 42 && value.startsWith('0x'))) {
      typeLabel = 'Contract Address';
      friendlyDisplay = (
        <span className="flex items-center gap-1 text-primary">
          {formatted.display} 
          <ExternalLink className="h-3 w-3 inline cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://hashscan.io/testnet/contract/${value}`, '_blank');
            }}
          />
        </span>
      );
    }
    
    // Detect and format boolean values
    if (value === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      typeLabel = 'Boolean';
      friendlyDisplay = <span className="text-red-500 font-medium">false</span>;
    } else if (value === '0x0000000000000000000000000000000000000000000000000000000000000001') {
      typeLabel = 'Boolean';
      friendlyDisplay = <span className="text-green-500 font-medium">true</span>;
    }
    
    // Format integers more readably - try to detect and convert numbers
    if (formatted.type?.includes('int') || value.startsWith('0x')) {
      try {
        const bigIntValue = BigInt(value);
        const decimalValue = bigIntValue.toString();
        if (decimalValue.length < 20) {  // Show decimal for reasonably sized numbers
          typeLabel = 'Number';
          friendlyDisplay = <span className="font-medium">{decimalValue}</span>;
        }
      } catch (e) {
        // Fallback to hex display if parsing fails
      }
    }
    
    // Try to detect strings
    if (value.length > 2 && value.startsWith('0x')) {
      try {
        // Convert hex to string if it looks like ASCII text
        const hex = value.substring(2);
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          const charCode = parseInt(hex.substr(i, 2), 16);
          // Only include printable ASCII characters
          if (charCode >= 32 && charCode <= 126) {
            str += String.fromCharCode(charCode);
          } else if (charCode !== 0) {
            // If we find non-printable, non-zero chars, it's probably not a string
            str = '';
            break;
          }
        }
        
        // If we have a valid string of reasonable length, display it
        if (str && str.length > 1 && str.length < 100) {
          typeLabel = 'Text';
          friendlyDisplay = <span className="font-medium">"{str.trim()}"</span>;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // If we're rendering a read function result, show a simplified display with just the value
    if (isReadFunction) {
      return (
        <div className="flex flex-col">
          <div className="font-mono flex items-center text-base">
            {friendlyDisplay}
            <Button 
              variant="ghost" 
              size="sm"
              className="ml-2 h-6 px-1"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(value);
              }}
            >
              {copied ? <CheckSquare className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          {typeLabel && (
            <span className="text-xs text-primary mt-1 inline-flex items-center gap-1">
              <Info className="h-3 w-3" />
              {typeLabel}
            </span>
          )}
        </div>
      );
    }
    
    // For non-read functions, provide more technical details
    return (
      <div className="flex flex-col">
        <div className="font-mono flex items-center">
          {friendlyDisplay}
          <Button 
            variant="ghost" 
            size="sm"
            className="ml-2 h-5 px-1"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(value);
            }}
          >
            {copied ? <CheckSquare className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        {typeLabel && (
          <span className="text-xs text-primary mt-1 inline-flex items-center gap-1">
            <Info className="h-3 w-3" />
            {typeLabel}
          </span>
        )}
        {formatted.size && (
          <span className="text-xs text-muted-foreground">{formatted.size} bytes</span>
        )}
      </div>
    );
  };
  
  return (
    <Card className="mt-4 overflow-hidden border-blue-100 dark:border-blue-900 shadow-sm">
      <CardHeader className="py-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center">
            <Code className="mr-2 h-4 w-4 text-primary" />
            {isReadFunction ? 'Function Result' : 'Transaction Result'} 
            {hasAnalysis && (
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">
                Analyzed
              </Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        <CardDescription>
          {isReadFunction
            ? `Data returned from "${functionName}" function call`
            : `Details of the "${functionName}" transaction execution`}
        </CardDescription>
      </CardHeader>
      
      {/* Always show the main result value prominently */}
      {displayValue !== undefined && (
        <div className={`px-4 py-3 border-t border-b ${
          isReadFunction 
            ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' 
            : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
        }`}>
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              {isReadFunction 
                ? <><Shield className="h-4 w-4 text-blue-500" /> Function Return Value</>
                : <><CheckSquare className="h-4 w-4 text-green-500" /> Transaction Result</>
              }
            </h3>
            {typeof displayValue === 'string' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(displayValue as string);
                }}
              >
                {copied ? <CheckSquare className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            )}
          </div>

          {/* Simplified display for read functions */}
          {isReadFunction ? (
            <div className="pl-3 border-l-2 border-blue-400 dark:border-blue-600 bg-white/80 dark:bg-gray-900/80 p-3 rounded shadow-sm">
              {typeof displayValue === 'string' && displayValue.startsWith('0x') 
                ? renderHexValue(displayValue)
                : (
                  <div className="font-mono text-base">
                    {formatSimpleValue(displayValue)}
                  </div>
                )
              }
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-green-400 dark:border-green-600 bg-white/80 dark:bg-gray-900/80 p-3 rounded shadow-sm">
              {typeof displayValue === 'string' && displayValue.startsWith('0x') 
                ? renderHexValue(displayValue) 
                : (
                  <pre className="font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
                    {formatSimpleValue(displayValue)}
                  </pre>
                )
              }
            </div>
          )}

          <div className="mt-2 text-xs text-muted-foreground">
            {isReadFunction 
              ? 'Value returned directly from the smart contract storage'
              : 'Final result of executing the contract function on the blockchain'
            }
          </div>
        </div>
      )}
      
      {/* State changes if available - with improved formatting */}
      {result.stateChanges && Object.keys(result.stateChanges).length > 0 && (
        <div className="px-4 py-3 border-t border-b bg-purple-50/50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              <Info className="h-4 w-4 text-purple-500" />
              Contract State Changes
            </h3>
          </div>
          <div className="pl-3 border-l-2 border-purple-400 dark:border-purple-600 bg-white/80 dark:bg-gray-900/80 p-3 rounded shadow-sm">
            {Object.entries(result.stateChanges).map(([key, change]: [string, any]) => (
              <div key={key} className="mb-3 last:mb-0">
                <div className="text-sm font-medium">{key}:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <div className="text-xs text-red-600 dark:text-red-400 mb-1 font-medium">Before:</div>
                    {typeof change.before === 'string' && change.before.startsWith('0x')
                      ? renderHexValue(change.before)
                      : <code className="text-xs">{formatSimpleValue(change.before)}</code>
                    }
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1 font-medium">After:</div>
                    {typeof change.after === 'string' && change.after.startsWith('0x')
                      ? renderHexValue(change.after)
                      : <code className="text-xs">{formatSimpleValue(change.after)}</code>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Shows how storage variables in the contract were modified by this transaction
          </div>
        </div>
      )}
      
      {expanded && (
        <CardContent className="pb-4 pt-4">
          <div className="flex justify-between items-center mb-4 cursor-pointer" 
               onClick={() => setDetailsExpanded(!detailsExpanded)}>
            <h3 className="text-sm font-medium flex items-center gap-1">
              <Info className="h-4 w-4 text-primary" />
              Technical Details
            </h3>
            {detailsExpanded ? 
              <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </div>

          {detailsExpanded && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-muted/50">
                <TabsTrigger value="request" className="text-xs data-[state=active]:bg-background">
                  {isReadFunction ? "Function Call" : "Transaction Input"}
                </TabsTrigger>
                <TabsTrigger value="response" className="text-xs data-[state=active]:bg-background">
                  {isReadFunction ? "Response Data" : "Execution Result"}
                </TabsTrigger>
                {!isReadFunction && (
                  <TabsTrigger value="tx" className="text-xs data-[state=active]:bg-background">
                    Blockchain Record
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="request" className="space-y-4">
                {/* Function Input Parameters - More friendly presentation */}
                {result.inputs && result.inputs.length > 0 && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Info className="h-4 w-4 text-blue-500" />
                      Parameters Sent to Contract
                    </h4>
                    <div className="overflow-hidden border rounded-md divide-y">
                      {result.inputs.map((input: any, index: number) => (
                        <div key={index} className="p-3 flex flex-col md:flex-row text-sm hover:bg-muted/40">
                          <div className="w-full md:w-1/3 font-medium text-primary mb-1 md:mb-0">
                            {input.name || `Parameter ${index + 1}`}
                            <span className="ml-1 text-xs font-mono text-muted-foreground">({input.type})</span>
                          </div>
                          <div className="w-full md:w-2/3 font-mono break-all">
                            {typeof input.value === 'string' && input.value.startsWith('0x')
                              ? renderHexValue(input.value)
                              : formatSimpleValue(input.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      These values were passed to the contract function when it was called
                    </div>
                  </div>
                )}
                
                {hasTrace && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Info className="h-4 w-4 text-blue-500" />
                      Function Call Trace
                    </h4>
                    <pre className="text-xs font-mono overflow-x-auto p-3 bg-slate-100 dark:bg-slate-800 rounded max-h-[200px]">
                      {typeof result.executionTrace === 'string' 
                        ? result.executionTrace 
                        : formatSimpleValue(result.executionTrace)}
                    </pre>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Detailed technical trace of how the function was executed
                    </div>
                  </div>
                )}
                
                {/* Gas Info - With explanation */}
                {(result.gasEstimate || result.gasLimit || result.gasPrice) && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Info className="h-4 w-4 text-amber-500" />
                      Gas Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.gasEstimate && (
                        <div>
                          <div className="text-xs text-primary font-medium mb-1">Gas Estimate:</div>
                          <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            {formatSimpleValue(result.gasEstimate)}
                          </div>
                        </div>
                      )}
                      {result.gasLimit && (
                        <div>
                          <div className="text-xs text-primary font-medium mb-1">Gas Limit:</div>
                          <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            {formatSimpleValue(result.gasLimit)}
                          </div>
                        </div>
                      )}
                      {result.gasPrice && (
                        <div>
                          <div className="text-xs text-primary font-medium mb-1">Gas Price:</div>
                          <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                            {formatSimpleValue(result.gasPrice)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Gas is the computational cost unit for executing blockchain transactions
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="response" className="space-y-4">
                {result.result !== undefined && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Result Value
                    </h4>
                    {typeof result.result === 'string' && result.result.startsWith('0x')
                      ? <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                          {renderHexValue(result.result)}
                        </div>
                      : <pre className="font-mono text-xs overflow-x-auto p-3 bg-slate-100 dark:bg-slate-800 rounded whitespace-pre-wrap break-all">
                          {formatSimpleValue(result.result)}
                        </pre>
                    }
                    <div className="mt-2 text-xs text-muted-foreground">
                      {isReadFunction 
                        ? 'Raw value returned by the contract function'
                        : 'Result of the contract function execution'
                      }
                    </div>
                  </div>
                )}
                
                {/* Decoded outputs with better explanations */}
                {result.analysis?.outputs && result.analysis.outputs.length > 0 && (
                  <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-1">
                        <Info className="h-4 w-4 text-green-500" />
                        Decoded Output Values
                      </h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                              <HelpCircle className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Human-readable decoded values returned from the contract function</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="overflow-hidden border rounded-md divide-y">
                      {result.analysis.outputs.map((output: any, index: number) => (
                        <div key={index} className="p-3 flex flex-col md:flex-row text-sm hover:bg-muted/40">
                          <div className="w-full md:w-1/3 font-medium text-primary mb-1 md:mb-0">
                            {output.name || `Output ${index + 1}`}
                            <span className="ml-1 text-xs font-mono text-muted-foreground">({output.type})</span>
                          </div>
                          <div className="w-full md:w-2/3 font-mono break-all">
                            {typeof output.value === 'string' && output.value.startsWith('0x')
                              ? renderHexValue(output.value)
                              : formatSimpleValue(output.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      These values are the decoded and labeled outputs from the contract function call
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {!isReadFunction && (
                <TabsContent value="tx" className="space-y-4">
                  {/* Transaction Hash - With link to explorer */}
                  {hasTransactionHash && (
                    <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium flex items-center gap-1">
                          <Shield className="h-4 w-4 text-primary" />
                          Transaction Record
                        </h4>
                        <div className="flex space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(result.transactionHash || result.txId);
                                  }}
                                >
                                  {copied ? <CheckSquare className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Copy transaction hash</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7"
                                  onClick={() => window.open(`https://hashscan.io/testnet/transaction/${result.transactionHash || result.txId}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">View on HashScan Explorer</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded flex items-center">
                        <code className="font-mono text-xs overflow-x-auto flex-1">
                          {result.transactionHash || result.txId}
                        </code>
                        <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <a 
                            href={`https://hashscan.io/testnet/transaction/${result.transactionHash || result.txId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            View on Explorer <ExternalLink className="h-3 w-3" />
                          </a>
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Permanent record of this transaction on the blockchain
                      </div>
                    </div>
                  )}
                  
                  {/* Transaction Status - With clearer status indicators */}
                  {result.status && (
                    <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Info className="h-4 w-4 text-blue-500" />
                        Transaction Status
                      </h4>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        result.status === 'SUCCESS' || result.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {result.status === 'SUCCESS' || result.status === 'success'
                          ? <><CheckSquare className="h-4 w-4 mr-1" /> Success</>
                          : <><AlertTriangle className="h-4 w-4 mr-1" /> {result.status}</>
                        }
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Whether the transaction was successfully processed on the blockchain
                      </div>
                    </div>
                  )}
                  
                  {/* Gas Used - With explanation */}
                  {result.gasUsed && (
                    <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Info className="h-4 w-4 text-amber-500" />
                        Gas Used
                      </h4>
                      <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                        {formatSimpleValue(result.gasUsed)}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Actual computational resources consumed by this transaction
                      </div>
                    </div>
                  )}
                  
                  {/* Events with better visual hierarchy */}
                  {result.events && result.events.length > 0 && (
                    <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Info className="h-4 w-4 text-purple-500" />
                        Events Emitted
                      </h4>
                      <div className="divide-y border rounded-md overflow-hidden">
                        {result.events.map((event: any, index: number) => (
                          <div key={index} className="p-3 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm flex items-center gap-1">
                                <Badge className="h-5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                                  Event
                                </Badge>
                                {event.name || `Event ${index + 1}`}
                              </span>
                            </div>
                            {event.args && (
                              <div className="space-y-2 mt-2">
                                <div className="text-xs font-medium text-muted-foreground">Event Parameters:</div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded divide-y divide-slate-200 dark:divide-slate-700">
                                  {Object.entries(event.args).map(([key, value]: [string, any]) => (
                                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs py-2 first:pt-0 last:pb-0">
                                      <div className="text-primary font-medium">{key}:</div>
                                      <div className="col-span-1 md:col-span-2 font-mono break-all">
                                        {typeof value === 'string' && value.startsWith('0x')
                                          ? renderHexValue(value)
                                          : formatSimpleValue(value)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Notifications published by the contract when the transaction executed
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ContractTransactionDetails; 