'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Code } from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import ContractHeader from './components/ContractHeader';
import ContractInfo from './components/ContractInfo';
import FunctionList from './components/FunctionList';
import FunctionForm from './components/FunctionForm';
import BytecodeInput from './components/BytecodeInput';

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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container mx-auto px-4 py-6 max-w-7xl"
    >
      <ContractHeader contractAddress={contractAddress} />

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
        </Alert>
      )}

      <ContractInfo 
        contractAddress={contractAddress}
        abiSource={abiSource}
        functionsCount={functions.length}
      />

      {abiSource === 'transaction' && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 mb-6">
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
      )}

      {error && (
        <Alert className={`mb-6 ${
          error.includes("Warning:") 
            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" 
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        }`}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
      )}
      
      {showBytecodeInput && (
        <BytecodeInput
          manualBytecode={manualBytecode}
          setManualBytecode={setManualBytecode}
          onSubmit={handleManualBytecodeSubmit}
          onCancel={() => setShowBytecodeInput(false)}
          bytecodePending={bytecodePending}
        />
      )}

      {!showBytecodeInput && !isLoadingAbi && (
          <Button 
            variant="outline" 
            onClick={() => setShowBytecodeInput(true)}
          className="text-sm mb-6"
          >
            <Code className="mr-2 h-4 w-4" />
            Provide Bytecode Manually
          </Button>
      )}

      {isLoadingAbi ? (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-center text-muted-foreground">
            Discovering contract functions...
          </p>
        </div>
      ) : functions.length === 0 ? (
        <Alert className="mb-6">
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FunctionList
            functions={functions}
            selectedFunction={selectedFunction}
            onFunctionSelect={handleFunctionSelect}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

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
      )}
    </motion.div>
  );
};

export default InteractPage; 