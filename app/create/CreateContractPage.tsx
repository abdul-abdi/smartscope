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
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [sampleContract, setSampleContract] = useState(getDefaultSampleContract());
  const searchParams = useSearchParams();
  
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

  // Fixed loadTemplateCode function wrapped in useCallback
  const loadTemplateCode = useCallback(async (templateId) => {
    try {
      // Fetch the template data from the templates page
      const response = await fetch(`/api/templates?id=${templateId}`);
      
      // If we don't have an API endpoint yet, we can use this fallback approach
      if (!response.ok) {
        // Define some common templates that match the ones in templates page
        const commonTemplates = {
          'erc20': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`,
          'erc721': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function mintNFT(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}`,
          'reentrancy-guard': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    mapping(address => uint256) private _balances;
    
    function deposit() external payable {
        _balances[msg.sender] += msg.value;
    }
    
    function withdraw() external nonReentrant {
        uint256 amount = _balances[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        _balances[msg.sender] = 0;
        
        // This external call is protected from reentrancy
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function getBalance() external view returns (uint256) {
        return _balances[msg.sender];
    }
}`,
          'pausable': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyPausable is Pausable, Ownable {
    constructor() Ownable(msg.sender) {}
    
    function deposit() public payable whenNotPaused {
        // Deposit logic here
    }
    
    function withdraw() public whenNotPaused {
        // Withdraw logic here
    }
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
}`
        };
        
        if (commonTemplates[templateId]) {
          // Set the custom contract code to the template
          setCustomContractCode(commonTemplates[templateId]);
          
          // Switch to the custom tab
          setActiveTab('custom');
          
          // Show a success toast or notification
          toast({
            title: "Template loaded",
            description: `The ${templateId} template has been loaded into the editor.`,
            type: "success"
          });
        }
      } else {
        // If we have an API, parse the response
        const templateData = await response.json();
        if (templateData && templateData.code) {
          setCustomContractCode(templateData.code);
          setActiveTab('custom');
          
          // Show a success toast or notification
          toast({
            title: "Template loaded",
            description: `The ${templateData.name} template has been loaded into the editor.`,
            type: "success"
          });
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: "Error loading template",
        description: "There was a problem loading the template. Please try again.",
        type: "error"
      });
    }
  }, [toast, setCustomContractCode, setActiveTab]); // Added dependencies

  // Fixed useEffect with proper dependency array
  useEffect(() => {
    // Check if we have a template parameter in the URL
    const templateId = searchParams.get('template');
    if (templateId) {
      // Load template code based on the ID
      loadTemplateCode(templateId);
    }
  }, [searchParams, loadTemplateCode]); // Added loadTemplateCode dependency

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

  // Implement other methods like validateContractCode, handleCompile, etc.
  // Keeping the rest of the implementation minimal for brevity

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

  // Linting function for Solidity code
  const lintSolidityCode = (code) => {
    if (!code) return [];
    
    const lintIssues = [];
    const lines = code.split('\n');
    
    // Check for lines that are too long
    lines.forEach((line, index) => {
      if (line.length > 120) {
        lintIssues.push({
          line: index + 1,
          message: 'Line exceeds 120 characters',
          severity: 'warning'
        });
      }
    });
    
    // Check for missing semicolons
    lines.forEach((line, index) => {
      if (line.trim() !== '' && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') && 
          !line.trim().endsWith('}') && 
          !line.trim().endsWith('/') && 
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('/*') &&
          !line.trim().startsWith('*') &&
          !line.trim().endsWith('*/') &&
          !line.trim().startsWith('import') &&
          !line.trim().startsWith('pragma')) {
        lintIssues.push({
          line: index + 1,
          message: 'Missing semicolon',
          severity: 'error'
        });
      }
    });
    
    return lintIssues;
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

  const handleSampleChange = async (value: string) => {
    setSelectedSample(value);
    
    // Find the selected contract from sampleContracts
    const selectedContract = sampleContracts.find(c => c.name === value);
    
    if (selectedContract) {
      setContractCode(selectedContract.code);
    }
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomContractCode(e.target.value);
    if (activeTab === 'custom') {
      setContractCode(e.target.value);
    }
  };

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

        // Show a toast with the validation results
        if (results.errors.length > 0) {
          toast({
            title: 'Validation Failed',
            description: `Found ${results.errors.length} errors in your code`,
            type: 'error'
          });
        } else if (results.warnings.length > 0) {
          toast({
            title: 'Validation Complete',
            description: `Found ${results.warnings.length} warnings in your code`,
            type: 'warning'
          });
        } else {
          toast({
            title: 'Validation Successful',
            description: 'No issues found in your code',
            type: 'success'
          });
        }
      }
    } catch (err) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate contract");
      
      toast({
        title: 'Validation Error',
        description: err.message || "Unknown error occurred during validation",
        type: 'error'
      });
    } finally {
      setIsValidating(false);
    }
  };

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

  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab);
  };

  const getContractDetails = () => {
    return null;
  };

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
    } else {
      toast({
        title: "No Contract Available",
        description: "You need to deploy a contract first before interacting with it",
        type: "warning"
      });
    }
  };

  const handleCopyContract = () => {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      
      toast({
        title: "Address Copied",
        description: "Contract address copied to clipboard",
        type: "success"
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const explainCompilerError = (error: string) => {
    if (!error) return "";
    
    // Handle specific error types with more useful explanations
    if (error.includes('requires different compiler version')) {
      const match = error.match(/current compiler is ([0-9.]+)/);
      const currentCompiler = match ? match[1] : 'unknown';
      
      return `Compiler version mismatch: The contract specifies a version that doesn't match the current compiler (${currentCompiler}). 
      To fix this, update your pragma statement to use a compatible version with the ^ symbol (e.g., pragma solidity ^0.8.0).`;
    }
    
    if (error.includes('undeclared identifier')) {
      const match = error.match(/undeclared identifier '([^']+)'/);
      const identifier = match ? match[1] : 'unknown';
      
      return `Undeclared identifier: '${identifier}' is not defined. Make sure you've declared this variable, function, or imported the contract that defines it.`;
    }
    
    if (error.includes('not enough arguments')) {
      return `Function call missing arguments: You're not providing all the required arguments to this function call.`;
    }
    
    if (error.includes('not a contract')) {
      return `Not a contract: You're trying to interact with an address that doesn't have contract code.`;
    }
    
    if (error.includes('insufficient funds')) {
      return `Insufficient funds: The account doesn't have enough ETH to execute this transaction.`;
    }
    
    if (error.includes('transfer amount exceeds balance')) {
      return `Transfer exceeds balance: You're trying to transfer more tokens/ETH than the account has.`;
    }
    
    // Return the original error if we don't have a specific explanation
    return error;
  };

  const handleMultiFileCompile = useCallback((result: any, fileId: string) => {
    // Simple implementation
  }, []);

  const handleMultiFileValidate = useCallback((result: any, fileId: string) => {
    // Simple implementation
  }, []);

  const handleMultiFileEditorChange = useCallback((content: string, fileId: string) => {
    // Update the contractCode state to keep the action buttons working
    setContractCode(content);
    
    // If we're in custom tab, also update the customContractCode
    if (activeTab === 'custom') {
      setCustomContractCode(content);
    }
  }, []); // Removed activeTab dependency, will just use the current value

  const handleCompileResponse = (result) => {
    // Simple implementation
  };

  // Return the component UI
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
}

export default CreateContractPage; 