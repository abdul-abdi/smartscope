'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Code, Terminal, Loader2, BookOpen, Pencil, CheckCircle, Check, Info, Search, X, AlertCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import ContractTransactionDetails from '../../../components/ContractTransactionDetails';
import { Badge } from '../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';

interface FunctionInput {
  name: string;
  type: string;
  value: string;
}

interface ContractFunction {
  name: string;
  inputs: FunctionInput[];
  outputs: Array<{ type: string }>;
  stateMutability: string;
  humanReadableSignature?: string;
  verified?: boolean;
  constant?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const InteractPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Clean the contract address by removing any spaces
  const contractAddress = (params.contractAddress as string).trim().replace(/\s+/g, '');
  const encodedAbi = searchParams.get('abi');
  
  const [abi, setAbi] = useState<ContractFunction[]>([]);
  const [functions, setFunctions] = useState<ContractFunction[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [functionInputs, setFunctionInputs] = useState<FunctionInput[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingAbi, setIsLoadingAbi] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('read');
  const [abiSource, setAbiSource] = useState<string>('');
  const [manualBytecode, setManualBytecode] = useState<string>('');
  const [showBytecodeInput, setShowBytecodeInput] = useState<boolean>(false);
  const [bytecodePending, setBytecodePending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: string; message: string } | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [hasWriteFunctionSuggestion, setHasWriteFunctionSuggestion] = useState<boolean>(false);
  const [lastAttemptedParams, setLastAttemptedParams] = useState<string[]>([]);

  const handleManualBytecodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBytecode.trim()) {
      setError('Please provide bytecode data');
      return;
    }

    setBytecodePending(true);
    setError('');
    
