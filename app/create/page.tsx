'use client';

import React, { useState, useEffect } from 'react';
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

  const handleSampleChange = (value: string) => {
    setSelectedSample(value);
    const selectedContract = sampleContracts.find(c => c.name === value);
    if (selectedContract) {
      setContractCode(selectedContract.code);
      // Reset states when changing contract
      setError('');
      setCompilationResult(null);
      setContractAddress('');
    }
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomContractCode(e.target.value);
    if (activeTab === 'custom') {
      setContractCode(e.target.value);
    }
  };

  const handleValidate = () => {
    if (!contractCode.trim()) {
      setError('Please enter contract code first');
      return;
    }
    
    // Clear previous validation and errors
    setError('');
    setWarnings([]);
    setSecurityScore(100);
    
    // Run the validation
    const results = validateContractCode(contractCode);
    setValidationResults(results);
    
    // Update the UI based on validation results
    if (results.errors.length > 0) {
      setError(`Contract validation failed: ${results.errors[0]}`);
    }
    
    if (results.warnings.length > 0) {
      setWarnings(results.warnings);
      setSecurityScore(results.securityScore);
    }
  };

  const handleCompile = async () => {
    if (!contractCode.trim()) {
      setError('Please enter contract code first');
      return;
    }

    // First validate the contract
    handleValidate();
    
    // If there are validation errors, don't proceed with compilation
    if (validationResults && validationResults.errors.length > 0) {
      return;
    }
    
    setIsCompiling(true);
    
    try {
      // Proceed with actual compilation
      const result = await compileContract(contractCode);
      setCompilationResult(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during compilation');
    } finally {
      setIsCompiling(false);
    }
  };

  // Add a comprehensive validation function for Solidity contracts
  const validateContractCode = (code: string): { errors: string[], warnings: string[], securityScore: number } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100; // Start with perfect score
    
    // Check if code contains a contract definition
    if (!code.includes('contract ')) {
      errors.push('No contract definition found');
    }
    
    // Check for pragma directive
    if (!code.includes('pragma solidity')) {
      errors.push('Missing pragma solidity directive');
    }
    
    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} opening vs ${closeBraces} closing`);
    }
    
    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} opening vs ${closeParens} closing`);
    }
    
    // Check for semicolons
    const lines = code.split('\n');
    const codeLines = lines.filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      !line.trim().startsWith('*') &&
      !line.trim().endsWith('{') &&
      !line.trim().endsWith('}') &&
      !line.trim().startsWith('pragma') &&
      !line.trim().startsWith('import')
    );
    
    const missingSemicolons = codeLines.filter(line => 
      !line.trim().endsWith(';') && 
      !line.trim().endsWith('{') && 
      !line.trim().endsWith('}') &&
      !line.trim().endsWith('*/') &&
      !line.trim().startsWith('function')
    );
    
    if (missingSemicolons.length > 0) {
      warnings.push(`Possible missing semicolons in ${missingSemicolons.length} lines`);
      securityScore -= 5; // Minor issue
    }
    
    // Security check: Reentrancy vulnerability
    if (code.includes('.call{value:') && !code.includes('ReentrancyGuard')) {
      warnings.push('Potential reentrancy vulnerability detected with .call{value:}. Consider using ReentrancyGuard or checks-effects-interactions pattern.');
      securityScore -= 20; // Major security issue
    }
    
    // Security check: Unchecked external calls
    if ((code.includes('.call(') || code.includes('.delegatecall(')) && !code.includes('require(success')) {
      warnings.push('Unchecked external call result detected. Make sure to check return values of low-level calls.');
      securityScore -= 15; // Significant security issue
    }
    
    // Gas optimization: Avoid expensive operations in loops
    const loopStorage = /for\s*\([^)]*\)\s*{[^}]*storage/i;
    if (loopStorage.test(code)) {
      warnings.push('Storage access in loops detected. This can be gas-intensive, consider caching storage variables outside loops.');
      securityScore -= 10; // Performance issue
    }
    
    // Check for visibility modifiers
    const functionDefRegex = /function\s+\w+\s*\([^)]*\)(?:\s+\w+)*(?!\s+(?:public|private|internal|external))/g;
    if (code.match(functionDefRegex)) {
      warnings.push('Functions missing visibility modifiers (public, private, internal, external) detected.');
      securityScore -= 10; // Security best practice issue
    }
    
    // Check for floating pragma
    const pragmaRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)/;
    if (pragmaRegex.test(code)) {
      warnings.push('Floating pragma detected. Consider using a fixed compiler version for production.');
      securityScore -= 5; // Minor issue
    }
    
    // Check for common typos
    if (code.includes('selfdestruct')) {
      warnings.push('Use of selfdestruct detected, which will be deprecated in future Solidity versions.');
      securityScore -= 5; // Minor issue
    }
    
    // Check for tx.origin usage
    if (code.includes('tx.origin')) {
      warnings.push('Use of tx.origin detected, which can lead to phishing attacks. Consider using msg.sender instead.');
      securityScore -= 15; // Significant security issue
    }
    
    // Check for use of block.timestamp
    if (code.includes('block.timestamp')) {
      warnings.push('Use of block.timestamp detected. Be aware that miners can manipulate it slightly.');
      securityScore -= 5; // Minor issue
    }
    
    // Check contract size (Hedera has size limits)
    if (code.length > 24576) {  // 24KB is approaching risky territory
      warnings.push('Contract code is very large and may exceed deployment size limits on Hedera.');
      securityScore -= 10; // Deployment risk
    }
    
    // Check for unbounded loops which could lead to DoS
    if (code.includes('while') || /for\s*\([^)]*\)\s*[^{]*{/.test(code)) {
      // Check if there's no clear bound
      const hasUnboundedLoop = /for\s*\([^)]*;\s*;\s*[^)]*\)/.test(code) || 
                              /while\s*\([^)]*true[^)]*\)/.test(code);
      if (hasUnboundedLoop) {
        warnings.push('Potentially unbounded loop detected which could lead to DoS attacks or excessive gas usage.');
        securityScore -= 15; // Significant security issue
      }
    }
    
    // Check for integer overflow/underflow in older Solidity versions
    if (!code.includes('pragma solidity ^0.8') && !code.includes('SafeMath')) {
      warnings.push('Contract may be vulnerable to integer overflow/underflow. Use Solidity 0.8.x or SafeMath library.');
      securityScore -= 15; // Significant security issue
    }
    
    // Ensure security score doesn't go below 0
    securityScore = Math.max(0, securityScore);
    
    return { errors, warnings, securityScore };
  };

  // Create a helper function to get detailed information about warnings
  const getWarningInfo = (warning: string): { description: string, severity: 'high' | 'medium' | 'low', fix: string } => {
    if (warning.includes('Reentrancy vulnerability')) {
      return {
        description: 'Reentrancy allows attackers to repeatedly call your contract before the first execution is complete.',
        severity: 'high',
        fix: 'Use the ReentrancyGuard modifier or follow checks-effects-interactions pattern.'
      };
    }
    
    if (warning.includes('Unchecked external call')) {
      return {
        description: 'Low-level calls can fail silently if their return value is not checked.',
        severity: 'high',
        fix: 'Add a require statement to check the success value: require(success, "Call failed");'
      };
    }
    
    if (warning.includes('Storage access in loops')) {
      return {
        description: 'Reading or writing to storage in loops is gas-intensive and can lead to high transaction costs.',
        severity: 'medium',
        fix: 'Cache storage variables in memory before the loop and write back after.'
      };
    }
    
    if (warning.includes('visibility modifiers')) {
      return {
        description: 'Functions without visibility modifiers default to public, which may expose functionality unintentionally.',
        severity: 'medium',
        fix: 'Add explicit visibility modifiers (public, private, internal, external) to all functions.'
      };
    }
    
    if (warning.includes('tx.origin')) {
      return {
        description: 'tx.origin is vulnerable to phishing attacks since it contains the original sender of the transaction.',
        severity: 'high',
        fix: 'Use msg.sender instead of tx.origin for authentication.'
      };
    }
    
    if (warning.includes('Floating pragma')) {
      return {
        description: 'Using a floating pragma allows the contract to be compiled with different compiler versions, which may introduce bugs or vulnerabilities.',
        severity: 'low',
        fix: 'Use a fixed pragma version like "pragma solidity 0.8.17;" instead of "pragma solidity ^0.8.17;"'
      };
    }
    
    if (warning.includes('selfdestruct')) {
      return {
        description: 'selfdestruct will be deprecated in future Solidity versions.',
        severity: 'low',
        fix: 'Consider alternative designs that don\'t rely on selfdestruct.'
      };
    }
    
    if (warning.includes('block.timestamp')) {
      return {
        description: 'Miners can manipulate block.timestamp within a small window, potentially affecting time-sensitive logic.',
        severity: 'low',
        fix: 'Don\'t rely on block.timestamp for critical security decisions or random number generation.'
      };
    }
    
    if (warning.includes('unbounded loop')) {
      return {
        description: 'Loops without clear bounds can consume excessive gas or lead to denial of service attacks.',
        severity: 'high',
        fix: 'Add explicit upper bounds to loops and consider pagination for large data sets.'
      };
    }
    
    if (warning.includes('integer overflow/underflow')) {
      return {
        description: 'Arithmetic operations can overflow or underflow, leading to unexpected behavior.',
        severity: 'high',
        fix: 'Use Solidity 0.8.x which has built-in overflow checks or use SafeMath library for older versions.'
      };
    }
    
    // Default case
    return {
      description: 'Potential code issue detected.',
      severity: 'medium',
      fix: 'Review the warning and consider refactoring your code.'
    };
  };

  const handleDeploy = async (resumeOp = false, existingFileId = null, customDeploymentId = null) => {
    if (!compilationResult && !resumeOp) {
      setError('Please compile the contract first');
      return;
    }

    // Clear any existing errors when starting a new deployment
    setIsDeploying(true);
    setError('');
    
    // Reset pending deployment if this is a new deployment
    if (!resumeOp) {
      setPendingDeployment(null);
    }
    
    setDeploymentProgress(resumeOp ? 30 : 0); // Start at higher progress for resume
    setDeploymentStage(resumeOp ? 'Resuming deployment...' : 'Preparing for deployment');
    
    try {
      // Check if the bytecode is large (over 32KB)
      const bytecodeSize = compilationResult?.bytecode?.length || 0;
      console.log(`Contract size: ${bytecodeSize} characters, ${Math.ceil(bytecodeSize/2/1024)} KB`);
      
      // Generate a unique deployment ID
      const deploymentId = customDeploymentId || `deploy-${Date.now()}`;
      console.log(`Starting deployment with ID: ${deploymentId}`);
      
      // Make initial API request to start deployment
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bytecode: compilationResult.bytecode,
          abi: compilationResult.abi,
          deploymentId
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Deployment failed');
      }
      
      const data = await response.json();
      
      // Check if it's a large contract that needs special handling
      if (data.isLarge) {
        console.log('Large contract detected, using specialized direct deployment');
        setIsLargeContractDeployment(true);
        setDeploymentStage('Large contract detected, using optimized deployment');
        setDeploymentProgress(30);
        
        // Make a request to the direct deployment endpoint
        const directResponse = await fetch('/api/direct-deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bytecode: compilationResult.bytecode,
            abi: compilationResult.abi,
            deploymentId
          }),
        });
        
        if (!directResponse.ok) {
          const directData = await directResponse.json();
          throw new Error(directData.error || 'Direct deployment failed');
        }
        
        const directData = await directResponse.json();
        
        if (directData.success) {
          setDeploymentProgress(100);
          setDeploymentStage('Contract deployed successfully');
          setContractAddress(directData.contractAddress);
          setIsDeploying(false);
        } else {
          // Start polling for status in case the deployment is still in progress
          let statusCheckAttempts = 0;
          const maxStatusChecks = 5;
          const checkDeploymentStatus = async () => {
            if (statusCheckAttempts >= maxStatusChecks) {
              throw new Error('Deployment timed out');
            }
            
            statusCheckAttempts++;
            setDeploymentStage(`Checking deployment status (attempt ${statusCheckAttempts})...`);
            setDeploymentProgress(50 + statusCheckAttempts * 10);
            
            const statusResponse = await fetch(`/api/direct-deploy?id=${deploymentId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed' && statusData.contractAddress) {
              setDeploymentProgress(100);
              setDeploymentStage('Contract deployed successfully');
              setContractAddress(statusData.contractAddress);
              setIsDeploying(false);
              return;
            } else if (statusData.status === 'error') {
              throw new Error(statusData.error || 'Deployment failed');
            } else {
              // Still in progress, continue polling
              setTimeout(checkDeploymentStatus, 2000);
            }
          };
          
          // Start polling
          checkDeploymentStatus();
        }
      } else {
        // Standard deployment
        setIsLargeContractDeployment(false);
        
        if (data.contractId && data.contractAddress) {
          // Deployment was successful
          setDeploymentProgress(100);
          setDeploymentStage('Contract deployed successfully');
          setContractAddress(data.contractAddress);
          setIsDeploying(false);
        } else {
          // This should not happen with standard deployment
          throw new Error('Deployment did not return a contract address');
        }
      }
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'An error occurred during deployment');
      setIsDeploying(false);
    }
  };
  
  // Helper function to handle deployment errors
  const handleDeploymentError = (data: any) => {
    console.error('Deployment error data:', data);
    
    // Handle specific error types
    if (data.errorCode === 'PAYER_ACCOUNT_NOT_FOUND') {
      setError(`Hedera account not found. Please check your account credentials in the .env.local file.`);
    } else if (data.errorType === 'CREDENTIAL_ERROR') {
      setError(`Credential error: ${data.error}`);
    } else if (data.error?.includes('bytecode') || data.errorDetails?.includes('bytecode')) {
      setError(`Bytecode error: ${data.error}. This may happen during resumption. Try deploying again.`);
    } else {
      setError(data.error || 'An error occurred during deployment');
    }
    
    // If we get detailed error info, log it
    if (data.errorDetails) {
      console.error('Error details:', data.errorDetails);
    }
    
    // Show the retry button if this was a resumption error
    if (data.resumeNeeded || data.error?.includes('resume') || data.error?.includes('timeout')) {
      setPendingDeployment({
        id: data.deploymentId,
        fileId: data.fileId || '',
        stage: 'Failed - needs retry',
        progress: 0
      });
    }
  };

  const handleInteract = () => {
    if (contractAddress) {
      router.push(`/interact/${contractAddress}`);
    }
  };

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 mb-12">
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
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-500">
              Create Smart Contract
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Choose from sample contracts or write your own custom code, then deploy and interact instantly on Hedera Testnet
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Code Editor */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg">
              <Tabs defaultValue="sample" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">Contract Code</h2>
                  <TabsList className="grid grid-cols-2 w-[400px]">
                    <TabsTrigger value="sample">Sample Contracts</TabsTrigger>
                    <TabsTrigger value="custom">Custom Contract</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="sample">
                  <div className="mb-6">
                    <Label htmlFor="sample-contract" className="mb-2 block text-lg">Select a Sample Contract</Label>
                    <Select value={selectedSample} onValueChange={handleSampleChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a sample contract to start with" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleContracts.map((contract) => (
                          <SelectItem key={contract.name} value={contract.name}>
                            {contract.name} - {contract.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      These ready-to-use contracts demonstrate common smart contract patterns and functionalities
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="custom">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="custom-contract" className="block text-lg">Write Your Own Contract</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCopyContract}
                          className="flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href="https://docs.soliditylang.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <ExternalLink className="h-4 w-4" />
                            Solidity Docs
                          </a>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Paste or write your own Solidity code below. Make sure to use Solidity version 0.8.0 or higher for compatibility.
                    </p>
                  </div>
                </TabsContent>

                {/* Code Editor for both tabs */}
                <div className="relative rounded-xl overflow-hidden mb-6">
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
                  <Textarea
                    value={activeTab === 'sample' ? contractCode : customContractCode}
                    onChange={activeTab === 'sample' ? (e) => setContractCode(e.target.value) : handleCustomCodeChange}
                    className="w-full h-96 font-mono text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none pt-14 resize-none border-0"
                    placeholder="Paste your Solidity code here..."
                  />
                </div>
              </Tabs>

              {/* Compile and Deploy buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleValidate}
                  disabled={!(activeTab === 'sample' ? contractCode.trim() : customContractCode.trim())}
                  variant="outline"
                  className="group bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30"
                  size="lg"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Validate Contract
                </Button>
                
                <Button
                  onClick={handleCompile}
                  disabled={isCompiling || !(activeTab === 'sample' ? contractCode.trim() : customContractCode.trim())}
                  className="group"
                  size="lg"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      Compile Contract
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => handleDeploy()}
                  disabled={isDeploying || !compilationResult}
                  variant={compilationResult ? "default" : "secondary"}
                  className="group"
                  size="lg"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <FileCode className="mr-2 h-4 w-4" />
                      Deploy to Testnet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Status & Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Status Panel */}
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg">
              <h2 className="text-xl font-bold mb-6 text-primary">Contract Status</h2>
              
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border/30 pb-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground/80 mb-1">Compilation</h3>
                    <p className="text-sm text-foreground/60">
                      {!compilationResult && !isCompiling && 'Not compiled yet'}
                      {isCompiling && 'Processing your contract...'}
                      {compilationResult && !isCompiling && 'Compilation successful'}
                    </p>
                  </div>
                  {compilationResult && !isCompiling && (
                    <div className="bg-green-500/20 p-2 rounded-full">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  {isCompiling && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                </div>
                
                {/* Security Analysis Display */}
                {warnings.length > 0 && (
                  <motion.div 
                    className="border-b border-border/30 pb-4 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground/80 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        Security Warnings
                      </h3>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400">
                        {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
                      </Badge>
                    </div>
                    <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-y-auto max-h-48">
                      <ul className="divide-y divide-amber-200 dark:divide-amber-800/50">
                        {warnings.map((warning, index) => {
                          const info = getWarningInfo(warning);
                          return (
                            <li key={index} className="p-3">
                              <div className="flex items-start mb-1">
                                <div className={`flex-shrink-0 rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-2 ${
                                  info.severity === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                  info.severity === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  <AlertTriangle className="h-3 w-3" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground/80">{warning}</p>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <p>{info.description}</p>
                                    <p className="mt-1"><span className="font-medium">Suggested fix:</span> {info.fix}</p>
                                  </div>
                                </div>
                                <Badge className={`ml-2 ${
                                  info.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50' :
                                  info.severity === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' :
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50'
                                }`}>
                                  {info.severity}
                                </Badge>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </motion.div>
                )}
                
                {/* Only show security score after compilation */}
                {compilationResult && (
                  <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-4">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-foreground/80">Security Score</h3>
                        <div className={`px-2 py-1 rounded text-sm font-medium ${
                          securityScore >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          securityScore >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {securityScore}%
                        </div>
                      </div>
                      <Progress 
                        value={securityScore} 
                        className={`h-2 ${
                          securityScore >= 80 ? 'bg-green-100 dark:bg-green-900/30' :
                          securityScore >= 60 ? 'bg-amber-100 dark:bg-amber-900/30' :
                          'bg-red-100 dark:bg-red-900/30'
                        }`}
                        indicatorClassName={`${
                          securityScore >= 80 ? 'bg-green-500 dark:bg-green-600' :
                          securityScore >= 60 ? 'bg-amber-500 dark:bg-amber-600' :
                          'bg-red-500 dark:bg-red-600'
                        }`}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {securityScore >= 90 ? 'Excellent! Your contract has passed security checks.' :
                          securityScore >= 80 ? 'Good security practices. Review warnings to improve further.' :
                          securityScore >= 60 ? 'Moderate risk detected. Address warnings before deployment.' :
                          'High risk detected! Fix security issues before deploying.'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between border-b border-border/30 pb-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground/80 mb-1">Deployment</h3>
                    <p className="text-sm text-foreground/60">
                      {!contractAddress && !isDeploying && !pendingDeployment && 'Waiting for deployment'}
                      {isDeploying && !isLargeContractDeployment && 'Deploying to Hedera Testnet...'}
                      {isDeploying && isLargeContractDeployment && deploymentStage}
                      {contractAddress && !isDeploying && 'Contract deployed successfully'}
                      {!isDeploying && pendingDeployment && pendingDeployment.stage}
                    </p>
                    
                    {/* Show retry button for failed deployments */}
                    {!isDeploying && pendingDeployment && (
                      <div className="mt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDeploymentStage('Retrying failed deployment...');
                            setDeploymentProgress(pendingDeployment.progress || 0);
                            setIsDeploying(true);
                            setError('');
                            
                            // Start the deployment process again with the existing fileId
                            setTimeout(() => {
                              console.log('Retrying deployment with fileId:', pendingDeployment.fileId);
                              
                              // Create a unique deployment ID for this session
                              const retryDeploymentId = `deploy-retry-${Date.now()}`;
                              console.log(`Starting retry deployment with ID: ${retryDeploymentId}`);
                              
                              // Create a flag to track if we've completed (to avoid duplicate state updates)
                              let isRetryCompleted = false;
                              let resumeAttempts = 0;
                              
                              // Start with a resume operation
                              handleDeploy(true, pendingDeployment.fileId, retryDeploymentId);
                            }, 500);
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" />
                          Retry Deployment
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          The previous deployment attempt was interrupted. Click above to resume.
                        </p>
                      </div>
                    )}
                    
                    {deploymentStage === 'Auto-resuming' && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 mb-4">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Large Contract Deployment</AlertTitle>
                        <AlertDescription className="text-sm">
                          This large contract deployment is being automatically resumed due to Vercel's timeout limits. The system will continue the deployment process without interruption.
                        </AlertDescription>
                      </Alert>
                    )}

                    {deploymentStage && deploymentStage.includes('Uploading bytecode') && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 mb-4">
                        <FileUpIcon className="h-4 w-4" />
                        <AlertTitle>Uploading Contract Bytecode</AlertTitle>
                        <AlertDescription className="text-sm">
                          Bytecode is being uploaded in chunks. This process may require multiple steps for very large contracts. Progress: {deploymentStage.match(/\((\d+)%\)/)?.[1] || '0'}%
                        </AlertDescription>
                      </Alert>
                    )}

                    {deploymentStage && deploymentStage.includes('empty') && (
                      <Alert className="bg-amber-50 dark:bg-amber-950 mb-4">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <AlertTitle>File Upload Issue Detected</AlertTitle>
                        <AlertDescription className="text-sm">
                          There may be an issue with the contract file. The system will try to upload the bytecode directly instead.
                        </AlertDescription>
                      </Alert>
                    )}

                    {deploymentStage && deploymentStage.includes('direct bytecode') && (
                      <Alert className="bg-purple-50 dark:bg-purple-950 mb-4">
                        <Code2Icon className="h-4 w-4" />
                        <AlertTitle>Direct Bytecode Deployment</AlertTitle>
                        <AlertDescription className="text-sm">
                          The system is deploying your contract directly with bytecode instead of using the file method. This is an automatic fallback to ensure your contract deploys successfully.
                        </AlertDescription>
                      </Alert>
                    )}

                    {deploymentStage && (
                      <Alert className="bg-blue-50 dark:bg-blue-950 mb-4">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>Deployment Status</AlertTitle>
                        <AlertDescription className="text-sm">
                          {deploymentStage}
                        </AlertDescription>
                      </Alert>
                    )}

                    {deploymentStage && deploymentStage.includes('large contract') && (
                      <Alert className="bg-purple-50 dark:bg-purple-950 mb-4">
                        <Code2Icon className="h-4 w-4" />
                        <AlertTitle>Optimized Direct Deployment</AlertTitle>
                        <AlertDescription className="text-sm">
                          Your contract exceeds 32KB and is being deployed using our optimized direct deployment method. This ensures reliable deployment on Vercel without timeouts.
                        </AlertDescription>
                      </Alert>
                    )}

                    {isDeploying && isLargeContractDeployment && (
                      <div className="mt-2 mb-4">
                        <Progress value={deploymentProgress} className="h-2" />
                        <p className="text-xs text-right mt-1 text-foreground/60">{deploymentProgress}%</p>
                      </div>
                    )}
                  </div>
                  {contractAddress && !isDeploying && (
                    <div className="bg-green-500/20 p-2 rounded-full">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  {isDeploying && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                </div>
                
                {contractAddress && (
                  <motion.div 
                    className="pt-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-sm font-medium text-foreground/80 mb-2">Contract Address</h3>
                    <div className="p-3 bg-background/80 rounded-lg font-mono text-sm break-all mb-4 border border-primary/20 relative group">
                      {contractAddress}
                      <button
                        onClick={handleCopyContract}
                        className="absolute right-2 top-2 p-1 rounded-md bg-background/50 text-foreground/60 hover:text-foreground hover:bg-background transition-colors"
                        aria-label="Copy contract address"
                      >
                        {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={handleInteract}
                        className="w-full group"
                        size="lg"
                      >
                        <Code className="mr-2 h-4 w-4" />
                        Interact with Contract
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://hashscan.io/testnet/contract/${contractAddress}`, '_blank')}
                        className="w-full group"
                      >
                        View on HashScan
                        <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            
            {/* Tips Panel */}
            <motion.div 
              className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                <span>Tips</span>
              </h2>
              <div className="space-y-3">
                {[
                  "Use Solidity version 0.8.0 or later for best compatibility",
                  "Deployment is free and uses Hedera Testnet",
                  "Contracts are automatically analyzed for security issues",
                  "Large contracts are automatically handled with specialized deployment",
                  "All interactions are stateless and work without a wallet",
                ].map((tip, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-start p-3 rounded-lg hover:bg-background/80 transition-colors"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + (i * 0.1) }}
                  >
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-primary text-xs font-bold">{i+1}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateContractPage; 