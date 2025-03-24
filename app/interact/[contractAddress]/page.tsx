'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Code, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import ContractHeader from './components/ContractHeader';
import ContractInfo from './components/ContractInfo';
import FunctionList from './components/FunctionList';
import FunctionForm from './components/FunctionForm';
import BytecodeInput from './components/BytecodeInput';
import ContractAnalysisCard from './components/ContractAnalysisCard';
import { analyzeContract } from '../../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

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

const InteractPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
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
  const [contractAnalysis, setContractAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

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

  // Handle form submission for calling the contract function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    if (!selectedFunction) return;
    
    try {
      setIsLoading(true);
      
      // Use the shared helper function to determine if read-only
      const isReadOnly = selectedFunction.stateMutability === 'view' || 
                        selectedFunction.stateMutability === 'pure' ||
                        selectedFunction.constant === true;
      
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

  // Add a function to handle contract analysis
  const handleAnalyzeContract = async () => {
    if (!contractAddress || !abi || abi.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeContract(abi, contractAddress);
      setContractAnalysis(result.analysis);
    } catch (err: any) {
      console.error('Error analyzing contract:', err);
      setError(err.message || 'Failed to analyze contract');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      className="container pb-12 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pt-4 pb-2">
        <ContractHeader contractAddress={contractAddress} />
        <ContractInfo
          contractAddress={contractAddress}
          abiSource={abiSource}
          functionsCount={functions.length}
        />
      </div>

      {/* Limited Functionality Warning */}
      <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <div className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <AlertDescription className="flex-1">
            <p className="font-medium mb-1">Limited Functionality:</p> 
            <p className="mb-1">Contract interaction on Hedera Testnet is provided as-is and may not work as expected for all contracts.</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Some contracts may require specific permissions or parameters</li>
              <li>Complex contracts might have partial functionality</li>
              <li>Function detection relies on bytecode analysis which has limitations</li>
            </ul>
          </AlertDescription>
        </div>
      </Alert>

      {/* Verification Status Message */}
      {statusMessage && (
        <Alert className={`mb-4 ${
          statusMessage.type === 'success' 
            ? 'bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-2">
            {statusMessage.type === 'success' ? (
              <div className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <div className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <AlertDescription className="flex-1 whitespace-pre-line">
              {statusMessage.message}
              
              {hasWriteFunctionSuggestion && (
                <div className="mt-3">
                  <Button 
                    onClick={handleRetryAsWriteFunction}
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Retry as Write Function
                  </Button>
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* ABI Source Warning */}
      {abiSource === 'bytecode' && (
        <Alert className="mb-4 bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <AlertDescription className="flex-1">
              <p className="font-medium mb-1">Warning: ABI generated from bytecode analysis</p>
              <p className="mb-2 text-sm">Contract ABI was generated from bytecode analysis which may be incomplete. Some functions might be missing or incorrectly decoded.</p>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Transaction-based ABI Warning */}
      {abiSource === 'transaction' && (
        <Alert className="mb-4 bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <AlertDescription className="flex-1">
              <p className="font-medium mb-1">Limited ABI from transaction history</p>
              <p className="mb-2 text-sm">The current ABI was generated from transaction history, which may be incomplete.</p>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs py-1 h-auto"
                onClick={() => setShowBytecodeInput(true)}
              >
                Provide Bytecode Manually
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {(!abi || abi.length === 0) && !isLoadingAbi && !showBytecodeInput && (
        <Alert className="mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertDescription className="flex flex-col space-y-4">
            <div>
              <p className="font-medium mb-2">Contract ABI not found</p>
              <p className="text-sm text-muted-foreground">To interact with this contract, we need its ABI (Application Binary Interface).</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                onClick={() => setShowBytecodeInput(true)}
                className="inline-flex items-center"
              >
                <Code className="mr-2 h-4 w-4" />
                Provide Bytecode Manually
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className={`mb-6 ${
          error.includes("Warning:") 
            ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" 
            : "bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        }`}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {showBytecodeInput && (
        <div className="mb-6 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm p-4 shadow-sm">
          <BytecodeInput
            manualBytecode={manualBytecode}
            setManualBytecode={setManualBytecode}
            onSubmit={handleManualBytecodeSubmit}
            onCancel={() => setShowBytecodeInput(false)}
            bytecodePending={bytecodePending}
          />
        </div>
      )}

      {!showBytecodeInput && !isLoadingAbi && abi.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowBytecodeInput(true)}
            className="text-sm"
            size="sm"
          >
            <Code className="mr-2 h-4 w-4" />
            Update Bytecode
          </Button>
          
          <Button
            variant="outline"
            onClick={handleAnalyzeContract}
            className="text-sm"
            size="sm"
            disabled={isAnalyzing || !abi || abi.length === 0}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Analyze Contract
              </>
            )}
          </Button>
        </div>
      )}

      {isLoadingAbi ? (
        <div className="flex flex-col items-center py-12 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center text-muted-foreground">
            Discovering contract functions...
          </p>
        </div>
      ) : functions.length === 0 && abi.length > 0 ? (
        <Alert className="mb-6 bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <AlertDescription>
            <p className="font-medium mb-2">No functions were discovered for this contract</p>
            <p className="text-sm mb-2">This could be because:</p>
            <ul className="list-disc pl-6 mb-2 text-sm space-y-1">
              <li>The contract doesn't expose any standard functions</li>
              <li>The contract address is invalid</li>
              <li>The contract has a custom interface not recognized by our system</li>
            </ul>
            <p className="text-sm">
              Try providing a custom ABI by appending ?abi=&#123;...&#125; to the URL.
            </p>
          </AlertDescription>
        </Alert>
      ) : functions.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="p-4 mb-3 text-sm text-muted-foreground rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm">
                <p className="flex items-center gap-2 mb-2 font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Contract Functions
                </p>
                <p>Select a function from the list to interact with this contract. Read functions fetch data, while write functions modify the blockchain state.</p>
              </div>
              
              {/* Verification Status Banner */}
              {functions.some(f => f.verified) && (
                <div className="mb-3 px-3 py-2 rounded-md text-sm text-green-800 bg-green-50/80 border border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800">
                  {functions.filter(f => f.verified).length} of {functions.length} functions verified on-chain.
                </div>
              )}
              
              <FunctionList
                functions={functions}
                selectedFunction={selectedFunction}
                onFunctionSelect={handleFunctionSelect}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>

            <div className="lg:col-span-2">
              <FunctionForm
                selectedFunction={selectedFunction}
                functionInputs={functionInputs}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                result={result}
                hasWriteFunctionSuggestion={hasWriteFunctionSuggestion}
                onRetryAsWriteFunction={handleRetryAsWriteFunction}
              />
            </div>
          </div>
          
          {contractAnalysis && (
            <div className="pt-6 mt-6 border-t border-border/30">
              <Card className="bg-gradient-to-br from-background/90 to-background/60 border-primary/10 shadow-md backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      Contract Analysis
                    </CardTitle>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0.5">
                      AI-Powered
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Automated analysis of contract purpose, functionality, and security considerations
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="prose dark:prose-invert prose-sm max-w-none p-6 overflow-x-auto">
                    {/* Contract basic info section - displayed in a structured format */}
                    {contractAnalysis.includes("Contract Analysis for") && (
                      <div className="mb-6 bg-muted/30 rounded-lg border border-border/30 p-4">
                        <h3 className="text-base font-semibold mb-3 flex items-center">
                          <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2"></span>
                          Contract Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {contractAnalysis.split('\n').map((line, idx) => {
                            if (line.includes(':') && !line.includes('Contract Analysis for') && 
                                !line.includes('Note:') && !line.includes('-----')) {
                              const [key, value] = line.split(':').map(part => part.trim());
                              return (
                                <div key={idx} className="flex flex-col">
                                  <span className="text-xs text-muted-foreground font-medium">{key}</span>
                                  <span className="font-mono text-sm break-all">{value}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Properly render markdown content */}
                    {contractAnalysis.split('\n').map((line, idx) => {
                      // Main section headers (## headings)
                      if (line.startsWith('## ')) {
                        return (
                          <h3 key={idx} className="text-lg font-bold mt-6 mb-3 pb-1 border-b border-border/30 text-primary/90">
                            {line.replace('## ', '')}
                          </h3>
                        );
                      }
                      
                      // Secondary headings (# headings)
                      if (line.startsWith('# ')) {
                        return (
                          <h2 key={idx} className="text-xl font-bold mt-5 mb-3">
                            {line.replace('# ', '')}
                          </h2>
                        );
                      }
                      
                      // Separator lines
                      if (line.startsWith('----')) {
                        return <hr key={idx} className="my-4 border-border/30" />;
                      }
                      
                      // Function counts and stats
                      if (line.includes('functions') && (line.includes('read') || line.includes('write') || line.includes('events'))) {
                        return (
                          <div key={idx} className="my-3 p-3 bg-muted/20 rounded-lg border border-border/30">
                            <p className="font-medium">{line}</p>
                          </div>
                        );
                      }
                      
                      // Notes and warnings
                      if (line.includes('Note:')) {
                        return (
                          <div key={idx} className="my-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm">
                              <span className="font-semibold">Note:</span> {line.split('Note:')[1].trim()}
                            </p>
                          </div>
                        );
                      }
                      
                      // Skip already processed overview lines and empty lines
                      if ((line.includes(':') && !line.includes('Contract Interface Analysis')) || 
                          line.trim() === '' || line.includes('Contract Analysis for') || 
                          line.startsWith('-----')) {
                        return null;
                      }
                      
                      // Regular paragraph
                      return (
                        <p key={idx} className="my-2 text-sm leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                  
                  <div className="bg-muted/20 px-6 py-4 border-t border-border/20">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Note:</span> This analysis is generated by AI and should be treated as informational. 
                      Always conduct thorough validation and testing before interacting with smart contracts in production environments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );
};

export default InteractPage; 