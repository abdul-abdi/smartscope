'use client';

import * as React from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle, Code, Copy, ExternalLink, FileCode, Loader2, Shield, ChevronDown, ChevronUp, AlertOctagon, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Card, CardContent } from '../../components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

interface ActionButtonsProps {
  handleValidate: () => Promise<void>;
  handleCompile: () => Promise<void>;
  handleDeploy: () => Promise<void>;
  handleInteract: () => void;
  isValidating: boolean;
  isCompiling: boolean;
  isDeploying: boolean;
  contractCode: string;
  customContractCode: string;
  activeTab: string;
  compilationResult: any;
  contractAddress: string;
  deploymentProgress: number;
  deploymentStage: string;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  handleValidate,
  handleCompile,
  handleDeploy,
  handleInteract,
  isValidating,
  isCompiling,
  isDeploying,
  contractCode,
  customContractCode,
  activeTab,
  compilationResult,
  contractAddress,
  deploymentProgress,
  deploymentStage,
  copied,
  setCopied
}) => {
  const router = useRouter();
  
  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const goToContractPage = () => {
    if (contractAddress) {
      router.push(`/interact/${contractAddress}`);
    }
  };

  return (
    <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg max-w-full overflow-hidden">
      <h2 className="text-xl font-bold mb-6 text-primary">Actions</h2>
      <div className="flex flex-col gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleValidate}
                disabled={!(activeTab === 'sample' ? contractCode.trim() : customContractCode.trim())}
                variant="outline"
                className="w-full justify-between group bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/30"
                size="lg"
              >
                <div className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  {isValidating ? 'Validating...' : 'Validate Contract'}
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Check your contract for errors and security issues before compilation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleCompile}
                disabled={isCompiling || !(activeTab === 'sample' ? contractCode.trim() : customContractCode.trim())}
                className="w-full justify-between group"
                size="lg"
              >
                <div className="flex items-center">
                  {isCompiling ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Code className="mr-2 h-5 w-5" />
                  )}
                  {isCompiling ? 'Compiling...' : 'Compile Contract'}
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Compile your Solidity code to bytecode and ABI</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleDeploy}
                disabled={isDeploying || !compilationResult}
                variant={compilationResult ? "default" : "secondary"}
                className="w-full justify-between group"
                size="lg"
              >
                <div className="flex items-center">
                  {isDeploying ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <FileCode className="mr-2 h-5 w-5" />
                  )}
                  {isDeploying ? 'Deploying...' : 'Deploy to Testnet'}
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Deploy your compiled contract to the Hedera Testnet</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Deployment Status Card - Only shows when actively deploying or deployed */}
      {(isDeploying || contractAddress) && (
        <div className="mt-6 border border-border/30 rounded-lg p-4 bg-background/70">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                Deployment Status
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Deployment Complete
              </>
            )}
          </h3>
          
          {isDeploying && !contractAddress && (
            <div className="space-y-2">
              <Progress 
                value={deploymentProgress} 
                className="h-2"
                indicatorClassName="bg-primary"
              />
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{deploymentStage || 'Preparing deployment...'}</span>
                <span className="text-xs font-medium">{deploymentProgress}%</span>
              </div>
            </div>
          )}
          
          {contractAddress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-background rounded border border-border/50 text-sm">
                <code className="text-xs break-all overflow-x-auto max-w-[180px] sm:max-w-[240px] scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pr-2">{contractAddress}</code>
                <button 
                  onClick={handleCopyContract}
                  className="ml-2 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-background/50 flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-between gap-2">
                <Button size="sm" variant="outline" onClick={goToContractPage} className="flex-1">
                  <ArrowRight className="mr-1 h-3 w-3" />
                  Interact
                </Button>
                <Link 
                  href={`https://hashscan.io/testnet/contract/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button size="sm" variant="secondary" className="w-full">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View on Hashscan
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StatusPanelProps {
  isValidating: boolean;
  isCompiling: boolean;
  isDeploying: boolean;
  validationResults: any;
  validationErrors: string[];
  validationWarnings: string[];
  securityScore: number;
  compilationResult: any;
  contractAddress: string;
  error: string;
  explainCompilerError: (error: string) => string;
  getContractDetails: () => React.ReactNode | null;
  getWarningInfo: (warning: string) => { description: string, severity: 'high' | 'medium' | 'low', fix: string };
  warnings: string[];
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  isValidating,
  isCompiling,
  isDeploying,
  validationResults,
  validationErrors,
  validationWarnings,
  securityScore,
  compilationResult,
  contractAddress,
  error,
  explainCompilerError,
  getContractDetails,
  getWarningInfo,
  warnings
}) => {
  const commonSecurityIssues = [
    { name: "Reentrancy", description: "A vulnerability where external calls can call back into the contract before the first invocation is complete", impact: "high", avoided: securityScore > 75 },
    { name: "Integer Overflow/Underflow", description: "Arithmetic operations exceeding the data type's range", impact: "high", avoided: true },
    { name: "Unchecked External Calls", description: "Failing to check return values of low-level calls", impact: "medium", avoided: securityScore > 60 },
    { name: "tx.origin Authentication", description: "Using tx.origin for authentication is vulnerable to phishing attacks", impact: "high", avoided: !validationWarnings.some(w => w.includes("tx.origin")) },
    { name: "Block Timestamp Manipulation", description: "Using block.timestamp for critical logic can be manipulated by miners", impact: "medium", avoided: !validationWarnings.some(w => w.includes("block.timestamp")) },
    { name: "Insecure Randomness", description: "Using on-chain data for randomness is predictable", impact: "medium", avoided: securityScore > 80 }
  ];

  return (
    <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg max-w-full overflow-hidden">
      <h2 className="text-xl font-bold mb-6 text-primary">Contract Status</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="break-words">{explainCompilerError(error)}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-6">
        {/* Validation Status */}
        <div className="border-b border-border/30 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground/80">Validation</h3>
            {validationResults && !isValidating && validationErrors.length === 0 && (
              <div className="bg-green-500/20 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            )}
            {validationResults && !isValidating && validationErrors.length > 0 && (
              <div className="bg-red-500/20 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
            {isValidating && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
          </div>
          
          <p className="text-sm text-foreground/60 mb-2">
            {isValidating && 'Validating your contract...'}
            {!isValidating && validationResults && 'Contract validated'}
            {!isValidating && !validationResults && 'Not validated yet'}
          </p>
          
          {validationResults && !isValidating && (
            <div className="mt-2 space-y-2">
              {/* Errors Section with Accordion */}
              <Accordion type="single" collapsible>
                <AccordionItem value="validation-errors" className={validationErrors.length > 0 ? "" : "pointer-events-none"}>
                  <AccordionTrigger className={`flex items-center justify-between p-2 rounded-md ${
                    validationErrors.length > 0 
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30' 
                      : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  }`}>
                    <div className="flex items-center">
                      {validationErrors.length > 0 ? (
                        <AlertOctagon className="h-4 w-4 mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      <span className="text-sm font-medium">Errors: {validationErrors.length}</span>
                    </div>
                  </AccordionTrigger>
                  
                  {validationErrors.length > 0 && (
                    <AccordionContent>
                      <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-md mt-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-red-200 dark:scrollbar-thumb-red-800 scrollbar-track-transparent">
                        <ul className="space-y-1">
                          {validationErrors.map((error, idx) => (
                            <li key={idx} className="text-xs text-red-700 dark:text-red-400 flex items-start">
                              <span className="inline-block w-4 h-4 mr-1 flex-shrink-0">•</span> 
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  )}
                </AccordionItem>
              </Accordion>
              
              {/* Warnings Section with Accordion */}
              <Accordion type="single" collapsible>
                <AccordionItem value="validation-warnings" className={validationWarnings.length > 0 ? "" : "pointer-events-none"}>
                  <AccordionTrigger className={`flex items-center justify-between p-2 rounded-md ${
                    validationWarnings.length > 0 
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/30' 
                      : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  }`}>
                    <div className="flex items-center">
                      {validationWarnings.length > 0 ? (
                        <AlertTriangle className="h-4 w-4 mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      <span className="text-sm font-medium">Warnings: {validationWarnings.length}</span>
                    </div>
                  </AccordionTrigger>
                  
                  {validationWarnings.length > 0 && (
                    <AccordionContent>
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded-md mt-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-200 dark:scrollbar-thumb-amber-800 scrollbar-track-transparent">
                        <ul className="space-y-1">
                          {validationWarnings.map((warning, idx) => {
                            const warningInfo = getWarningInfo(warning);
                            return (
                              <li key={idx} className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                                <div className="flex items-start">
                                  <span className="inline-block w-4 h-4 mr-1 flex-shrink-0">•</span>
                                  <div>
                                    <p className="font-medium">{warning}</p>
                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">{warningInfo.description}</p>
                                    <div className="mt-1 flex items-center">
                                      <Badge variant="outline" className={`
                                        ${warningInfo.severity === 'high' ? 'border-red-500 text-red-500' : 
                                          warningInfo.severity === 'medium' ? 'border-amber-500 text-amber-500' : 
                                          'border-yellow-500 text-yellow-500'}
                                      `}>
                                        {warningInfo.severity} risk
                                      </Badge>
                                      <p className="ml-2 text-xs italic">Fix: {warningInfo.fix}</p>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </AccordionContent>
                  )}
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>

        {/* Compilation Status */}
        <div className="border-b border-border/30 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground/80">Compilation</h3>
            {compilationResult && !isCompiling && (
              <div className="bg-green-500/20 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            )}
            {isCompiling && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
          </div>
          
          <p className="text-sm text-foreground/60 mb-2">
            {!compilationResult && !isCompiling && 'Not compiled yet'}
            {isCompiling && 'Processing your contract...'}
            {compilationResult && !isCompiling && 'Compilation successful'}
          </p>
          
          {/* Compiler details when available */}
          {compilationResult && !isCompiling && getContractDetails()}
          
          {/* Compiler warnings */}
          {compilationResult && warnings && warnings.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="flex w-full items-center justify-between bg-amber-50 dark:bg-amber-900/20 p-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>Compiler Warnings ({warnings.length})</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </AccordionTrigger>
                <AccordionContent className="p-2 bg-amber-50/50 dark:bg-amber-900/10 max-h-40 overflow-y-auto scrollbar-thin">
                  <ul className="space-y-1">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="inline-block w-4 h-4 mr-1">•</span> {warning}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
        
        {/* Security Score */}
        {validationResults && (
          <div className="border-b border-border/30 pb-4 mb-4">
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
            
            {/* Security issues details */}
            <div className="mt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="security-issues">
                  <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
                    <span className="flex items-center">
                      <Shield className="h-4 w-4 mr-1" />
                      Common Security Issues
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin p-1">
                      {commonSecurityIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-background/70 border border-border/30 text-xs">
                          <div>
                            <span className="font-medium">{issue.name}</span>
                            <p className="text-muted-foreground mt-0.5">{issue.description}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            issue.avoided 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {issue.avoided ? 'Avoided' : 'Detected'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TipsPanel: React.FC = () => {
  return (
    <motion.div 
      className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-lg max-w-full overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-primary" />
        <span>Tips</span>
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {[
          "Use Solidity version 0.8.0 or later for built-in overflow checks",
          "Avoid using tx.origin for authentication - use msg.sender instead",
          "Always check return values from external calls",
          "Follow the checks-effects-interactions pattern to prevent reentrancy",
          "Use specific visibility modifiers for all functions and state variables",
          "Limit gas consumption in loops to prevent DOS attacks",
          "Consider using OpenZeppelin's battle-tested contracts",
          "Add comprehensive test coverage before deployment",
          "Document your code with NatSpec comments",
          "Use SafeMath for versions prior to Solidity 0.8.0"
        ].map((tip, i) => (
          <motion.div 
            key={i}
            className="flex items-start p-3 rounded-lg hover:bg-background/80 transition-colors"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.7 + (i * 0.1) }}
          >
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
              <span className="text-primary text-xs font-bold">{i+1}</span>
            </div>
            <p className="text-sm text-foreground/80">{tip}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 