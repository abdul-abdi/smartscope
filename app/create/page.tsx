'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Add this theme observer utility at the top after imports
function useDarkModeObserver(callback) {
  useEffect(() => {
    // Function to check if document has dark mode class
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    
    // Initial call
    callback(isDarkMode());
    
    // Set up observer for class changes on html element
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          callback(isDarkMode());
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, { attributes: true });
    
    // Cleanup
    return () => observer.disconnect();
  }, [callback]);
}

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

// Dynamically import the Monaco Editor with no SSR
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

// Update the configureMonaco function to create stronger themes
function configureMonaco(monaco) {
  // Register Solidity language
  monaco.languages.register({ id: 'solidity' });
  
  // Define dark theme with more specific colors
  monaco.editor.defineTheme('solidity-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#2C2C2C',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#3B3B3B',
      'editorIndentGuide.background': '#404040',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorBracketMatch.border': '#888888',
      'editorGutter.background': '#1E1E1E'
    }
  });

  // Define light theme with more specific colors
  monaco.editor.defineTheme('solidity-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'operator', foreground: '000000' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'type', foreground: '267F99' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editorLineNumber.foreground': '#6E6E6E',
      'editor.selectionBackground': '#ADD6FF',
      'editor.lineHighlightBackground': '#F3F3F3',
      'editorCursor.foreground': '#000000',
      'editorWhitespace.foreground': '#E0E0E0',
      'editorIndentGuide.background': '#D3D3D3',
      'editor.inactiveSelectionBackground': '#E5EBF1',
      'editorBracketMatch.border': '#C9C9C9',
      'editorGutter.background': '#F7F7F7'
    }
  });
  
  // Define Solidity language syntax
  monaco.languages.setMonarchTokensProvider('solidity', {
    defaultToken: 'invalid',
    tokenPostfix: '.sol',

    keywords: [
      'abstract', 'address', 'after', 'alias', 'apply', 'auto', 'case', 'catch', 'constant', 'copyof', 'default', 
      'define', 'final', 'immutable', 'implements', 'in', 'inline', 'let', 'macro', 'match', 'mutable', 'null', 
      'of', 'override', 'partial', 'promise', 'reference', 'relocatable', 'sealed', 'sizeof', 'static', 'supports', 
      'switch', 'try', 'type', 'typedef', 'typeof', 'unchecked',
      'bool', 'string', 'uint', 'int', 'bytes', 'byte', 'fixed', 'ufixed',
      'contract', 'interface', 'enum', 'struct', 'mapping',
      'break', 'continue', 'delete', 'else', 'for', 'if', 'new', 'return', 'returns', 'while',
      'private', 'public', 'external', 'internal', 'payable', 'view', 'pure', 'constant', 'anonymous', 'indexed', 'storage', 'memory',
      'function', 'modifier', 'event', 'constructor', 'fallback', 'receive', 'using', 'emit', 'pragma', 'import',
      'assembly', 'assert', 'require', 'revert', 'throw'
    ],

    typeKeywords: [
      'bool', 'int', 'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112', 'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168', 'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224', 'uint232', 'uint240', 'uint248', 'uint256',
      'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64', 'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128', 'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192', 'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256',
      'bytes1', 'bytes2', 'bytes3', 'bytes4', 'bytes5', 'bytes6', 'bytes7', 'bytes8', 'bytes9', 'bytes10', 'bytes11', 'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16', 'bytes17', 'bytes18', 'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24', 'bytes25', 'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32',
      'bytes', 'string', 'address', 'byte', 'fixed', 'ufixed', 'fixed0x8', 'fixed0x16', 'fixed0x24', 'fixed0x32', 'fixed0x40', 'fixed0x48', 'fixed0x56', 'fixed0x64', 'fixed0x72', 'fixed0x80',
    ],
    
    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||', '++', '--',
      '+', '-', '*', '/', '&', '|', '^', '%', '<<',
      '>>', '+=', '-=', '*=', '/=', '&=', '|=',
      '^=', '%=', '<<=', '>>=', '=>'
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
    floatsuffix: /[fFlL]?/,

    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': { token: 'keyword.$0' },
            '@typeKeywords': { token: 'type.$0' },
            '@default': 'identifier'
          }
        }],
        
        // Whitespace
        { include: '@whitespace' },
        
        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],
        
        // Numbers
        [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
        [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
        [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
        [/\d[\d']*\d(@integersuffix)/, 'number'],
        [/\d(@integersuffix)/, 'number'],
        
        // Delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],
        
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
        [/"/, 'string', '@string'],
        
        // Characters
        [/'[^\\']'/, 'string'],
        [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
        [/'/, 'string.invalid']
      ],
      
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],    // nested comment
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
      
      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],
      
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    }
  });

  // Define Solidity language configuration
  monaco.languages.setLanguageConfiguration('solidity', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*#pragma\\s+region\\b'),
        end: new RegExp('^\\s*#pragma\\s+endregion\\b')
      }
    }
  });
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
  
  // Add these refs to the component
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  
  // Add theme detection right after useState declarations
  const { theme, resolvedTheme } = useTheme();
  
  // Create a separate state for editorTheme that's not tied directly to the theme context
  const [editorTheme, setEditorTheme] = useState('solidity-light'); // Default to light
  
  // Add HTML element direct observer for more reliable theme detection
  const hasManuallySetTheme = useRef(false);
  
  useDarkModeObserver((isDark) => {
    if (editorRef.current && monacoRef.current && !hasManuallySetTheme.current) {
      const newTheme = isDark ? 'solidity-dark' : 'solidity-light';
      setEditorTheme(newTheme);
      monacoRef.current.editor.setTheme(newTheme);
      
      // Apply direct DOM styling
      applyEditorThemingSafely(isDark);
    }
  });
  
  // Function to directly apply styling to the editor
  const applyEditorThemingSafely = (isDark) => {
    if (!editorRef.current) return;
    
    try {
      const editorDom = editorRef.current.getDomNode();
      if (!editorDom) return;
      
      // Clean up existing theme classes
      editorDom.classList.remove('monaco-light-theme', 'monaco-dark-theme');
      
      // Apply new theme class
      editorDom.classList.add(isDark ? 'monaco-dark-theme' : 'monaco-light-theme');
      
      // Find and update the background elements directly
      const editorElement = editorDom.querySelector('.monaco-editor');
      const backgroundElement = editorDom.querySelector('.monaco-editor-background');
      const marginElement = editorDom.querySelector('.margin');
      
      if (editorElement) {
        editorElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      if (backgroundElement) {
        backgroundElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      if (marginElement) {
        marginElement.style.backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
      }
      
      // Force a layout recalculation
      editorRef.current.layout();
    } catch (error) {
      console.error('Error applying editor theme:', error);
    }
  };
  
  // Enhanced theme sync effect that runs more frequently and with backup mechanisms
  useEffect(() => {
    // This will capture theme changes from the theme context
    if (monacoRef.current && editorRef.current) {
      const newTheme = resolvedTheme === 'dark' ? 'solidity-dark' : 'solidity-light';
      
      // Set our internal state
      setEditorTheme(newTheme);
      
      // Apply the theme through Monaco API
      monacoRef.current.editor.setTheme(newTheme);
      
      // Directly apply DOM styling
      applyEditorThemingSafely(resolvedTheme === 'dark');
      
      // Let the observer know we manually set the theme
      hasManuallySetTheme.current = true;
      
      // Reset the manual flag after some time to allow the observer to take over again
      const timer = setTimeout(() => {
        hasManuallySetTheme.current = false;
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [resolvedTheme, theme]);
  
  // Add a change detector for the editor theme state
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      // Apply the theme directly through Monaco
      monacoRef.current.editor.setTheme(editorTheme);
      
      // Apply DOM styling
      applyEditorThemingSafely(editorTheme === 'solidity-dark');
    }
  }, [editorTheme]);

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

  // Add automatic validation with debounce
  useEffect(() => {
    if (contractCode && contractCode.trim() !== '' && autoValidate) {
      // Add debounce to avoid too frequent validations
      const timer = setTimeout(async () => {
        try {
          const result = await validateContractCode(contractCode);
          // Update validation state
          setValidationWarnings(result.warnings);
          setValidationErrors(result.errors);
          setSecurityScore(result.securityScore);
          setValidationResults(result);
          
          // Update editor decorations when validation finishes
          if (editorRef.current && monacoRef.current) {
            updateEditorDecorations(
              editorRef.current, 
              monacoRef.current, 
              result
            );
          }
        } catch (error) {
          console.error("Validation error:", error);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [contractCode, autoValidate]);

  // Update handleSampleChange to be async
  const handleSampleChange = async (value: string) => {
    setSelectedSample(value);
    
    // Find the selected contract from sampleContracts
    const selectedContract = sampleContracts.find(contract => contract.name === value);
    if (selectedContract) {
      setContractCode(selectedContract.code);
      
      // Validate the selected sample contract
      if (autoValidate) {
        const results = await validateContractCode(selectedContract.code);
        // Update validation state
        setValidationWarnings(results.warnings);
        setValidationErrors(results.errors);
        setSecurityScore(results.securityScore);
        
        // Update editor decorations if editor is ready
        if (editorRef.current && monacoRef.current) {
          updateEditorDecorations(
            editorRef.current,
            monacoRef.current,
            { errors: results.errors, warnings: results.warnings }
          );
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

  // Update the handleValidate function to ensure it sets all necessary state variables
  const handleValidate = async () => {
    setIsValidating(true);
    setError(''); // Clear any previous errors
    
    try {
      const result = await validateContractCode(contractCode);
      
      // Update all validation state
      setValidationWarnings(result.warnings);
      setValidationErrors(result.errors);
      setSecurityScore(result.securityScore);
      setValidationResults(result);
      
      // Also update warnings for compatibility with existing UI
      setWarnings(result.warnings);
      
      // Update editor decorations
      if (editorRef.current && monacoRef.current) {
        updateEditorDecorations(
          editorRef.current,
          monacoRef.current,
          result
        );
      }
      
      // Provide feedback on validation results
      if (result.errors.length > 0) {
        setError(`Validation failed: ${result.errors[0]}`);
      } else if (result.warnings.length > 0) {
        console.info(`Contract validated with ${result.warnings.length} warning(s).`);
      } else {
        console.info('Contract validated successfully with no warnings.');
      }
      
    } catch (error) {
      console.error("Validation error:", error);
      setValidationErrors([`Validation failed: ${error.message || 'Unknown error'}`]);
      setError(`Validation error: ${error.message || 'Unknown error'}`);
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
      // Special handling for compiler version errors
      if (err.message && (
        err.message.includes('requires different compiler version') || 
        err.message.includes('Source file requires different compiler version')
      )) {
        const versionMatch = err.message.match(/current compiler is ([0-9.+a-zA-Z]+)/);
        const currentVersion = versionMatch ? versionMatch[1] : 'unknown';
        setError(`Compiler version mismatch: Your contract requires a specific version that doesn't match the current compiler (${currentVersion}). 
        Add the ^ symbol before your version number (e.g., ^0.8.17) to allow compatible versions.`);
      } else {
        setError(err.message || 'An error occurred during compilation');
      }
      
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

  const handleDeploy = async (resumeOp = false, existingFileId = null, customDeploymentId = null) => {
    if (!compilationResult && !resumeOp) {
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

  // Add a comprehensive validation function for Solidity contracts
  const validateContractCode = async (code: string): Promise<{ errors: string[], warnings: string[], securityScore: number }> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100; // Start with perfect score
    
    // Check if code is empty
    if (!code.trim()) {
      errors.push('Contract code is empty');
      return { errors, warnings, securityScore: 0 };
    }
    
    // Check if code contains a contract definition
    if (!code.includes('contract ')) {
      errors.push('No contract definition found');
    }
    
    // Check for pragma directive
    if (!code.includes('pragma solidity')) {
      errors.push('Missing pragma solidity directive');
    }
    
    // Check for SPDX license identifier
    if (!code.includes('SPDX-License-Identifier:')) {
      warnings.push('Missing SPDX license identifier');
      securityScore -= 5; // Minor issue
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
    
    // Alternative basic syntax check for Solidity
    // Check for common syntax elements in the correct order
    if (!code.match(/pragma\s+solidity\s+(\^|=|>=|<=|>|<)?(\d+\.\d+\.\d+|\d+\.\d+)/)) {
      errors.push('Invalid or missing pragma solidity statement');
    }
    
    // Check if every opening brace has a matching closing brace
    const braceStack = [];
    for (let i = 0; i < code.length; i++) {
      if (code[i] === '{') {
        braceStack.push('{');
      } else if (code[i] === '}') {
        if (braceStack.length === 0) {
          errors.push('Syntax error: Unexpected closing brace');
          break;
        }
        braceStack.pop();
      }
    }
    if (braceStack.length > 0) {
      errors.push('Syntax error: Missing closing braces');
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
    if (code.includes('.call{value:') && !code.includes('ReentrancyGuard') && !code.includes('nonReentrant')) {
      warnings.push('Potential reentrancy vulnerability detected with .call{value:}. Consider using ReentrancyGuard or follow checks-effects-interactions pattern.');
      securityScore -= 25; // Critical security issue
    }
    
    // Check for state changes after external calls (violates checks-effects-interactions)
    const stateAfterCallRegex = /\.call\([^;]*;\s*[^\/]*\s*[a-zA-Z0-9_\[\]]+\s*=[^=]/;
    if (stateAfterCallRegex.test(code)) {
      warnings.push('State changes detected after external calls. This violates the checks-effects-interactions pattern and may lead to reentrancy vulnerabilities.');
      securityScore -= 20; // Critical security issue
    }
    
    // Security check: Unchecked external calls
    if ((code.includes('.call(') || code.includes('.delegatecall(')) && !code.includes('require(success')) {
      warnings.push('Unchecked external call result detected. Make sure to check return values of low-level calls.');
      securityScore -= 15; // Significant security issue
    }
    
    // Check for use of delegatecall (very dangerous if misused)
    if (code.includes('.delegatecall(')) {
      warnings.push('Use of delegatecall detected. This is a powerful but dangerous feature that can lead to critical vulnerabilities if misused.');
      securityScore -= 20; // Major security issue
    }
    
    // Gas optimization: Avoid expensive operations in loops
    const loopStorage = /for\s*\([^)]*\)\s*{[^}]*storage/i;
    if (loopStorage.test(code)) {
      warnings.push('Storage access in loops detected. This can be gas-intensive, consider caching storage variables outside loops.');
      securityScore -= 10; // Performance issue
    }
    
    // Check for unbounded loops which could lead to DoS
    const forLoopRegex = /for\s*\([^)]*;\s*[^;]*;\s*[^)]*\)/g;
    const matches = [...code.matchAll(forLoopRegex)];
    for (const match of matches) {
      const forLoop = match[0];
      // Check if loop has no upper bound in the condition part
      if (!/;\s*[a-zA-Z0-9_\[\]]+\s*<[^;]*;/.test(forLoop) && 
          !/;\s*[a-zA-Z0-9_\[\]]+\s*<=[^;]*;/.test(forLoop)) {
        warnings.push('Potentially unbounded loop detected. Ensure all loops have a clear upper bound to prevent DoS attacks.');
        securityScore -= 15;
        break; // Only penalize once for this issue
      }
    }
    
    // Check for while(true) loops
    if (/while\s*\(\s*true\s*\)/.test(code)) {
      warnings.push('Infinite loop detected with while(true). This will consume all gas and cause transactions to fail.');
      securityScore -= 20; // Critical issue
    }
    
    // Check for visibility modifiers
    const functionDefRegex = /function\s+\w+\s*\([^)]*\)(?:\s+\w+)*(?!\s+(?:public|private|internal|external))/g;
    if (code.match(functionDefRegex)) {
      warnings.push('Functions missing visibility modifiers (public, private, internal, external) detected.');
      securityScore -= 10; // Security best practice issue
    }
    
    // Check for floating pragma vs fixed pragma
    const pragmaRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)/;
    const fixedPragmaRegex = /pragma\s+solidity\s+(\d+\.\d+\.\d+|\d+\.\d+)/;
    if (fixedPragmaRegex.test(code)) {
      warnings.push('Fixed pragma version detected. Consider using a carat (^) prefix for better compatibility with newer compiler versions.');
      securityScore -= 5; // Minor issue
    } else if (pragmaRegex.test(code)) {
      // This is actually good practice but we'll still note it as potentially introducing compatibility issues
      warnings.push('Floating pragma detected. This allows for newer compiler versions but may introduce subtle behavior changes.');
    }
    
    // Check for outdated Solidity version
    const oldVersionRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)\s*0\.[1-7]\.\d+/;
    if (oldVersionRegex.test(code)) {
      warnings.push('Outdated Solidity version detected. Consider using version 0.8.0 or later for built-in overflow protection and better security features.');
      securityScore -= 15;
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
    
    // Check for use of address(this).balance
    if (code.includes('address(this).balance')) {
      warnings.push('Use of address(this).balance detected. Be careful as contracts can receive ETH without triggering any code.');
      securityScore -= 5; // Minor issue
    }
    
    // Check for randomness derived from blockchain data
    if ((code.includes('block.timestamp') || code.includes('blockhash')) && 
        (code.includes('random') || code.includes('rand'))) {
      warnings.push('Potential use of blockchain data for randomness detected. This is not secure as miners can manipulate these values.');
        securityScore -= 15; // Significant security issue
    }
    
    // Check for integer overflow/underflow in older Solidity versions
    if (!code.includes('pragma solidity ^0.8') && !code.includes('SafeMath')) {
      warnings.push('Contract may be vulnerable to integer overflow/underflow. Use Solidity 0.8.x or SafeMath library.');
      securityScore -= 15; // Significant security issue
    }
    
    // Check for contract size (Hedera has size limits)
    if (code.length > 24576) {  // 24KB is approaching risky territory
      warnings.push('Contract code is very large and may exceed deployment size limits on Hedera.');
      securityScore -= 10; // Deployment risk
    }
    
    // Ensure security score doesn't go below 0
    securityScore = Math.max(0, securityScore);
    
    return { errors, warnings, securityScore };
  };

  // Create a helper function to get detailed information about warnings
  const getWarningInfo = (warning: string): { description: string, severity: 'high' | 'medium' | 'low', fix: string } => {
    if (warning.includes('Reentrancy vulnerability')) {
      return {
        description: 'Reentrancy allows attackers to repeatedly call your contract before the first execution is complete, potentially draining funds.',
        severity: 'high',
        fix: 'Use the ReentrancyGuard modifier or follow checks-effects-interactions pattern (update state before external calls).'
      };
    }
    
    if (warning.includes('state changes after external calls')) {
      return {
        description: 'Updating state after making external calls violates the checks-effects-interactions pattern and enables reentrancy attacks.',
        severity: 'high',
        fix: 'Always update state before making external calls to other contracts.'
      };
    }
    
    if (warning.includes('Unchecked external call')) {
      return {
        description: 'Low-level calls can fail silently if their return value is not checked, leading to unexpected behavior.',
        severity: 'high',
        fix: 'Add a require statement to check the success value: require(success, "Call failed");'
      };
    }
    
    if (warning.includes('delegatecall')) {
      return {
        description: 'delegatecall executes code in the context of the calling contract, giving the called contract full access to your contract\'s state and balance.',
        severity: 'high',
        fix: 'Avoid delegatecall if possible, or ensure you only delegatecall to trusted and immutable contracts.'
      };
    }
    
    if (warning.includes('Storage access in loops')) {
      return {
        description: 'Reading or writing to storage in loops is gas-intensive and can lead to high transaction costs or even out-of-gas errors.',
        severity: 'medium',
        fix: 'Cache storage variables in memory before the loop and write back after the loop completes.'
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
        description: 'tx.origin is vulnerable to phishing attacks since it contains the original sender of the transaction, not the immediate caller.',
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
        description: 'selfdestruct will be deprecated in future Solidity versions. It can also be used to forcibly send Ether to a contract.',
        severity: 'medium',
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
    
    if (warning.includes('address(this).balance')) {
      return {
        description: 'Contracts can receive Ether without triggering any code, making address(this).balance unreliable for invariant checks.',
        severity: 'medium',
        fix: 'Track balances manually in storage variables when needed instead of relying on address(this).balance.'
      };
    }
    
    if (warning.includes('unbounded loop')) {
      return {
        description: 'Loops without clear bounds can consume excessive gas or lead to denial of service attacks, causing transactions to fail.',
        severity: 'high',
        fix: 'Add explicit upper bounds to loops and consider pagination for large data sets. Never iterate over unbounded arrays.'
      };
    }
    
    if (warning.includes('Infinite loop detected')) {
      return {
        description: 'An infinite loop will consume all available gas and cause the transaction to fail, potentially locking funds permanently.',
        severity: 'high',
        fix: 'Replace while(true) with a condition that will eventually evaluate to false. Consider adding an explicit counter with a maximum value.'
      };
    }
    
    if (warning.includes('integer overflow/underflow')) {
      return {
        description: 'Arithmetic operations can overflow or underflow, leading to unexpected behavior and potential loss of funds.',
        severity: 'high',
        fix: 'Use Solidity 0.8.x which has built-in overflow checks or use SafeMath library for older versions.'
      };
    }
    
    if (warning.includes('Outdated Solidity version')) {
    return {
        description: 'Using older Solidity versions means missing important security features like built-in overflow protection.',
      severity: 'medium',
        fix: 'Upgrade to Solidity 0.8.0 or later for better security features and native overflow/underflow protection.'
      };
    }
    
    if (warning.includes('blockchain data for randomness')) {
      return {
        description: 'Using block data like timestamp or blockhash for random number generation is insecure as these can be manipulated by miners.',
        severity: 'high',
        fix: 'Use an oracle service like Chainlink VRF for secure randomness in blockchain applications.'
      };
    }
    
    if (warning.includes('SPDX license identifier')) {
      return {
        description: 'SPDX license identifiers are recommended to clearly communicate the contract\'s license.',
        severity: 'low',
        fix: 'Add a comment at the top of your file with the format: // SPDX-License-Identifier: MIT'
      };
    }
    
    if (warning.includes('contract code is very large')) {
      return {
        description: 'Hedera has size limitations for contracts. Very large contracts may exceed these limits or cost excessive gas to deploy.',
        severity: 'medium',
        fix: 'Consider splitting functionality into multiple contracts or using libraries to reduce contract size.'
      };
    }
    
    // Default case
    return {
      description: 'Potential code issue detected.',
      severity: 'medium',
      fix: 'Review the warning and consider refactoring your code.'
    };
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

  // Add a function to perform Solidity linting
  const lintSolidityCode = (code) => {
    const linterResults = [];
    const lines = code.split('\n');
    
    // Common Solidity linting rules
    const lintRules = [
      {
        // Check for missing function visibility
        pattern: /function\s+(\w+)\s*\([^)]*\)(?!\s+(public|private|internal|external))/g,
        message: "Function should explicitly declare visibility (public, private, internal, or external)",
        severity: 2 // Warning level: 1 = info, 2 = warning, 3 = error
      },
      {
        // Check for ambiguous constructor names (old style)
        pattern: /function\s+(\w+)\s*\([^)]*\)(?:\s+public|\s+internal)(?:\s+)?{[^}]*this\s*\.\s*(\w+)/g,
        test: (match, code) => match[1] === match[2],
        message: "Avoid using old-style constructor names. Use 'constructor' keyword instead.",
        severity: 2
      },
      {
        // Large functions (more than 50 lines)
        specialCheck: (code, lineIdx) => {
          if (code.match(/function\s+\w+/)) {
            let braceCount = 0;
            let startLine = lineIdx;
            let lineCount = 0;
            
            for (let i = lineIdx; i < lines.length; i++) {
              braceCount += (lines[i].match(/{/g) || []).length;
              braceCount -= (lines[i].match(/}/g) || []).length;
              lineCount++;
              
              if (braceCount === 0 && lineCount > 50) {
                return {
                  line: startLine + 1,
                  message: `Function is too large (${lineCount} lines). Consider breaking it down into smaller functions.`,
                  severity: 1
                };
              }
              
              if (braceCount === 0) break;
            }
          }
          return null;
        }
      },
      {
        // Check for state mutability view or pure
        pattern: /function\s+(\w+)\s*\([^)]*\)(?!\s+(view|pure))[^{]*{[^}]*return\s+[^;]*;/g,
        message: "Function that returns a value should be declared 'view' or 'pure'",
        severity: 2
      },
      {
        // Check for assert usage (often indicates code that should never happen)
        pattern: /assert\(/g,
        message: "Use of 'assert()' detected. In Solidity, assert should only be used to check for internal errors.",
        severity: 1
      },
      {
        // Check for transfer with hardcoded gas (deprecated)
        pattern: /\.transfer\(/g,
        message: "Using .transfer() comes with a fixed gas stipend. Consider using .call{value:...}() instead.",
        severity: 2
      },
      {
        // Check for multiple inheritance with duplicated parent
        pattern: /contract\s+\w+\s+is\s+([^{]*){\s*/g,
        test: (match) => {
          const parents = match[1].split(',').map(p => p.trim());
          return new Set(parents).size !== parents.length;
        },
        message: "Multiple inheritance with duplicated parent contracts",
        severity: 3
      },
      {
        // Magic numbers
        pattern: /(?<![.\w"])(?<![\w]_)\d{4,}(?![.\w"])/g,
        message: "Magic number detected. Consider using a named constant instead.",
        severity: 1
      },
      {
        // TODO comments
        pattern: /\/\/\s*TODO/g,
        message: "TODO comment found. Remember to address this before final deployment.",
        severity: 1
      }
    ];
    
    // Process each line in the code
    lines.forEach((line, lineIdx) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        return;
      }
      
      // Apply each lint rule
      lintRules.forEach(rule => {
        if (rule.specialCheck) {
          const result = rule.specialCheck(line, lineIdx);
          if (result) {
            linterResults.push({
              lineNumber: result.line,
              message: result.message,
              severity: result.severity
            });
          }
          return;
        }
        
        const matches = [...line.matchAll(rule.pattern)];
        if (matches.length > 0) {
          if (rule.test && !rule.test(matches, line)) {
            return;
          }
          
          linterResults.push({
            lineNumber: lineIdx + 1, // 1-based line numbers
            message: rule.message,
            severity: rule.severity
          });
        }
      });
    });
    
    return linterResults;
  };

  // Update the updateEditorDecorations function to include linting results
  const updateEditorDecorations = (editor, monaco, results) => {
    if (!editor || !monaco) return;
    
    const errorDecorations = [];
    const warningDecorations = [];
    const infoDecorations = [];
    
    // Process validation errors
    if (results.errors && results.errors.length > 0) {
      const lineRegex = /line\s+(\d+)/i;
      
      results.errors.forEach(error => {
        // Try to extract line number from error message
        const lineMatch = error.match(lineRegex);
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (lineNumber) {
          errorDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'error-line-highlight',
              glyphMarginClassName: 'error-glyph-margin',
              hoverMessage: { value: error },
              glyphMarginHoverMessage: { value: error },
              overviewRuler: {
                color: 'red',
                position: monaco.editor.OverviewRulerLane.Right
              }
            }
          });
            } else {
          // If no line number is found, attempt to infer it from the content
          const errorPatterns = [
            { pattern: /pragma\s+solidity/, message: /pragma/i },
            { pattern: /constructor/, message: /constructor/i },
            { pattern: /function\s+\w+/, message: /function/i },
            { pattern: /contract\s+\w+/, message: /contract/i }
          ];
          
          for (const pattern of errorPatterns) {
            if (error.match(pattern.message)) {
              const lines = findLinesWithPattern(contractCode, pattern.pattern);
              lines.forEach(line => {
                errorDecorations.push({
                  range: new monaco.Range(line, 1, line, 1),
                  options: {
                    isWholeLine: true,
                    className: 'error-line-highlight',
                    glyphMarginClassName: 'error-glyph-margin',
                    hoverMessage: { value: error },
                    glyphMarginHoverMessage: { value: error },
                    overviewRuler: {
                      color: 'red',
                      position: monaco.editor.OverviewRulerLane.Right
                    }
                  }
                });
              });
              break;
            }
          }
        }
      });
    }
    
    // Process validation warnings
    if (results.warnings && results.warnings.length > 0) {
      // For warnings, we'll do more specific pattern matching since they may be more structured
      results.warnings.forEach(warning => {
        // Look for patterns like "in line X" or similar
        const lineMatch = warning.match(/(?:in|at|on)\s+line\s+(\d+)/i) || 
                          warning.match(/line\s+(\d+)/i);
        
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (lineNumber) {
          warningDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'warning-line-highlight',
              glyphMarginClassName: 'warning-glyph-margin',
              hoverMessage: { value: warning },
              glyphMarginHoverMessage: { value: warning },
              overviewRuler: {
                color: 'yellow',
                position: monaco.editor.OverviewRulerLane.Right
              }
            }
          });
      } else {
          // Some specific warning patterns to detect
          const patterns = [
            { regex: /reentrancy/i, lines: findLinesWithPattern(contractCode, /\.call\{value:/g) },
            { regex: /tx\.origin/i, lines: findLinesWithPattern(contractCode, /tx\.origin/g) },
            { regex: /unbounded loop/i, lines: findLinesWithPattern(contractCode, /for\s*\(/g) },
            { regex: /floating pragma/i, lines: findLinesWithPattern(contractCode, /pragma\s+solidity/g) },
            { regex: /selfdestruct/i, lines: findLinesWithPattern(contractCode, /selfdestruct/g) },
            { regex: /delegatecall/i, lines: findLinesWithPattern(contractCode, /delegatecall/g) },
            { regex: /block\.timestamp/i, lines: findLinesWithPattern(contractCode, /block\.timestamp/g) }
          ];
          
          for (const pattern of patterns) {
            if (pattern.regex.test(warning) && pattern.lines.length > 0) {
              pattern.lines.forEach(lineNumber => {
                warningDecorations.push({
                  range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                  options: {
                    isWholeLine: true,
                    className: 'warning-line-highlight',
                    glyphMarginClassName: 'warning-glyph-margin',
                    hoverMessage: { value: warning },
                    glyphMarginHoverMessage: { value: warning },
                    overviewRuler: {
                      color: 'yellow',
                      position: monaco.editor.OverviewRulerLane.Right
                    }
                  }
                });
              });
            }
          }
        }
      });
    }
    
    // Run linter and add linting decorations
    const lintResults = lintSolidityCode(contractCode);
    
    lintResults.forEach(result => {
      const decoration = {
        range: new monaco.Range(result.lineNumber, 1, result.lineNumber, 1),
        options: {
          isWholeLine: true,
          className: result.severity === 3 ? 'error-line-highlight' : 
                   result.severity === 2 ? 'warning-line-highlight' : 'info-line-highlight',
          hoverMessage: { value: `[Linter] ${result.message}` },
          glyphMarginHoverMessage: { value: `[Linter] ${result.message}` },
          overviewRuler: {
            color: result.severity === 3 ? 'red' : 
                  result.severity === 2 ? 'yellow' : 'blue',
            position: monaco.editor.OverviewRulerLane.Right
          }
        }
      };
      
      if (result.severity === 3) {
        errorDecorations.push(decoration);
      } else if (result.severity === 2) {
        warningDecorations.push(decoration);
      } else {
        infoDecorations.push(decoration);
      }
    });
    
    // Add squiggly lines for errors and warnings
    const errorMarkers = [];
    const warningMarkers = [];
    
    [...errorDecorations, ...warningDecorations, ...infoDecorations].forEach(decoration => {
      const lineNumber = decoration.range.startLineNumber;
      const message = typeof decoration.options.hoverMessage === 'object' ? 
                      decoration.options.hoverMessage.value : 
                      decoration.options.hoverMessage;
      
      const severity = decoration.options.className.includes('error') ? monaco.MarkerSeverity.Error :
                      decoration.options.className.includes('warning') ? monaco.MarkerSeverity.Warning :
                      monaco.MarkerSeverity.Info;
      
      const marker = {
        severity,
        message,
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: editor.getModel().getLineMaxColumn(lineNumber)
      };
      
      if (severity === monaco.MarkerSeverity.Error) {
        errorMarkers.push(marker);
      } else if (severity === monaco.MarkerSeverity.Warning) {
        warningMarkers.push(marker);
      }
    });
    
    // Set markers for the editor model
    if (errorMarkers.length > 0 || warningMarkers.length > 0) {
      monaco.editor.setModelMarkers(
        editor.getModel(),
        'solidity-validator',
        [...errorMarkers, ...warningMarkers]
      );
    } else {
      // Clear markers if none are found
      monaco.editor.setModelMarkers(editor.getModel(), 'solidity-validator', []);
    }
    
    // Apply decorations to editor
    if (errorDecorations.length > 0) {
      editor.createDecorationsCollection(errorDecorations);
    }
    
    if (warningDecorations.length > 0) {
      editor.createDecorationsCollection(warningDecorations);
    }
    
    if (infoDecorations.length > 0) {
      editor.createDecorationsCollection(infoDecorations);
    }
  };

  // Add the findLinesWithPattern helper function
  const findLinesWithPattern = (code, pattern) => {
    const lines = code.split('\n');
    const matchingLines = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        // Add 1 to index since Monaco editor uses 1-indexed lines
        matchingLines.push(index + 1);
      }
    });
    
    return matchingLines;
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
                    <TabsTrigger value="sample" onClick={() => handleTabChange('sample')}>Sample Contracts</TabsTrigger>
                    <TabsTrigger value="custom" onClick={() => handleTabChange('custom')}>Custom Contract</TabsTrigger>
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
                  <div className="h-[700px] pt-10"> {/* Increased height from 96 (h-96) to 700px */}
                    <div className="w-full" style={{ 
                      height: "700px", 
                      border: "1px solid rgba(255, 255, 255, 0.1)", 
                      borderRadius: "8px", 
                      overflow: "auto" // Changed from "hidden" to "auto" to enable scrolling
                    }}>
                      {MonacoEditor && (
                        <MonacoEditor
                          value={contractCode}
                          language="solidity"
                          theme={editorTheme}
                          options={{
                            selectOnLineNumbers: true,
                            roundedSelection: false,
                            readOnly: false,
                            cursorStyle: "line",
                            automaticLayout: true,
                            minimap: { enabled: true },
                            folding: true,
                            lineNumbers: "on",
                            renderLineHighlight: "all",
                            scrollBeyondLastLine: true,
                            glyphMargin: true,
                            fontSize: 14,
                            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                            scrollbar: {
                              useShadows: false,
                              verticalHasArrows: true,
                              horizontalHasArrows: true,
                              vertical: "visible",
                              horizontal: "visible",
                              verticalScrollbarSize: 12,
                              horizontalScrollbarSize: 12,
                              alwaysConsumeMouseWheel: false // Changed to false to allow scrolling to pass through
                            }
                          }}
                          onChange={(value) => {
                            setContractCode(value || "");
                            if (activeTab === 'custom') {
                              setCustomContractCode(value || "");
                            }
                          }}
                          beforeMount={(monaco) => {
                            configureMonaco(monaco);
                          }}
                          onMount={(editor, monaco) => {
                            editorRef.current = editor;
                            monacoRef.current = monaco;
                            
                            // Initial theme application
                            const isDark = resolvedTheme === 'dark' || document.documentElement.classList.contains('dark');
                            const initialTheme = isDark ? 'solidity-dark' : 'solidity-light';
                            
                            // Set our state
                            setEditorTheme(initialTheme);
                            
                            // Apply through Monaco API
                            monaco.editor.setTheme(initialTheme);
                            
                            // Apply direct DOM styling
                            applyEditorThemingSafely(isDark);
                            
                            // Force a layout refresh with a small delay
                            setTimeout(() => {
                              editor.layout();
                            }, 50);
                            
                            // Get the editor's DOM node to add wheel event handling
                            const editorDomNode = editor.getDomNode();
                            if (editorDomNode) {
                              // Add wheel event listener to detect boundaries and allow page scrolling
                              editorDomNode.addEventListener('wheel', (e) => {
                                const editorScrollable = editorDomNode.querySelector('.monaco-scrollable-element');
                                if (!editorScrollable) return;
                                
                                const { scrollTop, scrollHeight, clientHeight } = editorScrollable;
                                const isAtTop = scrollTop === 0;
                                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // Small buffer for rounding errors
                                
                                // If at top and scrolling up or at bottom and scrolling down, don't stop propagation
                                if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                                  // Allow the event to propagate to the page
                                  return;
                                }
                                
                                // Otherwise, prevent the event from propagating to avoid double scrolling
                                e.stopPropagation();
                              }, { passive: true });
                            }
                            
                            // If there are validation results, update decorations
                            if (validationResults) {
                              updateEditorDecorations(
                                editor, 
                                monaco, 
                                validationResults
                              );
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
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
                  <AlertDescription>{explainCompilerError(error)}</AlertDescription>
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
                    
                    {/* Add compiler details when available */}
                    {compilationResult && !isCompiling && getContractDetails()}
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
                
                {validationResults && validationResults.errors.length > 0 && (
                  <motion.div 
                    className="border-b border-border/30 pb-4 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground/80 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                        Validation Errors
                      </h3>
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400">
                        {validationResults.errors.length} {validationResults.errors.length === 1 ? 'error' : 'errors'}
                      </Badge>
                    </div>
                    <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 overflow-y-auto max-h-48">
                      <ul className="divide-y divide-red-200 dark:divide-red-800/50">
                        {validationResults.errors.map((error, index) => (
                          <li key={index} className="p-3">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <AlertCircle className="h-3 w-3" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground/80">{error}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  This error must be fixed before compilation can proceed.
                                </p>
                              </div>
                            </div>
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

<style jsx global>{`
  /* Directly target the editor with a data attribute selector for higher specificity */
  .monaco-editor[data-mode="solidity"] {
    color-scheme: inherit !important;
  }
  
  /* Ensure editor and scrollable area have proper height */
  .monaco-editor,
  .monaco-editor .overflow-guard {
    height: 100% !important;
    width: 100% !important;
  }
  
  /* Ensure scrolling works properly */
  .monaco-scrollable-element {
    overflow: auto !important;
  }
  
  /* Allow scrolling in editor container */
  .monaco-editor-container {
    overflow: auto !important;
    height: 100% !important;
  }
  
  /* Make sure scrollbars are always visible and styled */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
    background-color: transparent;
  }
  
  ::-webkit-scrollbar-track {
    background-color: transparent;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.5);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(128, 128, 128, 0.7);
  }
  
  /* Root theme variables with higher specificity */
  :root {
    --editor-background: #ffffff;
    --editor-foreground: #000000;
    --editor-line-numbers: #6E6E6E;
  }
  
  .dark {
    --editor-background: #1E1E1E;
    --editor-foreground: #D4D4D4;
    --editor-line-numbers: #858585;
  }
  
  /* Force direct element styling with extra selectors for specificity */
  .monaco-light-theme .monaco-editor,
  .monaco-light-theme .monaco-editor .monaco-editor-background,
  .monaco-light-theme .monaco-editor .margin,
  html:not(.dark) .monaco-editor,
  html:not(.dark) .monaco-editor .monaco-editor-background,
  html:not(.dark) .monaco-editor .margin {
    background-color: #FFFFFF !important;
    color-scheme: light !important;
  }
  
  .monaco-dark-theme .monaco-editor,
  .monaco-dark-theme .monaco-editor .monaco-editor-background,
  .monaco-dark-theme .monaco-editor .margin,
  html.dark .monaco-editor,
  html.dark .monaco-editor .monaco-editor-background,
  html.dark .monaco-editor .margin {
    background-color: #1E1E1E !important;
    color-scheme: dark !important;
  }
  
  /* Content colors with higher specificity */
  .monaco-light-theme .monaco-editor .lines-content,
  html:not(.dark) .monaco-editor .lines-content {
    color: #000000 !important;
  }
  
  .monaco-dark-theme .monaco-editor .lines-content,
  html.dark .monaco-editor .lines-content {
    color: #D4D4D4 !important;
  }
  
  /* Line numbers with higher specificity */
  .monaco-light-theme .monaco-editor .line-numbers,
  html:not(.dark) .monaco-editor .line-numbers {
    color: #6E6E6E !important;
  }
  
  .monaco-dark-theme .monaco-editor .line-numbers,
  html.dark .monaco-editor .line-numbers {
    color: #858585 !important;
  }
  
  /* Error and warning highlighting */
  .error-line-highlight {
    background-color: rgba(255, 0, 0, 0.1);
    border-left: 3px solid red;
  }
  
  .warning-line-highlight {
    background-color: rgba(255, 204, 0, 0.1);
    border-left: 3px solid orange;
  }
  
  .info-line-highlight {
    background-color: rgba(64, 150, 255, 0.1);
    border-left: 3px solid #4096ff;
  }
  
  .error-glyph-margin {
    background-color: red;
    border-radius: 50%;
    margin-left: 5px;
  }
  
  .warning-glyph-margin {
    background-color: orange;
    border-radius: 50%;
    margin-left: 5px;
  }
  
  /* Make sure editor takes full width */
  .monaco-editor {
    width: 100% !important;
  }
  
  /* Override Monaco editor squiggly lines */
  .monaco-editor .squiggly-error {
    background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23ff0000'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left !important;
  }
  
  .monaco-editor .squiggly-warning {
    background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23ff9800'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left !important;
  }
`}</style> 