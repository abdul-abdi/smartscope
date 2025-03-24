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
import { AlertCircle, Check, Code, Loader2, ArrowRight, FileCode, Shield, Copy, ExternalLink, Clipboard, CheckCircle, Info, AlertTriangle } from 'lucide-react';
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

  const handleCompile = async () => {
    if (!contractCode.trim()) {
      setError('Please enter contract code first');
      return;
    }

    setIsCompiling(true);
    setError('');
    
    try {
      const result = await compileContract(contractCode);
      setCompilationResult(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during compilation');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async () => {
    if (!compilationResult) {
      setError('Please compile the contract first');
      return;
    }

    setIsDeploying(true);
    setError('');
    setDeploymentProgress(0);
    setDeploymentStage('');
    
    try {
      // Check if the bytecode is large (over 2KB)
      const bytecodeSize = compilationResult.bytecode.length;
      const isLargeContract = bytecodeSize > 4096; // 2KB in hex is roughly 4096 characters
      setIsLargeContractDeployment(isLargeContract);
      
      console.log(`Contract size: ${bytecodeSize} characters, ${Math.ceil(bytecodeSize/2/1024)} KB`);
      
      if (isLargeContract) {
        console.log('Detected large contract, using specialized deployment process');
        setDeploymentStage('Preparing large contract deployment');
        setDeploymentProgress(10);
        
        // Create a unique deployment ID for this session
        const deploymentId = `deploy-${Date.now()}`;
        console.log(`Starting deployment with ID: ${deploymentId}`);
        
        // Create a flag to track if we've completed (to avoid duplicate state updates)
        let isDeploymentCompleted = false;
        
        // Setup event source for tracking progress
        const eventSource = new EventSource(`/api/handle-large-contracts/status?id=${deploymentId}`);
        
        // Listen for status updates
        eventSource.onmessage = (event) => {
          try {
            console.log('Raw event data:', event.data);
            const data = JSON.parse(event.data);
            console.log('Parsed deployment update:', data);
            
            // Update progress and stage
            if (data.progress !== undefined) {
              setDeploymentProgress(data.progress);
            }
            
            if (data.stage) {
              setDeploymentStage(data.stage);
            }
            
            // Check for completion status
            if (data.status === 'completed' && !isDeploymentCompleted) {
              isDeploymentCompleted = true;
              console.log('Deployment completed via SSE notification');
              
              // Set contract address if available
              if (data.contractAddress) {
                setContractAddress(data.contractAddress);
                console.log(`Contract deployed at: ${data.contractAddress}`);
              }
              
              // Update UI state
              setDeploymentProgress(100);
              setIsDeploying(false);
              
              // Close the event source
              eventSource.close();
            }
            
            // Check for error status
            if (data.status === 'error' && !isDeploymentCompleted) {
              isDeploymentCompleted = true;
              setError(data.error || 'An error occurred during deployment');
              setIsDeploying(false);
              eventSource.close();
            }
            
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        };
        
        // Handle event source errors
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          
          // Only handle error if we haven't already completed
          if (!isDeploymentCompleted) {
            isDeploymentCompleted = true;
            setError('Lost connection to deployment service');
            setIsDeploying(false);
            eventSource.close();
          }
        };
        
        // Start the actual deployment
        try {
          const response = await fetch('/api/handle-large-contracts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bytecode: compilationResult.bytecode,
              abi: compilationResult.abi,
              deploymentId: deploymentId
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            isDeploymentCompleted = true;
            eventSource.close();
            handleDeploymentError(data);
            return;
          }
          
          // If we get an immediate response with a contract address
          if (data.contractAddress && !isDeploymentCompleted) {
            console.log('Deployment completed via direct API response');
            isDeploymentCompleted = true;
            setContractAddress(data.contractAddress);
            setDeploymentProgress(100);
            setDeploymentStage('Contract deployed successfully');
            setIsDeploying(false);
            eventSource.close();
          }
        } catch (err) {
          console.error('API request error:', err);
          if (!isDeploymentCompleted) {
            isDeploymentCompleted = true;
            setError('Error calling deployment API');
            setIsDeploying(false);
            eventSource.close();
          }
        }
      } else {
        // Use the standard deploy endpoint for regular-sized contracts
        const response = await fetch('/api/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bytecode: compilationResult.bytecode, 
            abi: compilationResult.abi
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          handleDeploymentError(data);
          return;
        }
        
        setContractAddress(data.contractAddress);
        console.log(`Contract successfully deployed at address: ${data.contractAddress}`);
        setIsDeploying(false);
      }
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'An error occurred during deployment');
      setIsDeploying(false);
    }
  };
  
  // Helper function to handle deployment errors
  const handleDeploymentError = (data: any) => {
    // Handle specific error types
    if (data.errorCode === 'PAYER_ACCOUNT_NOT_FOUND') {
      setError(`Hedera account not found. Please check your account credentials in the .env.local file.`);
    } else if (data.errorType === 'CREDENTIAL_ERROR') {
      setError(`Credential error: ${data.error}`);
    } else {
      setError(data.error || 'An error occurred during deployment');
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
                  onClick={handleDeploy}
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
                {compilationResult?.warnings && compilationResult.warnings.length > 0 && (
                  <motion.div 
                    className="border-b border-border/30 pb-4 mb-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground/80 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-1 text-amber-500" />
                        Security Analysis
                      </h3>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400">
                        {compilationResult.warnings.length} {compilationResult.warnings.length === 1 ? 'warning' : 'warnings'}
                      </Badge>
                    </div>
                    <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 overflow-y-auto max-h-48">
                      <ul className="space-y-2 pl-1">
                        {compilationResult.warnings.map((warning, index) => (
                          <li key={index} className="text-sm flex items-start">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
                
                <div className="flex items-center justify-between border-b border-border/30 pb-4">
                  <div>
                    <h3 className="text-sm font-medium text-foreground/80 mb-1">Deployment</h3>
                    <p className="text-sm text-foreground/60">
                      {!contractAddress && !isDeploying && 'Waiting for deployment'}
                      {isDeploying && !isLargeContractDeployment && 'Deploying to Hedera Testnet...'}
                      {isDeploying && isLargeContractDeployment && deploymentStage}
                      {contractAddress && !isDeploying && 'Contract deployed successfully'}
                    </p>
                    {isDeploying && isLargeContractDeployment && (
                      <div className="mt-2">
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
                    <div className="p-3 bg-background/80 rounded-lg font-mono text-sm break-all mb-4 border border-primary/20">
                      {contractAddress}
                    </div>
                    <Button
                      onClick={handleInteract}
                      className="w-full group mb-2"
                    >
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