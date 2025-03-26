'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Progress } from '../../components/ui/progress';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertCircle, Check, Code, Loader2, ArrowRight, FileCode, Shield, Copy, ExternalLink, Clipboard, CheckCircle, Info, AlertTriangle, InfoIcon, FileUpIcon, AlertTriangleIcon, Code2Icon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { compileContract, deployContract } from '../utils/api';
import { sampleContracts, getDefaultSampleContract } from '../data/sample-contracts';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import SolidityEditor from './SolidityEditor';
import { ActionButtons, StatusPanel, TipsPanel } from './ButtonActions';

// Simple Toggle Switch component
const Switch = ({ checked, onChange, className = "" }) => {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  );
};

const CreateContractPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('sample');
  const [contractCode, setContractCode] = useState<string>('');
  const [customContractCode, setCustomContractCode] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [compilationResult, setCompilationResult] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [deploymentProgress, setDeploymentProgress] = useState<number>(0);
  const [deploymentStage, setDeploymentStage] = useState<string>('');
  const [isLargeContractDeployment, setIsLargeContractDeployment] = useState<boolean>(false);
  const [pendingDeployment, setPendingDeployment] = useState<{
    id: string;
    fileId: string;
    stage: string;
    progress: number;
  } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [securityScore, setSecurityScore] = useState<number>(100);
  const [validationResults, setValidationResults] = useState<{ errors: string[], warnings: string[], securityScore: number } | null>(null);
  const [contractName, setContractName] = useState("");
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [compileResult, setCompileResult] = useState(null);
  const [editorView, setEditorView] = useState("codeEditor"); // 'codeEditor' or 'abi'
  const [autoValidate, setAutoValidate] = useState(true);
  
  // Add theme detection right after useState declarations
  const { theme, resolvedTheme } = useTheme();
  
  useEffect(() => {
    // Set default sample contract
    const defaultContract = getDefaultSampleContract();
    if (defaultContract) {
      setContractCode(defaultContract.code);
      setSelectedSample(defaultContract.name);
    }
  }, []);

  // When switching tabs, update the contract code
  useEffect(() => {
    if (activeTab === 'sample') {
      const selectedContract = sampleContracts.find(c => c.name === selectedSample);
      if (selectedContract) {
        setContractCode(selectedContract.code);
      }
    } else {
      setContractCode(customContractCode);
    }
    
    // Reset states when changing tabs
    setError('');
    setCompilationResult(null);
    setContractAddress('');
  }, [activeTab, selectedSample, customContractCode]);

  // Linting function for Solidity code
  const lintSolidityCode = (code) => {
    // Your existing linting function code...
    // This can be kept as is
    
    // For brevity, I'll assume this returns the expected format
    return [];
  };

  // Helper function to find lines with a specific pattern in code
  const findLinesWithPattern = (code, pattern) => {
    if (!code) return [];
    
    const lines = code.split('\n');
    const matchingLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        matchingLines.push(i + 1); // 1-indexed line numbers
      }
    }
    
    // Reset the lastIndex property if pattern is a global regex
    if (pattern instanceof RegExp && pattern.global) {
      pattern.lastIndex = 0;
    }
    
    return matchingLines;
  };

  // Auto-validation when the contract code changes
  useEffect(() => {
    // Only validate if autoValidate is turned on
    if (!autoValidate || !contractCode.trim()) return;
    
    // Create a debounce timer to avoid excessive validations during typing
    const timer = setTimeout(() => {
      (async () => {
        // Run validation without UI indicators
        const results = await validateContractCode(contractCode);
        
        if (results) {
          setValidationResults(results);
        }
      })();
    }, 1000); // 1-second delay
    
    return () => clearTimeout(timer);
  }, [contractCode, autoValidate]);

  // Update effect for when validation results change
  useEffect(() => {
    if (validationResults) {
      // The SolidityEditor component will display these results
      // No need to manually handle decorations
      
      // Update the UI states with validation results
      setValidationErrors(validationResults.errors || []);
      setValidationWarnings(validationResults.warnings || []);
      setSecurityScore(validationResults.securityScore || 100);
    }
  }, [validationResults]);

  // Update the handleSampleChange to be async
  const handleSampleChange = async (value: string) => {
    setSelectedSample(value);
    
    // Find the selected contract from sampleContracts
    const selectedContract = sampleContracts.find(c => c.name === value);
    
    if (selectedContract) {
      setContractCode(selectedContract.code);
      
      if (autoValidate) {
        try {
          const results = await validateContractCode(selectedContract.code);
          setValidationWarnings(results.warnings);
          setValidationErrors(results.errors);
          setSecurityScore(results.securityScore);
          
          // Update validation results state - the SolidityEditor component will handle the decorations
          setValidationResults(results);
        } catch (error) {
          console.error("Error validating sample:", error);
        }
      }
    }
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomContractCode(e.target.value);
    if (activeTab === 'custom') {
      setContractCode(e.target.value);
    }
  };

  // The handle validate function
  const handleValidate = async () => {
    // If already validating, don't start another validation
    if (isValidating) return;
    
    setIsValidating(true);
    setError('');
    
    try {
      // Validate the current contract code
      const results = await validateContractCode(contractCode);
      
      // Update validation results state
      setValidationResults(results);
      
      // Update UI states
      setValidationErrors(results.errors);
      setValidationWarnings(results.warnings);
      setSecurityScore(results.securityScore);
    } catch (err) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate contract");
    } finally {
      setIsValidating(false);
    }
  };

  // Update the compileContract function to handle API validation responses
  const handleCompileResponse = (result) => {
    // If the compiler sent back validation results, update our UI
    if (result.warnings && Array.isArray(result.warnings)) {
      setWarnings(result.warnings);
    }
    
    if (result.securityScore !== undefined) {
      setSecurityScore(result.securityScore);
    }
    
    // Update compilation result
    setCompilationResult({
      ...result,
      // Extract additional metadata from result
      compilerVersion: result.compilerVersion || 'Unknown',
      gasEstimates: result.gasEstimates,
      methodIdentifiers: result.methodIdentifiers,
      deployedBytecodeSize: result.deployedBytecodeSize,
    });
  };

  // Fix the handleCompile function to properly call the API
  const handleCompile = async () => {
    setIsCompiling(true);
    setError('');
    
    // Validate before compiling
    try {
      const validationResults = await validateContractCode(contractCode);
      
      // Update validation state
      setValidationWarnings(validationResults.warnings);
      setValidationErrors(validationResults.errors);
      setSecurityScore(validationResults.securityScore);
      setValidationResults(validationResults);
      
      // Check for critical errors that should prevent compilation
      if (validationResults.errors.some(error => 
        error.includes('syntax error') || 
        error.includes('undeclared identifier') ||
        error.includes('not found')
      )) {
        setError('Cannot compile: Fix the syntax errors first');
        setIsCompiling(false);
        return;
      }

      // Proceed with compilation
      const response = await compileContract(contractCode);
      
      // Process the compilation result
      handleCompileResponse(response);

    } catch (err) {
      console.error('Compilation error:', err);
      setError(err.message || 'An error occurred during compilation');
      
      // Even with errors, check if we have partial validation data
      if (err.warnings) setValidationWarnings(err.warnings);
      if (err.securityScore) setSecurityScore(err.securityScore);
    } finally {
      setIsCompiling(false);
    }
  };

  // Fix the handleTabChange function by properly awaiting the promise
  const handleTabChange = async (newTab: string) => {
    // If we're switching from custom to sample, validate the custom code first
    if (activeTab === 'custom' && newTab === 'sample') {
      try {
        const results = await validateContractCode(customContractCode);
        if (results.securityScore < 50) {
          console.warn(`Warning: Your custom contract has security issues (score: ${results.securityScore})`);
        }
      } catch (error) {
        console.error("Error validating code during tab change:", error);
      }
    }
    
    // Update the tab
    setActiveTab(newTab);
  };

  // Add a function to display detailed contract info after compilation
  const getContractDetails = () => {
    if (!compilationResult) return null;
    
    return (
      <div className="mt-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Compiler:</span>
          <span>{compilationResult.compilerVersion || 'Solidity Compiler'}</span>
        </div>
        
        {compilationResult.deployedBytecodeSize && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Bytecode Size:</span>
            <span className={`${compilationResult.deployedBytecodeSize > 24000 ? 'text-amber-500' : 'text-green-500'}`}>
              {Math.round(compilationResult.deployedBytecodeSize / 1024 * 100) / 100} KB
            </span>
          </div>
        )}
        
        {compilationResult.gasEstimates?.creation && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Deployment Gas:</span>
            <span>{parseInt(compilationResult.gasEstimates.creation.totalCost).toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  const handleDeploy = async () => {
    if (!compilationResult) {
      setError('Please compile the contract first');
      return;
    }
    
    // Block deployment for contracts with low security scores
    if (securityScore < 60 && !window.confirm(
      `WARNING: This contract has a low security score (${securityScore}%). Deploying it could lead to security issues or vulnerabilities. Are you sure you want to continue?`
    )) {
      setError('Deployment cancelled due to low security score');
      return;
    }
    
    // Check for critical security issues
    const hasCriticalWarnings = warnings.some(w => 
      w.includes('reentrancy') || 
      w.includes('delegatecall') || 
      w.includes('unbounded loop')
    );
    
    if (hasCriticalWarnings && !window.confirm(
      `WARNING: This contract has critical security vulnerabilities that could lead to loss of funds or control. It is strongly recommended NOT to deploy this contract. Are you absolutely sure you want to continue?`
    )) {
      setError('Deployment cancelled due to critical security vulnerabilities');
      return;
    }

    setIsDeploying(true);
    setError('');
    setDeploymentProgress(0);
    setDeploymentStage('Preparing to deploy contract...');

    try {
      // Initialize deployment progress tracker
      let deploymentStartTime = Date.now();
      
      // Simulate intermediate deployment steps for better UX
      const progressUpdater = setInterval(() => {
        const elapsedTime = Date.now() - deploymentStartTime;
        let newProgress = 0;
        let newStage = '';
        
        if (elapsedTime < 2000) {
          newProgress = 10;
          newStage = 'Initializing deployment...';
        } else if (elapsedTime < 5000) {
          newProgress = 25;
          newStage = 'Preparing contract bytecode...';
        } else if (elapsedTime < 8000) {
          newProgress = 40;
          newStage = 'Sending transaction to testnet...';
        } else if (elapsedTime < 11000) {
          newProgress = 60;
          newStage = 'Waiting for transaction confirmation...';
        } else if (elapsedTime < 14000) {
          newProgress = 75;
          newStage = 'Transaction confirmed, finalizing...';
        } else {
          newProgress = 90;
          newStage = 'Almost done, retrieving contract address...';
        }
        
        setDeploymentProgress(newProgress);
        setDeploymentStage(newStage);
      }, 2000);
      
      // Actual deployment
      const response = await deployContract(compilationResult.bytecode, compilationResult.abi);
      
      // Clear the progress updater
      clearInterval(progressUpdater);
      
      // Set final progress
      setDeploymentProgress(100);
      setDeploymentStage('Contract successfully deployed!');
      
      // Update state with contract address
      setContractAddress(response.contractAddress);
      
    } catch (err) {
      console.error('Deployment error:', err);
      setError(err.message || 'An error occurred during deployment');
    } finally {
      // Ensure isDeploying is set to false after completion or error
      setIsDeploying(false);
    }
  };

  const handleInteract = () => {
    if (contractAddress) {
      router.push(`/interact?address=${contractAddress}`);
    }
  };

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateContractCode = async (code: string): Promise<{ errors: string[], warnings: string[], securityScore: number }> => {
    // This function would normally call an API for validation
    // For this example, we'll simulate a validation response
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check basic syntax
        const errors = [];
        const warnings = [];
        let securityScore = 100;
        
        // Example validations
        if (!code.includes('pragma solidity')) {
          errors.push('Missing solidity pragma statement');
          securityScore -= 10;
        }
        
        if (code.includes('selfdestruct')) {
          warnings.push('Use of selfdestruct is deprecated and can lead to loss of funds');
          securityScore -= 15;
        }
        
        if (code.includes('tx.origin')) {
          warnings.push('Using tx.origin for authentication is vulnerable to phishing attacks');
          securityScore -= 20;
        }
        
        if (code.includes('block.timestamp')) {
          warnings.push('Reliance on block.timestamp can be manipulated by miners within certain limits');
          securityScore -= 5;
        }
        
        // More complex warnings for demo purposes
        if (code.includes('.call{value:')) {
          warnings.push('Potential reentrancy vulnerability detected at low-level call with value');
          securityScore -= 25;
        }
        
        resolve({
          errors,
          warnings,
          securityScore: Math.max(0, securityScore)
        });
      }, 800); // Simulate network delay
    });
  };

  // Function to get warning info
  const getWarningInfo = (warning: string): { description: string, severity: 'high' | 'medium' | 'low', fix: string } => {
    // Default values
    let description = "This is a potential security issue.";
    let severity: 'high' | 'medium' | 'low' = 'medium';
    let fix = "Review the code carefully and consider alternative approaches.";
    
    // Customize based on warning content
    if (warning.includes('reentrancy')) {
      description = "Reentrancy vulnerabilities allow attackers to repeatedly call back into your contract before the first execution completes.";
      severity = 'high';
      fix = "Use the checks-effects-interactions pattern or a reentrancy guard.";
    } else if (warning.includes('selfdestruct')) {
      description = "The selfdestruct operation is deprecated and can lead to permanent loss of funds.";
      severity = 'high';
      fix = "Remove selfdestruct and implement alternative contract upgrade patterns.";
    } else if (warning.includes('tx.origin')) {
      description = "tx.origin for authentication is vulnerable to phishing attacks, as it returns the original sender of the transaction.";
      severity = 'high';
      fix = "Use msg.sender instead for authentication.";
    } else if (warning.includes('block.timestamp')) {
      description = "Miners can manipulate block.timestamp within a 15-second window, making it unreliable for precise time-based conditions.";
      severity = 'medium';
      fix = "Don't use block.timestamp for random number generation or precise timing requirements.";
    } else if (warning.includes('floating pragma')) {
      description = "Using a floating pragma (^) allows compilation with newer compiler versions that might introduce incompatibilities.";
      severity = 'low';
      fix = "Lock the pragma to a specific version for production deployments.";
    }
    
    return { description, severity, fix };
  };

  // Add a helper function to explain Solidity version errors
  const explainCompilerError = (error: string) => {
    if (error.includes('requires different compiler version')) {
      const match = error.match(/current compiler is ([0-9.]+)/);
      const currentCompiler = match ? match[1] : 'unknown';
      
      return `Compiler version mismatch: The contract specifies a version that doesn't match the current compiler (${currentCompiler}). 
      To fix this, update your pragma statement to use a compatible version with the ^ symbol (e.g., pragma solidity ^0.8.0).`;
    }
    return error;
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 mb-8">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, 20, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"
            animate={{
              y: [0, 30, 0],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" 
             style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
        </div>

        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Create Smart Contracts
            </motion.h1>
            <motion.p 
              className="text-lg text-foreground/80 mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Build, compile and deploy Solidity smart contracts to Ethereum testnet in minutes — with real-time validation and security analysis.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side - Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:flex-1"
          >
            {/* Contract Selection */}
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg">
              <h2 className="text-xl font-bold mb-6 text-primary">Smart Contract</h2>
              <Tabs defaultValue="sample" value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="sample">Sample Contracts</TabsTrigger>
                  <TabsTrigger value="custom">Custom Contract</TabsTrigger>
                </TabsList>
                <TabsContent value="sample" className="space-y-6">
                  <div>
                    <Label htmlFor="template" className="text-foreground/80 mb-2 block">
                      Select Sample Contract
                    </Label>
                    <Select value={selectedSample} onValueChange={handleSampleChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a sample contract" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleContracts.map(contract => (
                          <SelectItem key={contract.name} value={contract.name}>
                            {contract.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="custom">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customContract" className="text-foreground/80 mb-2 block">
                        Write or paste your own Solidity contract
                      </Label>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="autoValidate" className="text-sm text-muted-foreground">
                          Auto-validate code
                        </Label>
                        <Switch checked={autoValidate} onChange={setAutoValidate} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Code Editor */}
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-background/80 backdrop-blur-sm border-b border-border/30 flex items-center px-4 z-10">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="ml-4 text-foreground/60 text-sm">
                    {activeTab === 'sample' ? (selectedSample || 'Sample') + '.sol' : 'MyContract.sol'}
                  </div>
                </div>
                <div className="h-[700px] pt-10">
                  <div className="w-full" style={{ 
                    height: "700px", 
                    border: "1px solid rgba(255, 255, 255, 0.1)", 
                    borderRadius: "8px", 
                    overflow: "auto"
                  }}>
                    <SolidityEditor
                      value={contractCode}
                      onChange={(value) => {
                        setContractCode(value);
                        if (activeTab === 'custom') {
                          setCustomContractCode(value);
                        }
                      }}
                      validationResults={validationResults}
                      lintSolidityCode={lintSolidityCode}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Status & Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:w-96"
          >
            {/* Action Buttons Panel */}
            <ActionButtons
              handleValidate={handleValidate}
              handleCompile={handleCompile}
              handleDeploy={handleDeploy}
              handleInteract={handleInteract}
              isValidating={isValidating}
              isCompiling={isCompiling}
              isDeploying={isDeploying}
              contractCode={contractCode}
              customContractCode={customContractCode}
              activeTab={activeTab}
              compilationResult={compilationResult}
              contractAddress={contractAddress}
              deploymentProgress={deploymentProgress}
              deploymentStage={deploymentStage}
              copied={copied}
              setCopied={setCopied}
            />
            
            {/* Status Panel */}
            <StatusPanel
              isValidating={isValidating}
              isCompiling={isCompiling}
              isDeploying={isDeploying}
              validationResults={validationResults}
              validationErrors={validationErrors}
              validationWarnings={validationWarnings}
              securityScore={securityScore}
              compilationResult={compilationResult}
              contractAddress={contractAddress}
              error={error}
              explainCompilerError={explainCompilerError}
              getContractDetails={getContractDetails}
              getWarningInfo={getWarningInfo}
              warnings={warnings}
            />
            
            {/* Tips Panel */}
            <TipsPanel />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CreateContractPage; 