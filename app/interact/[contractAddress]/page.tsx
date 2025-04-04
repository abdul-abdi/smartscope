'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, FileCode, Code, Terminal, BookOpen, Search,
  Zap, ChevronDown, ChevronRight, Info, AlertTriangle, ArrowRight, BrainCircuit, CheckCircle
} from 'lucide-react';

// UI Components
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";

// Contract Interaction components
import ContractHeader from './components/ContractHeader';
import BytecodeInput from './components/BytecodeInput';
import ContractAnalysis from './components/ContractAnalysis';
import ContractTransactionDetails from './components/ContractTransactionDetails';
import FunctionHistory from './components/FunctionHistory';
import ContractStorage from './components/ContractStorage';
import AbiModal from './components/AbiModal';
import { FunctionItem } from '../components/ui';

// API utility
import { analyzeContract, verifyFunction, fetchContractAbi, verifyAbi, callContractFunction } from '../../utils/contract-api-service';
import {
  formatToEvmAddress,
  formatToEvmAddressAsync,
  addressFormatDebugInfo
} from '../../utils/contract-utils';
import { 
  isReadOnlyFunction, 
  groupFunctionsByType, 
  groupReadFunctions, 
  groupWriteFunctions 
} from '../../utils/interact-utils';

// Types
import { ContractFunction, FunctionInput } from '../../types/contract';
import { Skeleton } from '../../../components/ui/skeleton';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Main component
const InteractPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const contractAddress = (params.contractAddress as string).trim().replace(/\s+/g, '');
  const encodedAbi = searchParams.get('abi');

  // State management
  const [abi, setAbi] = useState<ContractFunction[]>([]);
  const [functions, setFunctions] = useState<ContractFunction[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [functionInputs, setFunctionInputs] = useState<FunctionInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAbi, setIsLoadingAbi] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [callError, setCallError] = useState('');
  const [abiError, setAbiError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('read');
  const [abiSource, setAbiSource] = useState('');
  const [manualBytecode, setManualBytecode] = useState('');
  const [showBytecodeInput, setShowBytecodeInput] = useState(false);
  const [bytecodePending, setBytecodePending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: string; message: string } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [contractAnalysis, setContractAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAllOutputs, setShowAllOutputs] = useState(false);
  const [expandedFunctionGroup, setExpandedFunctionGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'compact'>('split');
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [showStateChanges, setShowStateChanges] = useState(true);
  const [functionHistory, setFunctionHistory] = useState<Array<{
    functionName: string;
    params: any[];
    result: any;
    timestamp: number;
  }>>([]);
  const [isAbiModalOpen, setIsAbiModalOpen] = useState(false);
  const [hasWriteFunctionSuggestion, setHasWriteFunctionSuggestion] = useState(false);

  // Function to fetch the ABI for a contract - make it a useCallback
  const fetchAbi = useCallback(async () => {
    if (!contractAddress) return;

    setIsLoadingAbi(true);
    setAbiError('');
    setShowBytecodeInput(false);

    try {
      // Generate a unique timestamp to prevent caching
      const timestamp = Date.now() + Math.random().toString(36).substring(2);

      // Ensure consistent address format with accurate mapping
      // Use the async version that will query Mirror Node for exact mapping
      const normalizedAddress = await formatToEvmAddressAsync(contractAddress.trim());

      // Add debug info for address conversion
      const addressDebug = addressFormatDebugInfo(contractAddress.trim());
      console.log('Contract address debug info:', addressDebug);

      // Always use direct bytecode analysis
      const response = await fetch('/api/get-contract-abi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: normalizedAddress,
          cacheBuster: timestamp,
          forceRefresh: true,
          preferSource: true,
          sourceOnly: true,
          disableTransactionHistory: true,
          analysisMethod: 'bytecode',
          bypassCache: true,
          regenerateAbi: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ABI: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.abi || data.abi.length === 0) {
        throw new Error('No functions detected in the contract ABI. Try providing bytecode manually.');
      }

      // Process the ABI to ensure consistent formatting
      const abiItems = data.abi.filter((item: any) => item.type === 'function' || !item.type);
      setAbi(abiItems);

      // Always set ABI source based on data from API response
      if (data.verified === true) {
        setAbiSource('verified');
        setIsVerified(true);
        setAbiError(''); // Clear any error for verified contracts
      } else if (data.source === 'sourcify' || data.source === 'explorer') {
        setAbiSource('explorer');
        setIsVerified(true);
        setAbiError(''); // Clear any error for verified contracts
      } else if (data.source === 'bytecode' || data.source === 'decompilation') {
        setAbiSource('bytecode');
        setIsVerified(false);
        setAbiError('Information: ABI generated from bytecode analysis. Some functions may be missing or incorrectly identified.');
      } else if (data.source === 'transaction') {
        setAbiSource('transaction');
        setIsVerified(false);
        setAbiError('Information: ABI derived from transaction history. Limited function coverage is available.');
      } else {
        // Default case if source is unknown
        setAbiSource('unknown');
        setIsVerified(false);
        setAbiError('Note: Contract verification status is unknown. Using best-effort function detection.');
      }

      // Verify functions before displaying them
      try {
        const verifyResponse = await fetch('/api/verify-abi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress: normalizedAddress,
            abi: abiItems
          }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Verification results:', verifyData);

          if (verifyData.verifiedFunctions) {
            // Include both verified and unverified functions
            // Map verified status to the original ABI items
            const verifiedSelectors = new Set(
              verifyData.verifiedFunctions.map((item: any) => item.selector)
            );
            
            const functionItems = abiItems.map((item: any, index: number) => {
              if (!item.stateMutability) {
                item.stateMutability = item.constant === true ? 'view' : 'nonpayable';
              }
              
              // Find matching verified function 
              const verifiedFunc = verifyData.verifiedFunctions.find(
                (vf: any) => vf.name === item.name && 
                JSON.stringify(vf.inputs) === JSON.stringify(item.inputs)
              );
              
              return {
                ...item,
                inputs: item.inputs || [],
                outputs: item.outputs || [],
                verified: !!verifiedFunc,
                humanReadableSignature: verifiedFunc?.humanReadableSignature ||
                          (data.functionSignatures && data.functionSignatures[index]
                           ? data.functionSignatures[index] : undefined)
              };
            });

            setFunctions(functionItems);

            // Show warning if some functions were filtered out, but we're displaying all
            if (verifyData.total > verifyData.verified) {
              setAbiError(`Info: ${verifyData.total - verifyData.verified} functions couldn't be verified in the contract bytecode but are still available for interaction.`);
            }
          } else {
            // Fallback to unverified functions
            const functionItems = abiItems.map((item: any, index: number) => {
              if (!item.stateMutability) {
                item.stateMutability = item.constant === true ? 'view' : 'nonpayable';
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
            setAbiError('Warning: Function verification failed. Some functions may not be callable.');
          }
        } else {
          // If verification fails, use the original functions but warn the user
          const functionItems = abiItems.map((item: any, index: number) => {
            if (!item.stateMutability) {
              item.stateMutability = item.constant === true ? 'view' : 'nonpayable';
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
          setAbiError('Warning: Function verification service is unavailable. Some functions may not be callable.');
        }
      } catch (verifyError) {
        console.error('Error verifying functions:', verifyError);

        // If verification fails, use the original functions but warn the user
        const functionItems = abiItems.map((item: any, index: number) => {
          if (!item.stateMutability) {
            item.stateMutability = item.constant === true ? 'view' : 'nonpayable';
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
        setAbiError('Warning: Unable to verify functions. Some functions may not be callable.');
      }

      // Clear previous state
      resetFunctionState();

      if (data.message && data.abi?.length > 0) {
        setAbiError(prev => {
          if (!prev) return `Warning: ${data.message}`;
          return prev;
        });
      }
    } catch (err: any) {
      console.error('Error fetching ABI:', err);

      if (err.message.includes('not found') || err.message.includes('does not exist')) {
        setAbiError(`Contract not found. Please verify the address is correct.`);
      } else if (err.message.includes('bytecode')) {
        setAbiError(`${err.message} You can provide bytecode manually.`);
        setShowBytecodeInput(true);
      } else {
        setAbiError(`${err.message} Try providing bytecode manually.`);
        setShowBytecodeInput(true);
      }
    } finally {
      setIsLoadingAbi(false);
    }
  }, [contractAddress]);

  // Fetch ABI on component mount
  useEffect(() => {
    fetchAbi();
  }, [fetchAbi]);

  // Handle manual bytecode submission
  const handleManualBytecodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBytecode.trim()) {
      setAbiError('Please provide bytecode data');
      return;
    }

    setBytecodePending(true);
    setAbiError('');

    try {
      const timestamp = Date.now();
      const response = await fetch('/api/get-contract-abi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      const functionItems = abiItems.map((item: any, index: number) => ({
        ...item,
        inputs: item.inputs || [],
        outputs: item.outputs || [],
        humanReadableSignature: item.humanReadableSignature ||
                          (data.functionSignatures?.[index] || undefined)
      }));

      setFunctions(functionItems);
      setAbiSource('manual-bytecode');
      setIsVerified(false);
      setShowBytecodeInput(false);
      resetFunctionState();
      
      // Set informative message about manual bytecode source
      setAbiError('Information: ABI derived from manually provided bytecode. Function detection may be limited.');

    } catch (err: any) {
      setAbiError(err.message || 'Failed to analyze bytecode');
    } finally {
      setBytecodePending(false);
    }
  };

  // Reset function selection state
  const resetFunctionState = () => {
    setSelectedFunction(null);
    setFunctionInputs([]);
    setResult(null);
    setCallError('');
  };

  // Handle function selection from the list
  const handleFunctionSelect = (func: ContractFunction) => {
    setSelectedFunction(func);
    setFunctionInputs(
      func.inputs.map(input => ({
      name: input.name,
      type: input.type,
      value: ''
      }))
    );
    setResult(null);
    setCallError('');
    setGasEstimate(null);

    // Estimate gas if it's a write function
    if (func && !isReadOnlyFunction(func)) {
      setTimeout(() => estimateGas(), 500);
    }
  };

  // Handle input changes for function parameters
  const handleInputChange = (name: string, value: string) => {
    setFunctionInputs(prev =>
      prev.map(input =>
        input.name === name ? { ...input, value } : input
      )
    );

    // Re-estimate gas after input changes for write functions
    if (selectedFunction && !isReadOnlyFunction(selectedFunction)) {
      // Debounce the gas estimation to avoid too many calls
      const debounceTimer = setTimeout(() => estimateGas(), 800);
      return () => clearTimeout(debounceTimer);
    }
  };

  // Handle function execution
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFunction) return;

    setIsLoading(true);
    setCallError('');
    setStatusMessage(null);

    // Try to verify that the function exists but don't block execution
    let verificationWarning = false;
    try {
      const verifyResult = await verifyFunction(
        contractAddress,
        selectedFunction.name,
        selectedFunction.inputs.map(input => input.type)
      );

      if (!verifyResult.exists) {
        verificationWarning = true;
        console.warn(`Function "${selectedFunction.name}" could not be verified in the contract bytecode. Attempting to call anyway.`);
      }
    } catch (verifyError) {
      // If verification fails, we'll still try the call but warn the user
      console.warn('Function verification failed:', verifyError);
    }

    // Determine if this is a read function
    const isReadFunction = isReadOnlyFunction(selectedFunction);

    // Prepare parameters
    const parameters = functionInputs.map(input => ({
      type: input.type,
      value: input.value.trim() || (input.type.includes('int') ? '0' : '')
    }));

    try {
      // Different API endpoints for read vs write functions
      const result = await callContractFunction(
        contractAddress,
        selectedFunction.name,
        parameters,
        abi,
        isReadFunction
      );

      setResult(result);

      // Add to function history
      const timestamp = Date.now();
      setFunctionHistory(prev => [
        {
          functionName: selectedFunction.name,
          params: parameters,
          result,
          timestamp
        },
        ...prev.slice(0, 9) // Keep only the last 10 calls
      ]);

      // Clear error state
      setCallError('');
      setHasWriteFunctionSuggestion(false);

      // Display verification warning if needed but don't treat it as an error
      if (verificationWarning) {
        setAbiError(`Note: Function "${selectedFunction.name}" was called successfully despite not being verified in the bytecode.`);
      } else {
        setAbiError('');
      }

    } catch (error: any) {
      console.error('Error calling function:', error);
      setCallError(error.message || 'An error occurred while calling the function');

      // If it's a read function but we got "view function" error, suggest trying as write
      const errorMsg = error.message || '';
      if (
        isReadFunction &&
        (errorMsg.includes('view function') || errorMsg.includes('cannot estimate gas'))
      ) {
        setHasWriteFunctionSuggestion(true);
        
        // If verification warning occurred, try calling it as a write function automatically
        if (verificationWarning) {
          try {
            console.log('Attempting to call as write function due to verification uncertainty...');
            const result = await callContractFunction(
              contractAddress,
              selectedFunction.name,
              parameters,
              abi,
              false // Force as non-read function
            );
            
            setResult(result);
            setCallError('');
            setHasWriteFunctionSuggestion(false);
            setAbiError(`Function was called successfully as a write function. The ABI may have incorrectly marked this as a read function.`);
            
            // Add to function history
            const timestamp = Date.now();
            setFunctionHistory(prev => [
              {
                functionName: selectedFunction.name,
                params: parameters,
                result,
                timestamp
              },
              ...prev.slice(0, 9)
            ]);
          } catch (secondError: any) {
            console.error('Error calling as write function:', secondError);
            // Keep the original error
          }
        }
      } else {
        setHasWriteFunctionSuggestion(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze the contract
  const handleAnalyzeContract = async () => {
    setIsAnalyzing(true);
    setContractAnalysis('');

    try {
      const analysisResponse = await analyzeContract(contractAddress, abi);
      
      if (typeof analysisResponse === 'object' && analysisResponse.analysis) {
        setContractAnalysis(analysisResponse.analysis);
        
        // Check if analysis found additional functions
        if (analysisResponse.detectedFunctions && analysisResponse.detectedFunctions.length > 0) {
          console.log('Analysis detected additional functions:', analysisResponse.detectedFunctions);
          
          // Create a map of existing function signatures to avoid duplicates
          const existingFuncSignatures = new Set(
            functions.map(f => `${f.name}(${(f.inputs || []).map(i => i.type).join(',')})`)
          );
          
          // Add any new functions detected from analysis
          const newFunctions = analysisResponse.detectedFunctions.filter(func => {
            const signature = `${func.name}(${(func.inputs || []).map(i => i.type).join(',')})`;
            return !existingFuncSignatures.has(signature);
          });
          
          if (newFunctions.length > 0) {
            // Process the new functions to ensure they have the right format
            const processedNewFunctions = newFunctions.map(func => ({
              ...func,
              inputs: func.inputs || [],
              outputs: func.outputs || [],
              verified: func.verified !== false,
              humanReadableSignature: func.humanReadableSignature || 
                `${func.name}(${(func.inputs || []).map(input => `${input.type} ${input.name || ''}`).join(', ')})`
            }));
            
            // Add the new functions to the existing list
            setFunctions(prev => [...prev, ...processedNewFunctions]);
            
            // Show a notification about new functions
            setAbiError(`Found ${newFunctions.length} additional functions through analysis! These have been added to the function list.`);
          }
        } else {
          setContractAnalysis(analysisResponse);
        }
      } else {
        setContractAnalysis(analysisResponse);
      }
    } catch (err: any) {
      console.error('Error analyzing contract:', err);
      setContractAnalysis(`Error analyzing contract: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter and group functions
  const { readFunctions, writeFunctions } = useMemo(() => {
    return groupFunctionsByType(functions, searchQuery);
  }, [functions, searchQuery]);

  // Group functions by type
  const groupedReadFunctions = useMemo(() => {
    return groupReadFunctions(readFunctions);
  }, [readFunctions]);

  const groupedWriteFunctions = useMemo(() => {
    return groupWriteFunctions(writeFunctions);
  }, [writeFunctions]);

  // Function to format contract result for display
  const formatResult = (result: any) => {
    if (!result) return null;

    // Use the enhanced ContractTransactionDetails component for all results
    return (
      <ContractTransactionDetails
        result={result}
        isReadFunction={selectedFunction ? isReadOnlyFunction(selectedFunction) : false}
        functionName={selectedFunction?.name || 'Unknown'}
      />
    );
  };

  // Render function item in the sidebar
  const renderFunctionItem = (func: ContractFunction) => {
    return (
      <FunctionItem 
        key={func.name}
        func={func}
        selected={selectedFunction?.name === func.name}
        onClick={() => handleFunctionSelect(func)}
        source={abiSource}
      />
    );
  };

  // Render function group accordion
  const renderFunctionGroup = (groupName: string, functions: ContractFunction[]) => {
    if (functions.length === 0) return null;

    return (
      <AccordionItem
        value={groupName}
        key={groupName}
        className="border-none"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{groupName}</span>
            <Badge variant="outline" className="ml-2 bg-muted">{functions.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-1 pb-3">
          <div className="space-y-1.5">
            {functions.map(renderFunctionItem)}
            </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  // Added function to fetch relevant state for state change tracking
  const fetchRelevantState = async (contractAddress: string, func: ContractFunction) => {
    // Skip if not a known state-changing function
    if (!func.name) return null;

    // Define what state to fetch based on function name
    const stateToFetch: Record<string, string[]> = {
      'transfer': ['balanceOf'],
      'transferFrom': ['balanceOf', 'allowance'],
      'approve': ['allowance'],
      'mint': ['balanceOf', 'totalSupply'],
      'burn': ['balanceOf', 'totalSupply'],
      'setApprovalForAll': ['isApprovedForAll'],
    };

    // Check if we have predefined state to fetch for this function
    const stateFetchers = stateToFetch[func.name];
    if (!stateFetchers || stateFetchers.length === 0) return null;

    try {
      const state: Record<string, any> = {};

      // Extract addresses from function inputs
      const addressParams = functionInputs
        .filter(input => input.type === 'address' && input.value)
        .map(input => input.value);

      if (addressParams.length === 0) {
        // If no addresses in parameters, skip state fetching
        return null;
      }

      // For each state fetcher function, call the contract
      for (const fetcher of stateFetchers) {
        // Prepare parameters based on the function
        let params = [];

        if (fetcher === 'balanceOf') {
          // For each address param, fetch balance
          for (const addr of addressParams) {
            const response = await fetch('/api/call-contract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractAddress,
                functionName: 'balanceOf',
                parameters: [{ type: 'address', value: addr }],
                isQuery: true,
                abi
              }),
            });

            if (response.ok) {
              const data = await response.json();
              state[`${fetcher}(${addr})`] = data.result;
            }
          }
        }
        else if (fetcher === 'allowance' && addressParams.length >= 2) {
          // For allowance, use first two addresses as owner and spender
          const response = await fetch('/api/call-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress,
              functionName: 'allowance',
              parameters: [
                { type: 'address', value: addressParams[0] },
                { type: 'address', value: addressParams[1] }
              ],
              isQuery: true,
              abi
            }),
          });

          if (response.ok) {
            const data = await response.json();
            state[`${fetcher}(${addressParams[0]}, ${addressParams[1]})`] = data.result;
          }
        }
        else if (fetcher === 'totalSupply') {
          // Get total supply with no params
          const response = await fetch('/api/call-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress,
              functionName: 'totalSupply',
              parameters: [],
              isQuery: true,
              abi
            }),
          });

          if (response.ok) {
            const data = await response.json();
            state[`${fetcher}()`] = data.result;
          }
        }
      }

      return state;
    } catch (err) {
      console.error('Error fetching state:', err);
      return null;
    }
  };

  // Add gas estimation function
  const estimateGas = async () => {
    if (!selectedFunction || isReadOnlyFunction(selectedFunction)) {
      setGasEstimate(null);
      return;
    }

    try {
      const params = functionInputs.map(input => ({
        type: input.type,
        value: input.value
      }));

      const response = await fetch('/api/estimate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: selectedFunction.name,
          parameters: params,
          abi
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGasEstimate(data.gasEstimate);
      } else {
        setGasEstimate(null);
      }
    } catch (err) {
      console.error('Error estimating gas:', err);
      setGasEstimate(null);
    }
  };

  // Add a function to handle replaying a call from history
  const handleReplayCall = (functionName: string, params: any[]) => {
    // Find the function in the functions list
    const func = functions.find(f => f.name === functionName);
    if (!func) {
      setCallError(`Function ${functionName} not found`);
      return;
    }

    // Select the function
    setSelectedFunction(func);

    // Map params to input format
    const inputs = func.inputs.map((input, index) => ({
      name: input.name,
      type: input.type,
      value: params[index]?.value || ''
    }));

    setFunctionInputs(inputs);

    // Clear previous results
    setResult(null);
    setCallError('');

    // Estimate gas if needed
    if (!isReadOnlyFunction(func)) {
      setTimeout(() => estimateGas(), 500);
    }
  };

  return (
    <div className="container mx-auto my-4 space-y-6 pb-20">
      <ContractHeader
        contractAddress={contractAddress}
        abiSource={abiSource}
        functionsCount={functions.length}
        onViewAbi={() => setIsAbiModalOpen(true)}
        isVerified={isVerified}
      />

      <Alert variant="default" className="border-amber-400 bg-amber-50 dark:bg-amber-900/20">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Development Notice</AlertTitle>
        <AlertDescription>
          This feature is still under active development. Some contract interactions may not work as expected.
        </AlertDescription>
      </Alert>

      {isVerified ? (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert variant="default" className="border-green-400 bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            <AlertTitle>ABI Verified</AlertTitle>
            <AlertDescription>
              This contract has a verified ABI. All functions are accurately detected and available for interaction.
            </AlertDescription>
          </Alert>
        </motion.div>
      ) : abiError && abiError.includes('ABI generated from bytecode') ? (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert variant="default" className="border-amber-400 bg-amber-50 dark:bg-amber-900/20">
            <Info className="h-4 w-4 mr-2 text-amber-600" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>{abiError}</AlertDescription>
          </Alert>
        </motion.div>
      ) : abiError ? (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{abiError}</AlertDescription>
          </Alert>
        </motion.div>
      ) : null}

      {showBytecodeInput && (
        <motion.div variants={itemVariants} className="mb-8">
          <BytecodeInput
            bytecode={manualBytecode}
            onChange={setManualBytecode}
            onSubmit={handleManualBytecodeSubmit}
            isLoading={bytecodePending}
          />
        </motion.div>
      )}

      {isLoadingAbi ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[50vh] md:col-span-1" />
          <Skeleton className="h-[50vh] md:col-span-2" />
        </div>
      ) : (
        <>
          {functions.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
              <motion.div variants={itemVariants} className="md:col-span-1">
                <Card className="lg:sticky lg:top-4">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center mb-2">
                      <CardTitle className="text-lg">Functions</CardTitle>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardDescription className="flex items-center">
                        <FileCode className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        {functions.length} function{functions.length !== 1 ? 's' : ''} available
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="px-4 py-3 border-b border-border/60">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search functions..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                        <TabsTrigger
                          value="read"
                          className="data-[state=active]:bg-blue-50 data-[state=active]:dark:bg-blue-900/10 rounded-none"
                        >
                          <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                          Read ({readFunctions.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="write"
                          className="data-[state=active]:bg-amber-50 data-[state=active]:dark:bg-amber-900/10 rounded-none"
                        >
                          <Terminal className="h-4 w-4 mr-2 text-amber-500" />
                          Write ({writeFunctions.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="read" className="p-0">
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                          {Object.keys(groupedReadFunctions).length > 0 ? (
                            <Accordion
                              type="multiple"
                              defaultValue={Object.keys(groupedReadFunctions).slice(0, 1)}
                              className="px-4 py-2"
                            >
                              {Object.entries(groupedReadFunctions).map(([group, funcs]) =>
                                renderFunctionGroup(group, funcs)
                              )}
                            </Accordion>
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                              No read functions found{searchQuery ? ` matching "${searchQuery}"` : ''}.
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="write" className="p-0">
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                          {Object.keys(groupedWriteFunctions).length > 0 ? (
                            <Accordion
                              type="multiple"
                              defaultValue={Object.keys(groupedWriteFunctions).slice(0, 1)}
                              className="px-4 py-2"
                            >
                              {Object.entries(groupedWriteFunctions).map(([group, funcs]) =>
                                renderFunctionGroup(group, funcs)
                              )}
                            </Accordion>
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                              No write functions found{searchQuery ? ` matching "${searchQuery}"` : ''}.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3">
                {selectedFunction ? (
                  <Card className="h-full">
                    <CardHeader className={`pb-4 ${
                      isReadOnlyFunction(selectedFunction)
                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800/20'
                        : 'bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/20'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center text-lg">
                            {isReadOnlyFunction(selectedFunction) ? (
                              <BookOpen className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Terminal className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                            )}
                            {selectedFunction.name}
                          </CardTitle>
                          <CardDescription className="font-mono text-xs mt-1">
                            {selectedFunction.humanReadableSignature || `${selectedFunction.name}(${selectedFunction.inputs.map(i => `${i.type} ${i.name}`).join(', ')})`}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={isReadOnlyFunction(selectedFunction) ? "default" : "secondary"}
                          className={isReadOnlyFunction(selectedFunction)
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200"
                          }
                        >
                          {isReadOnlyFunction(selectedFunction) ? 'Read Function' : 'Write Function'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {functionInputs.length > 0 ? (
                          <div className="space-y-4">
                            {functionInputs.map((input, index) => (
                              <div key={input.name || index} className="grid gap-2">
                                <Label className="flex items-center text-sm">
                                  {input.name || `Parameter ${index + 1}`}
                                  <Badge variant="outline" className="ml-2 font-mono text-xs">
                                    {input.type}
                                  </Badge>
                                </Label>
                                <Input
                                  value={input.value}
                                  onChange={(e) => handleInputChange(input.name, e.target.value)}
                                  placeholder={`Enter value for ${input.name || `parameter ${index + 1}`}`}
                                  className="font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-muted/20 border rounded-md p-4 text-center text-muted-foreground">
                            This function doesn't require any parameters
                          </div>
                        )}

                        {callError && (
                          <Alert variant="destructive" className="text-sm">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <AlertDescription>{callError}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className={`w-full ${
                            isReadOnlyFunction(selectedFunction)
                              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                              : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800'
                          }`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {isReadOnlyFunction(selectedFunction) ? 'Reading...' : 'Executing...'}
                            </>
                          ) : (
                            <>
                              <Zap className="mr-2 h-4 w-4" />
                              {isReadOnlyFunction(selectedFunction) ? 'Read' : 'Execute'} Function
                            </>
                          )}
                        </Button>
                      </form>

                      <AnimatePresence>
                        {result && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="mt-8 border rounded-lg overflow-hidden"
                          >
                            <div className={`px-4 py-3 border-b ${
                              isReadOnlyFunction(selectedFunction)
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'bg-amber-50 dark:bg-amber-900/20'
                            }`}>
                              <div className="flex items-center">
                                <h3 className="text-sm font-semibold flex items-center">
                                  {isReadOnlyFunction(selectedFunction) ? 'Function Result' : 'Transaction Details'}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="ml-auto"
                                >
                                  {statusMessage?.type === 'success' ? 'Success' : 'Complete'}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-4">
                              {formatResult(result)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="rounded-full bg-primary/10 p-4 mb-6">
                        <FileCode className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-medium mb-3 text-center">Select a Function</h3>
                      <p className="text-muted-foreground text-center max-w-md mb-8">
                        Choose a function from the sidebar to interact with this smart contract.
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('read')}
                          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30"
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          Browse Read Functions
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('write')}
                          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-800/30"
                        >
                          <Terminal className="mr-2 h-4 w-4" />
                          Browse Write Functions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </div>
          ) : (
            <Card className="p-8 border-dashed">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Functions Available</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  We couldn't find any functions in this contract. This could be because the contract is non-standard,
                  has no functions, or the ABI couldn't be retrieved.
                </p>
                {showBytecodeInput ? (
                  <p className="text-sm text-muted-foreground">
                    Try providing the contract bytecode manually above, or verify the contract address is correct.
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowBytecodeInput(true)}
                  >
                    Provide Bytecode Manually
                  </Button>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ContractAnalysis
                contractAddress={contractAddress}
                abi={abi}
                contractFunctions={functions}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ContractStorage
                contractAddress={contractAddress}
                abi={abi}
              />
            </motion.div>
          </div>

          {functionHistory.length > 0 && (
            <FunctionHistory
              history={functionHistory}
              onReplayCall={handleReplayCall}
            />
          )}
        </>
      )}

      <AbiModal
        isOpen={isAbiModalOpen}
        onClose={() => setIsAbiModalOpen(false)}
        abi={functions.length > 0 ? functions : abi}
        contractAddress={contractAddress}
        abiSource={abiSource}
        isVerified={isVerified}
      />
    </div>
  );
};

export default InteractPage;