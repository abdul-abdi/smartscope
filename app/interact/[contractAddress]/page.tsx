'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, FileCode, Code, Terminal, BookOpen, Search, 
  Zap, ChevronDown, ChevronRight, Info, AlertTriangle, ArrowRight, BrainCircuit
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
import ContractAnalysisCard from './components/ContractAnalysisCard';
import ContractTransactionDetails from './components/ContractTransactionDetails';
import FunctionHistory from './components/FunctionHistory';
import ContractStorage from './components/ContractStorage';
import AbiModal from './components/AbiModal';

// API utility
import { analyzeContract } from '../../utils/api';
import { 
  formatToEvmAddress, 
  formatToEvmAddressAsync, 
  addressFormatDebugInfo 
} from '../../utils/contract-utils';

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
            // Only use the verified functions
            const verifiedFunctionItems = verifyData.verifiedFunctions.map((item: any) => ({
              ...item,
              inputs: item.inputs || [],
              outputs: item.outputs || [],
              humanReadableSignature: item.humanReadableSignature
            }));
            
            setFunctions(verifiedFunctionItems);
            
            // Show warning if some functions were filtered out
            if (verifyData.total > verifyData.verified) {
              setAbiError(`Warning: ${verifyData.total - verifyData.verified} functions were found in the ABI but couldn't be verified in the contract bytecode.`);
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
      
      setAbiSource('bytecode');
      
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
      setShowBytecodeInput(false);
      resetFunctionState();
      
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
    
    // First verify that the function actually exists
    try {
      const verifyResponse = await fetch('/api/verify-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: selectedFunction.name,
          inputTypes: selectedFunction.inputs.map(input => input.type)
        }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.exists) {
        setCallError(`Function "${selectedFunction.name}" does not exist in the contract bytecode. It may have been extracted from source code or transaction history but is not actually implemented in this contract.`);
        setIsLoading(false);
        return;
      }
    } catch (verifyError) {
      // If verification fails, we'll still try the call but warn the user
      console.warn('Function verification failed:', verifyError);
    }
    
    // Determine if this is a read function
    const isReadFunction = isReadOnlyFunction(selectedFunction);
    
    try {
      // For state-changing functions, fetch relevant state before execution
      let stateBefore = null;
      if (!isReadFunction && showStateChanges) {
        stateBefore = await fetchRelevantState(contractAddress, selectedFunction);
      }
      
      // Format parameters for the API call
      const params = functionInputs.map(input => ({
        type: input.type,
        value: input.value
      }));
      
      // Execute the contract call
      const response = await fetch('/api/call-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: selectedFunction.name,
          parameters: params,
          isQuery: isReadFunction,
          abi,
          gasEstimate: gasEstimate
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Contract call failed');
      }

      // For state-changing functions, fetch state again after execution
      let stateAfter = null;
      let stateChanges = null;
      
      if (!isReadFunction && showStateChanges && stateBefore) {
        // Wait briefly for the transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
        stateAfter = await fetchRelevantState(contractAddress, selectedFunction);
        
        // Compare before and after states
        if (stateBefore && stateAfter) {
          stateChanges = {};
          
          // Find all keys in either object
          const allKeys = new Set([
            ...Object.keys(stateBefore),
            ...Object.keys(stateAfter)
          ]);
          
          // Compare values
          for (const key of allKeys) {
            const before = stateBefore[key];
            const after = stateAfter[key];
            
            // Only include if values are different
            if (before !== after) {
              stateChanges[key] = { before, after };
            }
          }
          
          // If no changes were detected, set to null
          if (Object.keys(stateChanges).length === 0) {
            stateChanges = null;
          }
        }
      }
      
      // Add the result to function history
      setFunctionHistory(prev => [
        {
          functionName: selectedFunction.name,
          params: functionInputs.map(i => ({ name: i.name, value: i.value })),
          result: data,
          timestamp: Date.now()
        },
        ...prev.slice(0, 9) // Keep last 10 calls
      ]);

      // Format the result for display
      setResult({
        ...data,
        stateChanges
      });
      
      // Set a success message
      setStatusMessage({
        type: 'success',
        message: isReadFunction 
          ? 'Function call successful!' 
          : 'Transaction executed successfully!'
      });
      
    } catch (err: any) {
      console.error('Error executing function:', err);
      setCallError(err.message || 'Error executing function');
      setStatusMessage({
        type: 'error',
        message: 'Function execution failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze the contract 
  const handleAnalyzeContract = async () => {
    setIsAnalyzing(true);
    setContractAnalysis('');
    
    try {
      const analysis = await analyzeContract(contractAddress, abi);
      setContractAnalysis(analysis);
    } catch (err: any) {
      console.error('Error analyzing contract:', err);
      setContractAnalysis(`Error analyzing contract: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to determine if a function is read-only
  const isReadOnlyFunction = (func: ContractFunction): boolean => {
    if (!func) return false;
    
    // Check explicit markers
    const isViewOrPure = func.stateMutability === 'view' || func.stateMutability === 'pure';
    const isConstant = func.constant === true;
    
    // Check name patterns that typically indicate read functions
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
      
    // Check if the function has outputs
    const hasOutputs = func.outputs && func.outputs.length > 0;
    
    return isViewOrPure || isConstant || (hasGetterNamePattern && hasOutputs);
  };

  // Filter and group functions
  const { readFunctions, writeFunctions } = useMemo(() => {
    const filteredFunctions = functions.filter(f => {
      if (!searchQuery) return true;
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    return {
      readFunctions: filteredFunctions.filter(f => isReadOnlyFunction(f)),
      writeFunctions: filteredFunctions.filter(f => !isReadOnlyFunction(f))
    };
  }, [functions, searchQuery]);

  // Group functions by common patterns
  const groupedReadFunctions = useMemo(() => {
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
  }, [readFunctions]);

  const groupedWriteFunctions = useMemo(() => {
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
    const isSelected = selectedFunction?.name === func.name;
    const isRead = isReadOnlyFunction(func);
    const isVerified = func.verified !== false; // If verified property exists and is false, the function couldn't be verified
    
    return (
      <div
        key={func.name}
        className={`p-2 border rounded-md cursor-pointer transition-all ${
          isSelected
            ? isRead 
              ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
              : 'bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
            : 'hover:bg-muted/50 border-border'
        } ${!isVerified ? 'opacity-60' : ''}`}
        onClick={() => handleFunctionSelect(func)}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm flex items-center">
            {func.name}
            {!isVerified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-3.5 w-3.5 ml-1.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">This function couldn't be verified in the contract bytecode and may not exist.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          <Badge 
            variant="outline" 
            className={isRead 
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
            }
          >
            {isRead ? 'read' : 'write'}
          </Badge>
        </div>
        {func.humanReadableSignature && (
          <div className="font-mono text-xs text-muted-foreground mt-1 truncate">
            {func.humanReadableSignature}
          </div>
        )}
      </div>
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
    <motion.div
      className="container mx-auto px-4 max-w-6xl py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Contract Identity */}
      <motion.div variants={itemVariants} className="mb-6">
        <ContractHeader 
          contractAddress={contractAddress} 
          abiSource={abiSource}
          functionsCount={functions.length}
          onViewAbi={() => setIsAbiModalOpen(true)}
        />
      </motion.div>

      {/* Error Messages */}
      {abiError && (
        <motion.div variants={itemVariants} className="mb-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{abiError}</AlertDescription>
          </Alert>
        </motion.div>
      )}
      
      {/* Add the ContractStorage component right after the ContractHeader and error messages */}
      {!isLoadingAbi && functions.length > 0 && (
        <motion.div variants={itemVariants} className="mb-6">
          <ContractStorage 
            contractAddress={contractAddress} 
            abi={abi}
          />
        </motion.div>
      )}
      
      {/* Bytecode Input */}
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

      {/* Main Content */}
      {isLoadingAbi ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[50vh] md:col-span-1" />
          <Skeleton className="h-[50vh] md:col-span-2" />
        </div>
      ) : (
        <>
          {functions.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
              {/* Functions List Sidebar */}
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
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAnalyzeContract()}
                              disabled={isAnalyzing}
                              className="flex items-center bg-gradient-to-r from-primary/80 to-purple-500/80 hover:from-primary hover:to-purple-500 text-white border-none"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span className="whitespace-nowrap sm:inline hidden ml-1.5">Analyzing...</span>
                                </>
                              ) : (
                                <>
                                  <BrainCircuit className="h-3.5 w-3.5" />
                                  <span className="whitespace-nowrap sm:inline hidden ml-1.5">Analyze Contract</span>
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>Analyze this contract's security and functionality</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Search input */}
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
                    
                    {/* Function tabs */}
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

              {/* Function Interaction Panel */}
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
                        {/* Function Inputs */}
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
                    
                        {/* Error message */}
                        {callError && (
                          <Alert variant="destructive" className="text-sm">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <AlertDescription>{callError}</AlertDescription>
                          </Alert>
                        )}

                        {/* Submit button */}
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

                      {/* Function Results */}
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

          {/* Contract Analysis Section (conditionally rendered) */}
          {contractAnalysis && (
            <motion.div
              variants={itemVariants}
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ContractAnalysisCard 
                analysis={contractAnalysis} 
                isLoading={isAnalyzing}
              />
            </motion.div>
          )}

          {/* Function History */}
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
      />
    </motion.div>
  );
};

export default InteractPage; 