    try {
      // Generate a unique timestamp to prevent any caching
      const timestamp = new Date().getTime() + Math.random().toString(36).substring(2, 10);
      const response = await fetch('/api/get-contract-abi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractAddress,
          bytecode: manualBytecode.startsWith('0x') ? manualBytecode : `0x${manualBytecode}`,
          cacheBuster: timestamp,
          forceRefresh: true,
          preferSource: true,
          sourceOnly: true,
          disableTransactionHistory: true,
          analysisMethod: 'bytecode',
          bypassCache: true,
          regenerateAbi: true,
          manualBytecode: true
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze bytecode');
      }
      
      // Process ABI from bytecode analysis
      const abiItems = data.abi.filter((item: any) => item.type === 'function' || !item.type);
        setAbi(abiItems);
        
      // Process functions with signatures
      const functionSignatures = data.functionSignatures || [];
      const functionItems = abiItems.map((item: any, index: number) => ({
          ...item,
          inputs: item.inputs || [],
          outputs: item.outputs || [],
        humanReadableSignature: item.humanReadableSignature || 
                            (functionSignatures[index] ? functionSignatures[index] : undefined)
        }));
        
        setFunctions(functionItems);
      // Always set to manual bytecode source
      setAbiSource('manual-bytecode');
      setShowBytecodeInput(false);
      
    } catch (err: any) {
      setError(err.message || 'Failed to analyze bytecode');
    } finally {
      setBytecodePending(false);
    }
  };

  useEffect(() => {
    async function fetchAbi() {
      if (!contractAddress) return;
      
      setIsLoadingAbi(true);
      setError('');
      setShowBytecodeInput(false);
      
      try {
        // Generate a unique timestamp to prevent any caching
        const timestamp = new Date().getTime() + Math.random().toString(36).substring(2, 10);
        const normalizedAddress = contractAddress.trim();
        
        // Always use direct bytecode analysis, never transaction history
        const response = await fetch('/api/get-contract-abi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractAddress: normalizedAddress,
            cacheBuster: timestamp,
            forceRefresh: true,             // Force fresh data retrieval every time
            preferSource: true,             // Prioritize bytecode analysis
            sourceOnly: true,               // Only use direct bytecode/source
            disableTransactionHistory: true, // Explicitly disable transaction history ABI generation
            analysisMethod: 'bytecode',     // Force bytecode analysis only
            bypassCache: true,              // Skip any cached data
            regenerateAbi: true             // Always regenerate the ABI
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch ABI: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.abi || data.abi.length === 0) {
          throw new Error('Warning: No functions detected in the contract ABI. Try providing bytecode manually for better detection.');
        }
        
        // Process the ABI
        const abiItems = data.abi.filter((item: any) => item.type === 'function' || !item.type);
        setAbi(abiItems);
        
        // Process functions with signatures and ensure stateMutability is properly set
        const functionItems = abiItems.map((item: any, index: number) => {
          // Ensure stateMutability exists (in case it's missing from some ABI functions)
          if (!item.stateMutability) {
            // Default to non-mutating for safety if constant is true
            if (item.constant === true) {
              item.stateMutability = 'view';
            } else {
              // Default to nonpayable for safety
              item.stateMutability = 'nonpayable';
            }
          }
            
          return {
            ...item,
            inputs: item.inputs || [],
            outputs: item.outputs || [],
            humanReadableSignature: item.humanReadableSignature || 
                          (data.functionSignatures && data.functionSignatures[index] 
                          ? data.functionSignatures[index] : undefined)
          };
        });
        
        setFunctions(functionItems);
        // Always set source to bytecode to ensure consistency
        setAbiSource('bytecode');
        
        // Clear any previous state
        setSelectedFunction(null);
        setFunctionInputs([]);
        setResult(null);
        
        if (data.message) {
          // Display warning but continue with the ABI if available
          if (data.abi && data.abi.length > 0) {
            setError(`Warning: ${data.message}`);
          } else {
            throw new Error(data.message);
          }
        }
      } catch (err: any) {
        console.error('Error fetching ABI:', err);
        
        // Handle specific error cases
        if (err.message.includes('not found') || err.message.includes('does not exist')) {
          setError(`Contract not found. Please verify the address is correct.`);
        } else if (err.message.includes('bytecode')) {
          setError(`${err.message} Click the "Provide Bytecode Manually" button below to enter bytecode.`);
          setShowBytecodeInput(true);
        } else {
          setError(`${err.message} Try providing bytecode manually.`);
          setShowBytecodeInput(true);
        }
      } finally {
        setIsLoadingAbi(false);
      }
    }

    fetchAbi();
  }, [contractAddress, encodedAbi]);

  useEffect(() => {
    // After fetching the ABI, validate it against the contract
    // Only run verification if it hasn't been verified yet and ABI exists
    if (abi && abi.length > 0 && contractAddress && !isVerified) {
      console.log(`ABI verification effect triggered for ${contractAddress} - ${abi.length} functions`);
      const validateAbi = async () => {
        try {
          const response = await fetch('/api/verify-abi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractAddress, abi })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('ABI verification result:', data);
            
            if (data.verifiedFunctions && data.verifiedFunctions.length > 0) {
              // Update the ABI with only verified functions and mark them as verified
              const verifiedFuncs = data.verifiedFunctions.map((func: any) => ({
                ...func,
                verified: true
              }));
              setAbi(verifiedFuncs);
              
              // Set a success message
              setStatusMessage({
                type: 'success',
                message: `${data.verifiedFunctions.length} of ${data.total} functions verified on-chain.`
              });
            } else {
              setStatusMessage({
                type: 'warning',
                message: 'No functions could be verified on this contract with the provided ABI.'
              });
            }
            // Mark verification as complete
            setIsVerified(true);
          }
        } catch (error) {
          console.error('Error validating ABI against contract:', error);
          // Mark verification as complete even on error to prevent retries
          setIsVerified(true);
        }
      };
      
      validateAbi();
    }
  }, [abi, contractAddress, isVerified]);

  // Reset verification flag when contract or encoded ABI changes
  useEffect(() => {
    setIsVerified(false);
  }, [contractAddress, encodedAbi]);

  // Handle function selection
  const handleFunctionSelect = (func: ContractFunction) => {
    setSelectedFunction(func);
    
    // Clear previous results when changing functions
    setResult(null);
    setError('');
    
    // Setup function inputs
    const initialInputs = func.inputs.map(input => ({
      name: input.name,
      type: input.type,
      value: ''
    }));
    setFunctionInputs(initialInputs);
  };

  const handleInputChange = (name: string, value: string) => {
    setFunctionInputs(
      functionInputs.map(input => 
        input.name === name ? { ...input, value } : input
      )
    );
  };

  // Helper to format result values based on type
  const formatResultValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "null";
    }
    
    // Format BigInt values (common in blockchain responses)
    if (typeof value === 'bigint' || 
        (typeof value === 'string' && value.startsWith('0x') && value.length > 42)) {
      // Try to format as both hex and decimal for large numbers
      try {
        const bigValue = BigInt(value);
        return `${bigValue.toString()} (${bigValue.toString(16).startsWith('0x') ? bigValue.toString(16) : '0x' + bigValue.toString(16)})`;
      } catch {
        return String(value);
      }
    }
    
    // Format boolean values
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    // Format address values
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
      return `${value} (Address)`;
    }
    
    // Format arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      return `[${value.map(formatResultValue).join(', ')}]`;
    }
    
    // Format objects
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  // Helper function to determine if a function is read-only
  const isReadOnlyFunction = (func: ContractFunction): boolean => {
    if (!func) return false;
    
    // Check explicit markers
    const isViewOrPure = func.stateMutability === 'view' || func.stateMutability === 'pure';
    const isConstant = func.constant === true;
    
    // Check name patterns
    const hasGetterNamePattern = 
      func.name.startsWith('get') || 
      func.name.startsWith('is') || 
      func.name.startsWith('has') || 
      func.name.startsWith('total') || 
      func.name === 'symbol' || 
      func.name === 'name' || 
      func.name === 'decimals' || 
      func.name === 'balanceOf' || 
      func.name === 'allowance';
      
    // Check outputs
    const hasOutputs = func.outputs && func.outputs.length > 0;
    
    // Determine if it's read-only
    return isViewOrPure || isConstant || (hasGetterNamePattern && hasOutputs);
  };

  // Handle form submission for calling the contract function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    if (!selectedFunction) return;
    
    try {
      setIsLoading(true);
      
      // Use the shared helper function to determine if read-only
      const isReadOnly = isReadOnlyFunction(selectedFunction);
      
      // Format parameters for the contract call
      const formattedParams = functionInputs.map(input => input.value);

      console.log(`Calling ${selectedFunction.name} (isReadOnly: ${isReadOnly}) with params:`, formattedParams);

      // Make the API call
      const response = await fetch('/api/call-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractAddress,
          functionName: selectedFunction.name,
          parameters: formattedParams,
          isQuery: isReadOnly,
          includeInputAnalysis: true,  // Request input analysis
          includeCallTrace: true,      // Request call trace
          abi: abi.length > 0 ? abi : undefined // Include ABI for better decoding
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("API response:", data);
        
        // Format the result to ensure it's presentable
        const processedResult = {
          ...data,
          // Ensure we always have a value property for display
          value: data.value || data.result || data.returnValue || data.output || (
            typeof data === 'object' && data !== null && 'value' in data ? data.value : 
            typeof data.result === 'object' ? JSON.stringify(data.result) : data.result
          )
        };
        
        setResult(processedResult);
        
        // Set success message for all functions
        setStatusMessage({
          type: 'success',
          message: isReadOnly 
            ? `Function called successfully!` 
            : `Transaction executed successfully!`,
        });
      } else {
        // Handle errors - especially contract reverts
        console.error("API Error:", data);
        
        // Determine if this is a contract revert
        const isContractRevert = data.errorDetails?.isRevert || 
                                 data.error?.includes('revert') || 
                                 data.error?.toLowerCase().includes('out of bounds');

        // Create a user-friendly message
        const errorMessage = data.error || 'An error occurred while calling the contract function';
        let userMessage = errorMessage;
        
        // For contract reverts, provide more helpful context
        if (isContractRevert) {
          // For getters that often fail with out-of-bounds errors
          if (selectedFunction.name.startsWith('get') && (
              errorMessage.includes('out of bounds') || 
              errorMessage.includes('invalid index') ||
              errorMessage.includes('out of range'))) {
            
            userMessage = `${errorMessage}\n\nThis typically means the item you're trying to access doesn't exist. For example, if you're requesting proposal #${formattedParams[0]}, it may not have been created yet.`;
          } 
          // For common permission errors
          else if (errorMessage.includes('not owner') || errorMessage.includes('unauthorized')) {
            userMessage = `${errorMessage}\n\nYou may not have the required permissions to perform this action.`;
          }
        }
        
        // Check if there's a suggestion from the API
        if (data.suggestion) {
          userMessage = `${userMessage}\n\n${data.suggestion}`;
          
          // If this is a "getter" but it might be a state-changing function, offer to try it as write
          if (data.suggestion.includes("Try running it as a write function") && isReadOnly) {
            userMessage = `${userMessage}\n\nWould you like to try running this as a write function instead?`;
            
            // Show a button to retry as write function
            setHasWriteFunctionSuggestion(true);
            // Save the params for potential retry
            setLastAttemptedParams(formattedParams);
          }
        }
        
        setStatusMessage({
          type: 'error',
          message: userMessage,
        });
      }
    } catch (error) {
      console.error('Error calling function:', error);
      setStatusMessage({
        type: 'error',
        message: `Failed to execute function: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter functions by type (read/write) and search query
  const filteredFunctions = (readOnly: boolean) => {
    return functions
      .filter(f => {
        const isReadFunction = isReadOnlyFunction(f);
        return isReadFunction === readOnly;
      })
      .filter(f => {
        if (!searchQuery) return true;
        return f.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  };
  
  const viewFunctions = filteredFunctions(true);
  const writeFunctions = filteredFunctions(false);

  // Function item component with status indication
  const renderFunctionItem = (func: ContractFunction, index: number) => {
    // Use the shared helper function
    const isRead = isReadOnlyFunction(func);
    
    return (
      <div
        key={index}
        className={`border rounded-md p-3 cursor-pointer transition-colors ${
          selectedFunction?.name === func.name
            ? isRead 
              ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700'
              : 'bg-amber-100 border-amber-300 dark:bg-amber-900 dark:border-amber-700'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => handleFunctionSelect(func)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-medium flex items-center">
              {isRead ? (
                <BookOpen className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
              ) : (
                <Pencil className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
              )}
              {func.name}
              {func.verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle className="h-4 w-4 ml-1 text-green-600 dark:text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Verified on-chain</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {func.humanReadableSignature && (
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                {func.humanReadableSignature}
              </div>
            )}
          </div>
          <div>
            <Badge
              variant={isRead ? "secondary" : "default"}
              className={isRead 
                ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700"
              }
            >
              {getExecutionTypeLabel(func)}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // Get label for the execution type based on stateMutability
  const getExecutionTypeLabel = (func: ContractFunction): string => {
    // Use the shared helper function
    const isReadFunction = isReadOnlyFunction(func);
    
    if (isReadFunction) {
      return 'Read-only';
    } else if (func.stateMutability === 'payable') {
      return 'Payable';
    } else {
      return 'State-changing';
    }
  };

  // Add the retry handler function
  const handleRetryAsWriteFunction = async () => {
    if (!selectedFunction) return;
    
    setIsLoading(true);
    setStatusMessage(null);
    setHasWriteFunctionSuggestion(false);
    
    try {
      console.log(`Retrying ${selectedFunction.name} as write function with params:`, lastAttemptedParams);
      
      // Make the API call explicitly as a write function
      const response = await fetch('/api/call-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractAddress,
          functionName: selectedFunction.name,
          parameters: lastAttemptedParams,
          isQuery: false, // Explicitly run as write function
          includeInputAnalysis: true,
          includeCallTrace: true,
          abi: abi.length > 0 ? abi : undefined
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Process successful response
        const processedResult = {
          ...data,
          value: data.value || data.result || data.returnValue || data.output || (
            typeof data === 'object' && data !== null && 'value' in data ? data.value : 
            typeof data.result === 'object' ? JSON.stringify(data.result) : data.result
          )
        };
        
        setResult(processedResult);
        setStatusMessage({
          type: 'success',
          message: `Transaction executed successfully! This function modified state despite its "getter" name.`,
        });
      } else {
        // Handle errors
        setStatusMessage({
          type: 'error',
          message: data.error || 'Transaction failed when retrying as write function.',
        });
      }
    } catch (error) {
      console.error('Error in retry:', error);
      setStatusMessage({
        type: 'error',
        message: `Failed to execute function: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container mx-auto px-4 py-6 max-w-7xl"
    >
      <div className="mb-6 flex items-center">
        <Link href="/interact" className="inline-flex items-center">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {contractAddress ? truncateAddress(contractAddress) : 'Contract Interaction'}
        </h1>
      </div>

      {statusMessage && (
        <Alert 
          className={`mb-6 ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
          }`}
        >
          <AlertDescription className={`whitespace-pre-line ${
            statusMessage.type === 'success' 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-yellow-700 dark:text-yellow-300'
          }`}>
            {statusMessage.message}
            
            {/* Show retry button if we have a suggestion to run as write function */}
            {hasWriteFunctionSuggestion && (
              <div className="mt-3">
                <Button 
                  onClick={handleRetryAsWriteFunction}
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Send className="mr-2 h-3 w-3" />
                  Retry as Write Function
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <motion.div variants={itemVariants} className="mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5 text-blue-500" />
            Contract Interaction
            </CardTitle>
            <CardDescription>
              Interact with smart contract at: <span className="font-mono">{contractAddress}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">Address:</span>
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{contractAddress}</code>
              </div>
              {abiSource && (
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">Source:</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    abiSource === 'transaction' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  }`}>
                    {abiSource === 'bytecode' && 'Bytecode Analysis'}
                    {abiSource === 'manual-bytecode' && 'Manual Bytecode'}
                    {abiSource === 'source' && 'Source Code'}
                    {abiSource === 'transaction' && 'Transaction History (Limited)'}
                    {abiSource === 'custom' && 'Custom ABI'}
              </span>
                </div>
              )}
              {functions.length > 0 && (
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">Functions:</span>
                  <span className="font-medium">{functions.length}</span>
                </div>
              )}
          </div>
          </CardContent>
        </Card>
      </motion.div>

      {abiSource === 'transaction' && (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertDescription className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>Limited ABI from transaction history.</strong> The current ABI was generated from transaction history, which may be incomplete. 
                <div className="mt-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs py-1 h-auto"
                    onClick={() => setShowBytecodeInput(true)}
                  >
                    Provide Bytecode Manually
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {error && (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert className={error.includes("Warning:") 
            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" 
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
      
      {showBytecodeInput && (
        <motion.div variants={itemVariants} className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Provide Contract Bytecode</CardTitle>
              <CardDescription>
                Enter the contract bytecode to improve function detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm">
                <p className="mb-2"><strong>Why use bytecode?</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>More reliable function detection than transaction history</li>
                  <li>Works even for contracts with no prior transactions</li>
                  <li>Identifies all available functions directly from on-chain data</li>
                  <li>Better handling of proxy contracts and complex implementations</li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can get the bytecode from block explorers like Etherscan, Hashscan, or by using tools like <code>eth_getCode</code>
                </p>
              </div>
              
              <form onSubmit={handleManualBytecodeSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bytecode">Contract Bytecode</Label>
                    <div className="mt-1">
                      <textarea
                        id="bytecode"
                        rows={5}
                        className="w-full resize-none rounded-md border border-input p-2 font-mono text-sm"
                        placeholder="0x608060405234801561001057600080fd5b50..."
                        value={manualBytecode}
                        onChange={(e) => setManualBytecode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="submit" 
                      disabled={bytecodePending || !manualBytecode.trim()}
                    >
                      {bytecodePending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Bytecode'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowBytecodeInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!showBytecodeInput && !isLoadingAbi && (
        <motion.div variants={itemVariants} className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowBytecodeInput(true)}
            className="text-sm"
          >
            <Code className="mr-2 h-4 w-4" />
            Provide Bytecode Manually
          </Button>
        </motion.div>
      )}

      {isLoadingAbi ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center text-muted-foreground">
            Discovering contract functions...
          </p>
        </motion.div>
      ) : functions.length === 0 ? (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert>
            <AlertDescription>
              No functions were discovered for this contract. This could be because:
              <ul className="list-disc pl-6 mt-2">
                <li>The contract doesn't expose any standard functions</li>
                <li>The contract address is invalid</li>
                <li>The contract has a custom interface not recognized by our system</li>
              </ul>
              <p className="mt-2">
                Try providing a custom ABI by appending ?abi=&#123;...&#125; to the URL.
              </p>
            </AlertDescription>
          </Alert>
        </motion.div>
      ) : (
        <motion.div 
          variants={itemVariants} 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                  <CardTitle>Contract Functions</CardTitle>
                <CardDescription>Select a function to interact with</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-2 sticky top-0 bg-white dark:bg-gray-950 z-10 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder="Search functions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
                  
                {/* Always use Tab View Mode */}
                <Tabs defaultValue="read" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-2 sticky top-20 z-10">
                    <TabsTrigger value="read" className="flex items-center gap-1">
                      <Code className="h-4 w-4 text-blue-500" />
                      Read
                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        {viewFunctions.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="write" className="flex items-center gap-1">
                      <Terminal className="h-4 w-4 text-amber-500" />
                      Write
                      <span className="ml-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        {writeFunctions.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="read" className="p-4">
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                      {viewFunctions.length > 0 ? (
                        <div className="space-y-1">
                          {viewFunctions.map((func, index) => (
                            renderFunctionItem(func, index)
                          ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground px-2">
                          <p>No read functions found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
                        </div>
                      )}
                  </div>
                </TabsContent>
                
                <TabsContent value="write" className="p-4">
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {writeFunctions.length > 0 ? (
                        <div className="space-y-1">
                          {writeFunctions.map((func, index) => (
                            renderFunctionItem(func, index)
                          ))}
                        </div>
                  ) : (
                    <p className="text-sm text-muted-foreground px-2">No write functions available{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
                  )}
                    </div>
                </TabsContent>
              </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedFunction ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {/* Use the shared helper function */}
                    {selectedFunction && (
                      isReadOnlyFunction(selectedFunction) ? (
                        <BookOpen className="mr-2 h-5 w-5 text-blue-500" />
                      ) : (
                        <Terminal className="mr-2 h-5 w-5 text-amber-500" />
                      )
                    )}
                    {selectedFunction?.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedFunction && (
                      isReadOnlyFunction(selectedFunction)
                        ? 'Read function - returns data without modifying state' 
                        : 'Write function - modifies contract state and requires transaction'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                  {functionInputs.length > 0 ? (
                      functionInputs.map((input, index) => (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`input-${index}`}>
                            {input.name} <span className="text-xs text-muted-foreground ml-1">({input.type})</span>
                          </Label>
                          <Input
                            id={`input-${index}`}
                            value={input.value}
                            onChange={(e) => handleInputChange(input.name, e.target.value)}
                            placeholder={`Enter ${input.type} value`}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">This function doesn't require any inputs</p>
                    )}
                    
                    {result !== null && (
                      <div className="mt-6 border rounded-md overflow-hidden">
                        <div className={`px-4 py-2 border-b ${
                          selectedFunction && isReadOnlyFunction(selectedFunction)
                            ? 'bg-blue-50 dark:bg-blue-900/20' 
                            : 'bg-amber-50 dark:bg-amber-900/20'
                        }`}>
                          <div className="flex items-center">
                            <h3 className="text-sm font-semibold flex items-center">
                              {/* Success checkmark icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {selectedFunction && isReadOnlyFunction(selectedFunction)
                                ? 'Function Result' 
                                : 'Transaction Executed'}
                            </h3>
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                              selectedFunction && isReadOnlyFunction(selectedFunction)
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-300'
                            }`}>
                              {selectedFunction?.name}
                            </span>
                          </div>
                        </div>
                        
                        <ContractTransactionDetails 
                          result={result}
                          functionName={selectedFunction?.name || ''}
                          isReadFunction={selectedFunction ? isReadOnlyFunction(selectedFunction) : false}
                        />
                      </div>
                    )}
                  
                    <div className="pt-4">
                      <Button 
                        type="submit"
                        disabled={isLoading}
                        className={
                          selectedFunction && isReadOnlyFunction(selectedFunction)
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                        }
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {selectedFunction && isReadOnlyFunction(selectedFunction)
                              ? 'Reading...'
                              : 'Executing...'}
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            {selectedFunction && isReadOnlyFunction(selectedFunction)
                                ? 'Call Function' 
                              : 'Execute Function'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <Code className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Select a function</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Choose a function from the sidebar to interact with this smart contract
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default InteractPage; 