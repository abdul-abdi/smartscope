'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Progress } from '../../components/ui/progress';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertCircle, Check, Code, Loader2, ArrowRight, FileCode, Shield, Copy, ExternalLink, Clipboard, CheckCircle, Info, AlertTriangle, InfoIcon, FileUpIcon, AlertTriangleIcon, Code2Icon, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { compileContract, deployContract } from '../utils/api';
import { sampleContracts, getDefaultSampleContract } from '../data/sample-contracts';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import SolidityEditor from './SolidityEditor';
import { ActionButtons, StatusPanel, TipsPanel, IDEDetailsPanel } from './ButtonActions';
import MultiFileIDE, { MultiFileIDEHandle } from './MultiFileIDE';
import { FileSystemProvider } from '../../components/providers/file-system-provider';
import { ToastProvider, useToast } from '../../components/providers/toast-provider';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

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

// Utility function to parse constructor inputs from ABI
function parseConstructorInputs(abi: any[]) {
  const constructor = abi.find(item => item.type === 'constructor');
  return constructor ? constructor.inputs || [] : [];
}

// Component to render constructor argument form
function ConstructorForm({ inputs, onChange }: { 
  inputs: { name: string; type: string; }[]; 
  onChange: (values: Record<string, any>) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleInputChange = (name: string, value: string) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    onChange(newValues);
  };

  // Format input values based on their type for submission
  const formatValue = (type: string, value: string) => {
    try {
      if (type.includes('int')) {
        // For integer types
        return BigInt(value).toString();
      } else if (type === 'bool') {
        // For boolean types
        return value.toLowerCase() === 'true';
      } else if (type.includes('[]')) {
        // For array types
        return JSON.parse(value);
      } else {
        // For string, address, bytes, etc.
        return value;
      }
    } catch (error) {
      console.error(`Error formatting ${type} value:`, error);
      return value;
    }
  };

  return (
    <div className="space-y-4 my-4">
      {inputs.map((input) => (
        <div key={input.name} className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={input.name} className="text-right">
            {input.name} <span className="text-xs text-muted-foreground">({input.type})</span>
          </Label>
          <div className="col-span-3">
            <Input
              id={input.name}
              placeholder={`Enter ${input.type} value`}
              onChange={(e) => handleInputChange(input.name, e.target.value)}
              className="w-full"
            />
            {input.type.includes('[]') && (
              <p className="text-xs text-muted-foreground mt-1">
                Enter array as JSON, e.g. [1,2,3] or ["a","b"]
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Add a new DeploymentProgress component for complex contracts
function DeploymentProgress({ stage, progress, error }: { 
  stage: string; 
  progress: number;
  error?: string;
}) {
  // Define the deployment stages
  const stages = [
    { id: 'prepare', label: 'Preparing Contract' },
    { id: 'link', label: 'Linking Libraries' },
    { id: 'compile', label: 'Final Compilation' },
    { id: 'deploy', label: 'Deploying to Hedera' },
    { id: 'confirm', label: 'Confirming Transaction' },
    { id: 'complete', label: 'Deployment Complete' }
  ];
  
  // Find the current stage index
  const currentStageIndex = stages.findIndex(s => s.id === stage);
  
  return (
    <div className="my-4">
      <div className="flex justify-between mb-2">
        <div className="text-sm font-medium">Deployment Progress</div>
        <div className="text-sm">{progress}%</div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Deployment stages */}
      <div className="space-y-2">
        {stages.map((s, index) => (
          <div 
            key={s.id} 
            className={`flex items-center ${
              index < currentStageIndex ? 'text-green-600' : 
              index === currentStageIndex ? 'text-blue-600 font-medium' : 
              'text-gray-400'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-xs ${
              index < currentStageIndex ? 'bg-green-100 text-green-600' : 
              index === currentStageIndex ? 'bg-blue-100 text-blue-600' : 
              'bg-gray-100 text-gray-400'
            }`}>
              {index < currentStageIndex ? '✓' : index + 1}
            </div>
            <div>{s.label}</div>
          </div>
        ))}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

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
  const [deploymentStage, setDeploymentStage] = useState<string>('prepare');
  const [isLargeContractDeployment, setIsLargeContractDeployment] = useState<boolean>(false);
  const [deploymentSuccess, setDeploymentSuccess] = useState<boolean>(false);
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
  const [ideMode, setIdeMode] = useState<'simple' | 'advanced'>('simple');
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [constructorArgs, setConstructorArgs] = useState<Record<string, any>>({});
  
  // Add theme detection right after useState declarations
  const { theme, resolvedTheme } = useTheme();
  
  // Add ref for MultiFileIDE
  const multiFileIDERef = React.useRef<MultiFileIDEHandle>(null);
  const { toast } = useToast();

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

  // Modify handleValidate to use the ref when in advanced mode
  const handleValidate = async () => {
    // If already validating, don't start another validation
    if (isValidating) return;
    
    setIsValidating(true);
    setError('');
    
    try {
      if (ideMode === 'advanced' && multiFileIDERef.current) {
        // Use the advanced IDE validate function
        await multiFileIDERef.current.validateCurrentFile();
      } else {
        // Use the simple editor validate function
        const results = await validateContractCode(contractCode);
        
        // Update validation results state
        setValidationResults(results);
        
        // Update UI states
        setValidationErrors(results.errors);
        setValidationWarnings(results.warnings);
        setSecurityScore(results.securityScore);
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate contract");
    } finally {
      setIsValidating(false);
    }
  };

  // Modify handleCompile to use the ref when in advanced mode
  const handleCompile = async () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setError('');
    
    try {
      if (ideMode === 'advanced' && multiFileIDERef.current) {
        // Get the compilation result for the current file
        const result = await multiFileIDERef.current.compileCurrentFile();
        
        if (result) {
          setCompilationResult(result);
          
          // Update the contract name from the result
          if (result.contractName) {
            setContractName(result.contractName);
          } else {
            // Get from the selected contract
            const selectedContract = multiFileIDERef.current.getSelectedContract();
            if (selectedContract) {
              setContractName(selectedContract.name);
            }
          }
          
          // Notify user
          toast({
            title: 'Compilation Successful',
            description: `${result.contractName || 'Contract'} compiled successfully`,
            type: 'success'
          });
        } else {
          // If no result, but no error was set, it might be a user cancellation
        setIsCompiling(false);
      return;
    }
      } else {
        // Simple editor compilation
        const result = await compileContract(contractCode);
        setCompilationResult(result);
        
        if (result.contractName) {
          setContractName(result.contractName);
        }
        
        toast({
          title: 'Compilation Successful',
          description: `${result.contractName || 'Contract'} compiled successfully`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error("Compilation error:", err);
      setError(err.message || "Failed to compile contract");
      
      toast({
        title: 'Compilation Failed',
        description: err.message || 'Unknown error occurred during compilation',
        type: 'error'
      });
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

  // Modify handleDeploy to use the multi-file IDE reference
  const handleDeploy = async () => {
    if (isDeploying) return;
    
    // Reset all deployment-related states
    setDeploymentSuccess(false);
    setContractAddress('');
    setDeploymentProgress(0);
    setDeploymentStage('');
    setError('');
    
    // If we don't have a compile result yet, compile first
    if (!compilationResult) {
      await handleCompile();
      
      // Check if compilation succeeded
      if (!compilationResult) {
        toast({
          title: 'Compilation Required',
          description: 'Please compile your contract before deploying',
          type: 'error'
        });
      return;
      }
    }
    
    // Check if contract has constructor parameters
    const constructorInputs = parseConstructorInputs(compilationResult.abi);
    
    if (constructorInputs.length > 0) {
      // Open the dialog for constructor arguments
      setIsDeployDialogOpen(true);
      return;
    }
    
    // If no constructor arguments, proceed with deployment
    await executeDeployment([]);
  };

  const executeDeployment = async (constructorArguments: any[]) => {
    setIsDeploying(true);
    setError('');
    setDeploymentProgress(10);
    setDeploymentStage('prepare');
    
    try {
      let target = compilationResult;
      console.log('Starting deployment process...');
      
      // Set the type of deployment based on bytecode size
      const isLarge = target.bytecode && target.bytecode.length > 10000;
      setIsLargeContractDeployment(isLarge);
      
      // Real deployment process
        setDeploymentProgress(30);
      setDeploymentStage('link');
      console.log('Deployment stage: link');
      
      // Move to compilation check stage
      setDeploymentProgress(50);
      setDeploymentStage('compile');
      console.log('Deployment stage: compile');
      
      // Start actual deployment
      setDeploymentProgress(70);
      setDeploymentStage('deploy');
      console.log('Deployment stage: deploy');
      
      // Call actual deployment endpoint
      const result = await deployContract(target.bytecode, target.abi, constructorArguments);
      console.log('Deployment result:', result);
      
      // Deployment confirmed
      setDeploymentProgress(90);
      setDeploymentStage('confirm');
      console.log('Deployment stage: confirm');
      
      // Deployment complete
          setDeploymentProgress(100);
      setDeploymentStage('complete');
      
      // Set the contract address and deployment success
      if (result.contractAddress) {
        setContractAddress(result.contractAddress);
        setDeploymentSuccess(true);
        console.log('Deployment complete. Contract address:', result.contractAddress);

        // Show success notification
        toast({
          title: 'Deployment Successful',
          description: `Contract deployed at ${result.contractAddress}`,
          type: 'success'
        });
            } else {
        throw new Error('No contract address received from deployment');
      }

      // If in advanced mode, notify the IDE component
      if (ideMode === 'advanced' && multiFileIDERef.current) {
        multiFileIDERef.current.handleDeploymentSuccess(result.contractAddress);
      }
    } catch (err) {
      console.error("Deployment error:", err);
      setError(err.message || "Failed to deploy contract");
      setDeploymentProgress(0);
      setDeploymentStage('');
      setDeploymentSuccess(false);
      setContractAddress('');
      
      toast({
        title: 'Deployment Failed',
        description: err.message || 'Unknown error occurred during deployment',
        type: 'error'
      });
    } finally {
      setIsDeploying(false);
    }
  };
  
  const handleDeployWithArgs = () => {
    // Format constructor arguments according to their types
    const constructorInputs = parseConstructorInputs(compilationResult.abi);
    const formattedArgs = constructorInputs.map(input => {
      const value = constructorArgs[input.name];
      
      // Attempt to format the value based on type
      try {
        if (input.type.includes('int')) {
          // Handle integer types
          return value ? BigInt(value).toString() : '0';
        } else if (input.type === 'bool') {
          // Handle boolean
          return value === 'true' || value === true;
        } else if (input.type.includes('[]')) {
          // Handle arrays
          return value ? JSON.parse(value) : [];
    } else {
          // Handle string, address, bytes
          return value || '';
        }
      } catch (error) {
        console.error(`Error formatting constructor arg ${input.name}:`, error);
        return value || '';
      }
    });
    
    // Close the dialog before starting deployment
    setIsDeployDialogOpen(false);
    
    // Execute deployment with formatted args
    executeDeployment(formattedArgs);
  };

  const handleInteract = () => {
    if (contractAddress) {
      // Navigate to the interact page with the contract address
      router.push(`/interact/${contractAddress}`);
    }
  };

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateContractCode = async (code: string): Promise<{ errors: string[], warnings: string[], securityScore: number }> => {
    // Real validation implementation
    const errors = [];
    const warnings = [];
    let securityScore = 100;
    
    // Basic validation checks
    if (!code.includes('pragma solidity')) {
      errors.push('Missing solidity pragma statement');
      securityScore -= 10;
    }
    
    // Check for deprecated or vulnerable patterns
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
    
    // Check for reentrancy vulnerabilities
    if (code.includes('.call{value:')) {
      warnings.push('Potential reentrancy vulnerability detected at low-level call with value');
      securityScore -= 25;
    }
    
    // Check for unbounded loops
    if (code.match(/for\s*\([^;]*;\s*[^;]*;\s*[^)]*\)/)) {
      const forLoops = code.match(/for\s*\([^;]*;\s*[^;]*;\s*[^)]*\)/g) || [];
      for (const loop of forLoops) {
        if (!loop.includes('length') && !loop.includes('< 10') && !loop.includes('< 20') && !loop.includes('< 50')) {
          warnings.push('Potentially unbounded loop detected which could lead to gas limit issues');
          securityScore -= 10;
          break;
        }
      }
    }
    
    // Check for proper error handling
    if (code.includes('require(') && !code.includes('revert') && !code.includes('custom error')) {
      warnings.push('Consider using custom errors instead of require statements for gas efficiency');
      securityScore -= 5;
    }
    
    // Check for missing visibility specifiers
    const functionMatches = code.match(/function\s+[a-zA-Z0-9_]+\s*\(/g) || [];
    for (const funcDef of functionMatches) {
      if (!funcDef.includes(' public ') && !funcDef.includes(' private ') && 
          !funcDef.includes(' internal ') && !funcDef.includes(' external ')) {
        warnings.push('Function missing explicit visibility specifier');
        securityScore -= 5;
        break;
      }
    }
    
      return {
      errors,
      warnings,
      securityScore: Math.max(0, securityScore)
    };
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

  // Add handlers for the MultiFileIDE component
  const handleMultiFileCompile = useCallback((result: any, fileId: string) => {
    setCompilationResult(result);
    
    // Extract warnings and security score
    if (result.warnings && Array.isArray(result.warnings)) {
      setWarnings(result.warnings);
    }
    
    if (result.securityScore !== undefined) {
      setSecurityScore(result.securityScore);
    }
    
    // Set contract name if available
    if (multiFileIDERef.current) {
      const selectedContract = multiFileIDERef.current.getSelectedContract();
      if (selectedContract) {
        setContractName(selectedContract.name);
      }
    }
  }, []);

  const handleMultiFileValidate = useCallback((result: any, fileId: string) => {
    setValidationResults(result);
    setValidationWarnings(result.warnings || []);
    setValidationErrors(result.errors || []);
    setSecurityScore(result.securityScore || 100);
  }, []);

  const handleMultiFileEditorChange = useCallback((content: string, fileId: string) => {
    // Update the contractCode state to keep the action buttons working
    setContractCode(content);
    
    // If we're in custom tab, also update the customContractCode
    if (activeTab === 'custom') {
      setCustomContractCode(content);
    }
  }, [activeTab]);

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

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 mb-4">
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
              className="text-lg text-foreground/80 mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Build, compile and deploy Solidity smart contracts to Ethereum testnet in minutes — with real-time validation, security analysis, and multi-file project support.
            </motion.p>
            
          <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center"
          >
              <Button
                variant={ideMode === 'advanced' ? "secondary" : "default"}
                size="lg"
                className="gap-2"
                onClick={() => setIdeMode(ideMode === 'simple' ? 'advanced' : 'simple')}
              >
                {ideMode === 'simple' ? (
                  <>
                    <Code2Icon className="h-5 w-5" />
                    Switch to Advanced IDE
                  </>
                ) : (
                  <>
                    <FileCode className="h-5 w-5" />
                    Switch to Simple Editor
                  </>
                )}
              </Button>
          </motion.div>
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
            className="lg:flex-1 w-full"
          >
            {ideMode === 'simple' ? (
              /* Original Simple Editor */
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
                <div className="relative mt-6">
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
                    <div className="w-full h-full" style={{ 
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
            ) : (
              /* Advanced Multi-File IDE - Fixed height to match simple mode */
              <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-border/50 shadow-lg">
                <h2 className="text-xl font-bold mb-6 text-primary">Multi-File IDE</h2>
                <div className="h-[700px] w-full">
                  <ToastProvider>
                    <FileSystemProvider>
                      <MultiFileIDE
                        ref={multiFileIDERef}
                        onCompile={handleMultiFileCompile}
                        onValidate={handleMultiFileValidate}
                        onEditorChange={handleMultiFileEditorChange}
                        onDeploy={handleDeploy}
                      />
                    </FileSystemProvider>
                  </ToastProvider>
                </div>
              </div>
            )}

            {/* IDE Details Panel - Now positioned below the editor */}
            <IDEDetailsPanel mode={ideMode} />
          </motion.div>

          {/* Right Side - Status & Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:w-96"
          >
            {/* Action Buttons Panel */}
            <div className="col-span-12 md:col-span-4 h-full max-h-full">
              {ideMode === 'simple' && (
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
              )}
              
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
                deploymentProgress={deploymentProgress}
                deploymentStage={deploymentStage}
                deploymentSuccess={deploymentSuccess}
              />

              {/* Tips Panel - Now shown for both modes */}
              <TipsPanel />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Constructor Arguments Dialog */}
      <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Constructor Arguments</DialogTitle>
            <DialogDescription>
              This contract requires the following constructor arguments:
            </DialogDescription>
          </DialogHeader>
          
          <ConstructorForm 
            inputs={compilationResult ? parseConstructorInputs(compilationResult.abi) : []}
            onChange={setConstructorArgs}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeployDialogOpen(false)}>
              Cancel
                      </Button>
            <Button onClick={handleDeployWithArgs} disabled={isDeploying}>
              {isDeploying ? 'Deploying...' : 'Deploy Contract'}
                      </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateContractPage; 