'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { useFileSystem } from '../../components/providers/file-system-provider';
import { FileExplorer, FileSystemItem } from '../../components/ui/file-explorer';
import { TabsManager } from '../../components/ui/tabs-manager';
import SolidityEditor from './SolidityEditor';
import { compileContract, compileMultipleFiles } from '../utils/api';
import { useToast } from '../../components/providers/toast-provider';
import { Button } from '../../components/ui/button';
import { FilePlus, Sparkles, FolderPlus, FileCode, AlertTriangle, ChevronDown, FilesIcon, ExternalLinkIcon, CheckCircleIcon, CodeIcon, FileUpIcon, Copy, X, Check, Loader2, ExternalLink } from 'lucide-react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Progress } from '../../components/ui/progress';
import { StatusPanel } from './ButtonActions';

interface MultiFileIDEProps {
  onCompile: (result: any, fileId: string) => void;
  onValidate: (result: any, fileId: string) => void;
  onEditorChange: (content: string, fileId: string) => void;
  onDeploy?: () => void; // Add this prop
  initialValue?: string;
}

// Define a public interface for the methods exposed via ref
export interface MultiFileIDEHandle {
  validateCurrentFile: () => Promise<any>;
  compileCurrentFile: () => Promise<any>;
  getCurrentFileContent: () => string | undefined;
  getSelectedContract: () => { name: string, fileId: string } | null;
  getAllFiles: () => any[];
  selectFileById: (fileId: string) => void;
  handleDeploymentSuccess: (contractAddress: string) => void;
}

// Sample template contracts for quick creation
const CONTRACT_TEMPLATES = {
  erc20: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ERC20Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}`,
  nft: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleNFT {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    
    string public name;
    string public symbol;
    
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(uint256 => string) private _tokenURIs;
    
    uint256 private _nextTokenId;
    address private _owner;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        _owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not authorized");
        _;
    }
    
    function mint(address to, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = tokenURI;
        
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Invalid token ID");
        return owner;
    }
    
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }
    
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner, "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Invalid token ID");
        return _tokenApprovals[tokenId];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender);
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Invalid token ID");
        return _tokenURIs[tokenId];
    }
}`,
  dao: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleDAO {
    struct Proposal {
        uint256 id;
        string description;
        uint256 voteCount;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    address public owner;
    mapping(address => bool) public members;
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    event MemberAdded(address member);
    event MemberRemoved(address member);
    event ProposalCreated(uint256 proposalId, string description);
    event Voted(address voter, uint256 proposalId);
    event ProposalExecuted(uint256 proposalId);
    
    constructor() {
        owner = msg.sender;
        members[msg.sender] = true;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyMember() {
        require(members[msg.sender], "Only members can call this function");
        _;
    }
    
    function addMember(address _member) public onlyOwner {
        require(!members[_member], "Already a member");
        members[_member] = true;
        emit MemberAdded(_member);
    }
    
    function removeMember(address _member) public onlyOwner {
        require(_member != owner, "Cannot remove owner");
        require(members[_member], "Not a member");
        members[_member] = false;
        emit MemberRemoved(_member);
    }
    
    function createProposal(string memory _description) public onlyMember {
        uint256 proposalId = proposalCount++;
        Proposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.description = _description;
        p.voteCount = 0;
        p.executed = false;
        
        emit ProposalCreated(proposalId, _description);
    }
    
    function vote(uint256 _proposalId) public onlyMember {
        Proposal storage p = proposals[_proposalId];
        require(!p.executed, "Proposal already executed");
        require(!p.hasVoted[msg.sender], "Already voted");
        
        p.hasVoted[msg.sender] = true;
        p.voteCount += 1;
        
        emit Voted(msg.sender, _proposalId);
    }
    
    function executeProposal(uint256 _proposalId) public onlyOwner {
        Proposal storage p = proposals[_proposalId];
        require(!p.executed, "Proposal already executed");
        
        // In a real DAO, you would have execution logic here
        p.executed = true;
        
        emit ProposalExecuted(_proposalId);
    }
}`,
  crowdfunding: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Crowdfunding {
    struct Campaign {
        address creator;
        uint256 goal;
        uint256 deadline;
        uint256 currentAmount;
        bool claimed;
        mapping(address => uint256) contributions;
    }
    
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    
    event CampaignCreated(uint256 campaignId, address creator, uint256 goal, uint256 deadline);
    event Contribution(uint256 campaignId, address contributor, uint256 amount);
    event FundsClaimed(uint256 campaignId, address creator, uint256 amount);
    event RefundClaimed(uint256 campaignId, address contributor, uint256 amount);
    
    function createCampaign(uint256 _goal, uint256 _durationInDays) public {
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        
        uint256 campaignId = campaignCount++;
        Campaign storage c = campaigns[campaignId];
        c.creator = msg.sender;
        c.goal = _goal;
        c.deadline = block.timestamp + (_durationInDays * 1 days);
        c.currentAmount = 0;
        c.claimed = false;
        
        emit CampaignCreated(campaignId, msg.sender, _goal, c.deadline);
    }
    
    function contribute(uint256 _campaignId) public payable {
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp < c.deadline, "Campaign has ended");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        c.contributions[msg.sender] += msg.value;
        c.currentAmount += msg.value;
        
        emit Contribution(_campaignId, msg.sender, msg.value);
    }
    
    function claimFunds(uint256 _campaignId) public {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.creator, "Only the creator can claim funds");
        require(block.timestamp >= c.deadline, "Campaign has not ended yet");
        require(c.currentAmount >= c.goal, "Goal not reached");
        require(!c.claimed, "Funds already claimed");
        
        c.claimed = true;
        payable(c.creator).transfer(c.currentAmount);
        
        emit FundsClaimed(_campaignId, c.creator, c.currentAmount);
    }
    
    function claimRefund(uint256 _campaignId) public {
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp >= c.deadline, "Campaign has not ended yet");
        require(c.currentAmount < c.goal, "Goal was reached, no refunds");
        
        uint256 amount = c.contributions[msg.sender];
        require(amount > 0, "No contribution found");
        
        c.contributions[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit RefundClaimed(_campaignId, msg.sender, amount);
    }
    
    function getCampaignInfo(uint256 _campaignId) public view returns (
        address creator,
        uint256 goal,
        uint256 deadline,
        uint256 currentAmount,
        bool claimed
    ) {
        Campaign storage c = campaigns[_campaignId];
        return (c.creator, c.goal, c.deadline, c.currentAmount, c.claimed);
    }
    
    function getContribution(uint256 _campaignId, address _contributor) public view returns (uint256) {
        return campaigns[_campaignId].contributions[_contributor];
    }
}`,
};

// Add constant for known external libraries
const KNOWN_LIBRARIES = {
  "@openzeppelin/": {
    url: "https://github.com/OpenZeppelin/openzeppelin-contracts",
    docs: "https://docs.openzeppelin.com/contracts",
    description: "OpenZeppelin Contracts is a library for secure smart contract development"
  },
  "hardhat/": {
    url: "https://github.com/NomicFoundation/hardhat",
    docs: "https://hardhat.org/docs",
    description: "Hardhat is a development environment for Ethereum software"
  },
  "@chainlink/": {
    url: "https://github.com/smartcontractkit/chainlink",
    docs: "https://docs.chain.link",
    description: "Chainlink is a decentralized oracle network"
  }
};

// Helper to check if an import is a known library
const isKnownLibrary = (importPath: string): { isKnown: boolean, library?: typeof KNOWN_LIBRARIES[keyof typeof KNOWN_LIBRARIES], prefix?: string } => {
  for (const prefix of Object.keys(KNOWN_LIBRARIES)) {
    if (importPath.startsWith(prefix)) {
      return { isKnown: true, library: KNOWN_LIBRARIES[prefix as keyof typeof KNOWN_LIBRARIES], prefix };
    }
  }
  return { isKnown: false };
};

// Helper to extract contract names from Solidity file
const extractContractNames = (content: string): string[] => {
  const contractMatches = content.match(/contract\s+([a-zA-Z0-9_]+)\s*(\is\s+[a-zA-Z0-9_, ]+\s*)?{/g) || [];
  return contractMatches.map(match => {
    const nameMatch = match.match(/contract\s+([a-zA-Z0-9_]+)/);
    return nameMatch ? nameMatch[1] : '';
  }).filter(name => name);
};

// Helper to parse Solidity imports (all styles)
const parseImports = (content: string): string[] => {
  // Match both standard imports and ES-style imports with destructuring
  const importRegex = /import\s+(?:{[^}]*}\s+from\s+)?["']([^"']+)["']\s*;/g;
  const imports: string[] = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1]) {
      imports.push(match[1]);
    }
  }
  
  return imports;
};

// Enhanced function to analyze imports and detect required versions
const analyzeImports = (content: string): { 
  internalImports: string[], 
  externalImports: Map<string, string[]>,
  requiredVersions: Map<string, string>,
  warnings: string[]
} => {
  const internalImports: string[] = [];
  const externalImports = new Map<string, string[]>();
  const requiredVersions = new Map<string, string>();
  const warnings: string[] = [];
  
  // Extract all imports
  const imports = parseImports(content);
  
  // Check for OpenZeppelin version requirements from usage patterns
  const ownableWithParamRegex = /Ownable\s*\(\s*[^)\s]+\s*\)/;
  const needsOZ5 = ownableWithParamRegex.test(content);
  
  if (needsOZ5) {
    requiredVersions.set('@openzeppelin/', '5.0+');
    warnings.push('Contract uses Ownable with parameter, requiring OpenZeppelin v5.0+');
  }
  
  // Analyze each import
  imports.forEach(importPath => {
    // Check if it's a relative path - these are always internal imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      internalImports.push(importPath);
      return;
    }
    
    // Check if it's a known external library
    const libraryCheck = isKnownLibrary(importPath);
    if (libraryCheck.isKnown && libraryCheck.prefix) {
      // Add to external imports map
      if (!externalImports.has(libraryCheck.prefix)) {
        externalImports.set(libraryCheck.prefix, []);
      }
      externalImports.get(libraryCheck.prefix)!.push(importPath);
      
      // Set required version if detected from code patterns
      if (!requiredVersions.has(libraryCheck.prefix) && libraryCheck.prefix === '@openzeppelin/') {
        if (needsOZ5) {
          requiredVersions.set(libraryCheck.prefix, '5.0+');
        } else {
          requiredVersions.set(libraryCheck.prefix, '4.x');
        }
      }
    } else {
      // This is an internal import
      internalImports.push(importPath);
    }
  });
  
  // Add warnings for specific patterns
  if (externalImports.has('@openzeppelin/') && content.includes('Ownable')) {
    const ozImports = externalImports.get('@openzeppelin/')!;
    const hasOwnableImport = ozImports.some(imp => imp.includes('Ownable.sol'));
    
    if (hasOwnableImport) {
      if (needsOZ5 && !requiredVersions.has('@openzeppelin/')) {
        warnings.push('Contract uses Ownable with constructor parameter. OpenZeppelin v5.0+ required.');
      } else if (!needsOZ5 && content.includes('Ownable()')) {
        warnings.push('Contract uses Ownable without parameters. Compatible with OpenZeppelin v4.x.');
      }
    }
  }
  
  return { internalImports, externalImports, requiredVersions, warnings };
};

// Update the resolveImportPath function to handle external libraries
const resolveImportPath = (importPath: string, currentFileId: string): { resolved: boolean, fileId?: string, isExternal?: boolean, externalInfo?: any } => {
  // Check if it's a known external library
  const libraryCheck = isKnownLibrary(importPath);
  if (libraryCheck.isKnown) {
    return { 
      resolved: false, 
      isExternal: true, 
      externalInfo: {
        ...libraryCheck.library,
        path: importPath,
        prefix: libraryCheck.prefix
      }
    };
  }

  // Handle relative imports
  // ... existing import resolution code ...

  return { resolved: false };
};

// Helper to resolve relative paths in the validation function
const resolveRelativePath = (basePath: string, relativePath: string): string => {
  // If not a relative path, return as is
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    return relativePath;
  }

  // Extract directory from base path
  const baseDir = basePath.includes('/') ? basePath.substring(0, basePath.lastIndexOf('/')) : '';
  if (!baseDir && (relativePath.startsWith('./') || relativePath.startsWith('../'))) {
    // If no base directory but path is relative, just remove the './' prefix
    return relativePath.replace(/^\.\//, '');
  }
  
  // Handle './' paths (same directory)
  if (relativePath.startsWith('./')) {
    return baseDir ? `${baseDir}/${relativePath.substring(2)}` : relativePath.substring(2);
  }
  
  // Handle '../' paths (parent directory)
  if (relativePath.startsWith('../')) {
    const baseParts = baseDir.split('/');
    const relParts = relativePath.split('/');
    
    let dirParts = [...baseParts];
    
    // Process each part of the relative path
    for (let i = 0; i < relParts.length; i++) {
      const part = relParts[i];
      
      if (part === '..') {
        // Go up one directory
        if (dirParts.length > 0) {
          dirParts.pop();
        }
      } else if (part !== '.') {
        // Add subdirectory (skip '.' parts)
        dirParts.push(part);
      }
    }
    
    return dirParts.join('/');
  }
  
  return relativePath;
};

// Add these memoized components near the top of the file (add below imports)
const MemoizedDropdownMenu = React.memo(DropdownMenu);
const MemoizedDropdownMenuTrigger = React.memo(DropdownMenuTrigger);
const MemoizedDropdownMenuContent = React.memo(DropdownMenuContent);
const MemoizedDropdownMenuItem = React.memo(DropdownMenuItem);

// Memoized components for list items
const MemoizedExternalLibraryItem = React.memo(({ lib, onClick }: { lib: string, onClick: (e: React.MouseEvent, lib: string) => void }) => (
  <MemoizedDropdownMenuItem>
    <span className="truncate max-w-[200px]">{lib}</span>
    <Button
      variant="ghost"
      size="sm"
      className="ml-2 h-6 px-1 text-blue-600"
      onClick={(e) => onClick(e, lib)}
    >
      <ExternalLinkIcon className="h-3 w-3" />
    </Button>
  </MemoizedDropdownMenuItem>
));
MemoizedExternalLibraryItem.displayName = 'MemoizedExternalLibraryItem';

const MemoizedMissingImportItem = React.memo(({ importPath }: { importPath: string }) => (
  <MemoizedDropdownMenuItem>
    <span className="truncate max-w-[200px]">{importPath}</span>
  </MemoizedDropdownMenuItem>
));
MemoizedMissingImportItem.displayName = 'MemoizedMissingImportItem';

const MultiFileIDE = forwardRef<MultiFileIDEHandle, MultiFileIDEProps>(({
  onCompile,
  onValidate,
  onEditorChange,
  onDeploy,
  initialValue,
}, ref) => {
  const { toast } = useToast();
  const router = useRouter();
  const {
    files,
    currentFile,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
    updateFileContent,
    selectFile,
  } = useFileSystem();
  
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedContract, setSelectedContract] = useState<{ name: string, fileId: string } | null>(null);
  const [fileImports, setFileImports] = useState<Record<string, string[]>>({});
  const [fileDependencyGraph, setFileDependencyGraph] = useState<Record<string, string[]>>({});
  const [missingImports, setMissingImports] = useState<string[]>([]);
  const initialRenderRef = useRef(true);
  const initialValueAppliedRef = useRef(false);
  
  // Add state for new file/folder dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file');
  const [selectedParentFolder, setSelectedParentFolder] = useState<string | undefined>(undefined);
  
  // Add state for template creation
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateFileName, setTemplateFileName] = useState('');
  const [currentTemplateName, setCurrentTemplateName] = useState<keyof typeof CONTRACT_TEMPLATES | ''>('');
  
  // Add state to track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Add state for external libraries
  const [externalLibraries, setExternalLibraries] = useState<Record<string, { 
    path: string, 
    info: typeof KNOWN_LIBRARIES[keyof typeof KNOWN_LIBRARIES],
    used: boolean 
  }>>({});
  
  // Add state for compilation progress
  const [compilationStatus, setCompilationStatus] = useState<{
    stage: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    progress: number;
    externalLibraries: { name: string; status: 'pending' | 'loading' | 'success' | 'error' }[];
  }>({
    stage: 'idle',
    message: '',
    progress: 0,
    externalLibraries: []
  });
  
  // Before the existing useState declarations, add:
  const [showTreeView, setShowTreeView] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });
  const [currentContractFile, setCurrentContractFile] = useState<string>('');
  const [contractFilesList, setContractFilesList] = useState<string[]>([]);
  
  // Add a ref to track the file explorer scroll position
  const fileExplorerRef = useRef<HTMLDivElement>(null);
  const [fileExplorerScrollTop, setFileExplorerScrollTop] = useState(0);
  
  // Add this right before the useImperativeHandle call
  const [deploymentResult, setDeploymentResult] = useState<{
    address: string;
    success: boolean;
  }>({ address: '', success: false });

  // Function to handle successful deployment
  const handleDeploymentSuccess = useCallback((contractAddress: string) => {
    setDeploymentResult({
      address: contractAddress,
      success: true
    });
  }, []);

  // Only create a default file once when component mounts and no files exist
  useEffect(() => {
    const initializeIDE = async () => {
      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        
        try {
          // Log files for debugging
          console.log("Files at initialization:", files);
          
          // If files array is empty, wait for it to be populated
          if (files.length === 0) {
            console.log("No files yet, waiting for file system to initialize");
            return; // Exit and wait for files to load
          }
          
          // Don't proceed if already initialized
          if (isInitialized) {
            return;
          }
          
          // Find the 'contracts' folder
          const contractsFolder = files.find(item => item.type === 'folder' && item.name === 'contracts');
          console.log("Contracts folder:", contractsFolder);
          
          if (contractsFolder && contractsFolder.children && contractsFolder.children.length > 0) {
            // Look for Token.sol in the contracts folder
            const tokenFile = contractsFolder.children.find(
              file => file.type === 'file' && file.name === 'Token.sol'
            );
            console.log("Token file found:", tokenFile);
            
            // If Token.sol exists, select it
            if (tokenFile) {
              console.log("Selecting Token.sol with ID:", tokenFile.id);
              selectFile(tokenFile.id);
              
              // Extract contract names from Token.sol and set selected contract
              if (tokenFile.content) {
                const contractNames = extractContractNames(tokenFile.content);
                if (contractNames.length > 0) {
                  setSelectedContract({
                    name: contractNames[0],
                    fileId: tokenFile.id
                  });
                }
              }
              
              setIsInitialized(true);
              return;
            }
            
            // If Token.sol does not exist but there are .sol files, select the first one
            const firstSolFile = contractsFolder.children.find(
              file => file.type === 'file' && file.name.endsWith('.sol')
            );
            
            if (firstSolFile) {
              console.log("Selecting first sol file:", firstSolFile.name);
              selectFile(firstSolFile.id);
              
              // Extract contract names from the file and set selected contract
              if (firstSolFile.content) {
                const contractNames = extractContractNames(firstSolFile.content);
                if (contractNames.length > 0) {
                  setSelectedContract({
                    name: contractNames[0],
                    fileId: firstSolFile.id
                  });
                }
              }
              
              setIsInitialized(true);
              return;
            }
          }
          
          // If we've reached this point and already have files but haven't initialized,
          // just mark as initialized without creating a new file
          if (files.length > 0) {
            console.log("Files exist but none selected yet, setting initialized without creating new file");
            setIsInitialized(true);
          }
        } catch (error) {
          console.error("Error initializing IDE:", error);
          toast({
            title: 'Initialization Error',
            description: 'Failed to initialize IDE. Please try again.',
            type: 'error'
          });
        }
      }
    };
    
    initializeIDE();
  }, [files, selectFile, isInitialized, toast]);
  
  // Add a separate effect to handle files changes after initialization
  useEffect(() => {
    // Only run this effect if files change after initialization
    if (!initialRenderRef.current && !isInitialized && files.length > 0) {
      // Find the 'contracts' folder
      const contractsFolder = files.find(item => item.type === 'folder' && item.name === 'contracts');
      
      if (contractsFolder && contractsFolder.children && contractsFolder.children.length > 0) {
        // Look for Token.sol in the contracts folder
        const tokenFile = contractsFolder.children.find(
          file => file.type === 'file' && file.name === 'Token.sol'
        );
        
        // If Token.sol exists, select it
        if (tokenFile) {
          // Only select if it's not already selected
          if (!currentFile || currentFile.id !== tokenFile.id) {
            selectFile(tokenFile.id);
          }
          
          // Only update selected contract if needed
          if (tokenFile.content) {
            const contractNames = extractContractNames(tokenFile.content);
            if (contractNames.length > 0) {
              const shouldUpdateContract = !selectedContract || 
                                        selectedContract.fileId !== tokenFile.id || 
                                        !contractNames.includes(selectedContract.name);
              
              if (shouldUpdateContract) {
                setSelectedContract({
                  name: contractNames[0],
                  fileId: tokenFile.id
                });
              }
            }
          }
          
          setIsInitialized(true);
          return;
        }
      }
      
      // If we didn't find and select a file but we have files, just mark as initialized
      setIsInitialized(true);
    }
  }, [files, selectFile, isInitialized, currentFile, selectedContract]);
  
  // Handle initialValue - only apply once when currentFile is available
  useEffect(() => {
    if (initialValue && currentFile && !initialValueAppliedRef.current) {
      initialValueAppliedRef.current = true;
      updateFileContent(currentFile.id, initialValue);
      
      // Try to extract contract name from initialValue
      const contractNames = extractContractNames(initialValue);
      if (contractNames.length > 0) {
        // Only update if needed
        const shouldUpdateContract = !selectedContract || 
                                    selectedContract.fileId !== currentFile.id || 
                                    !contractNames.includes(selectedContract.name);
        
        if (shouldUpdateContract) {
          setSelectedContract({
            name: contractNames[0],
            fileId: currentFile.id
          });
        }
      }
    }
  }, [initialValue, currentFile, updateFileContent, selectedContract]);
  
  // Update imports and dependency graph when files change
  useEffect(() => {
    // Create a deep copy of externalLibraries to avoid mutation
    const newExternalLibraries = {...externalLibraries};
    let hasChanges = false;
    
    const newFileImports: Record<string, string[]> = {};
    const newDependencyGraph: Record<string, string[]> = {};
    const newMissingImports: string[] = [];
    
    // Extract imports for each file
    files.forEach(file => {
      if (file.type === 'file' && file.content && file.name.endsWith('.sol')) {
        const imports = parseImports(file.content);
        newFileImports[file.id] = imports;
        
        // Check each import
        imports.forEach(importPath => {
          // Check if it's an external library
          const libraryCheck = isKnownLibrary(importPath);
          if (libraryCheck.isKnown && libraryCheck.library && libraryCheck.prefix) {
            const libKey = libraryCheck.prefix;
            if (!newExternalLibraries[libKey]) {
              newExternalLibraries[libKey] = {
                path: importPath,
                info: libraryCheck.library,
                used: true
              };
              hasChanges = true;
            }
            return; // Skip further checks for external libraries
          }
          
          // Check if import exists in our files
          const importExists = files.some(f => 
            f.type === 'file' && (f.name === importPath || f.name === importPath.split('/').pop())
          );
          
          if (!importExists && !newMissingImports.includes(importPath)) {
            // Only add to missing imports if it's not an external library
            if (!Object.keys(KNOWN_LIBRARIES).some(prefix => importPath.startsWith(prefix))) {
              newMissingImports.push(importPath);
            }
          }
          
          // Build dependency graph
          files.forEach(depFile => {
            if (depFile.type === 'file' && 
                (depFile.name === importPath || depFile.name === importPath.split('/').pop())) {
              if (!newDependencyGraph[file.id]) {
                newDependencyGraph[file.id] = [];
              }
              newDependencyGraph[file.id].push(depFile.id);
            }
          });
        });
      }
    });
    
    // Only update state if there are actual changes
    const fileImportsChanged = JSON.stringify(fileImports) !== JSON.stringify(newFileImports);
    const dependencyGraphChanged = JSON.stringify(fileDependencyGraph) !== JSON.stringify(newDependencyGraph);
    const missingImportsChanged = JSON.stringify(missingImports) !== JSON.stringify(newMissingImports);
    
    if (fileImportsChanged) {
      setFileImports(newFileImports);
    }
    
    if (dependencyGraphChanged) {
      setFileDependencyGraph(newDependencyGraph);
    }
    
    if (missingImportsChanged) {
      setMissingImports(newMissingImports);
    }
    
    if (hasChanges) {
      setExternalLibraries(newExternalLibraries);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, externalLibraries]);
  
  // Update contract selection when current file changes
  useEffect(() => {
    if (currentFile && currentFile.content) {
      const contractNames = extractContractNames(currentFile.content);
      if (contractNames.length > 0) {
        // Check if we need to update to avoid infinite loop
        const shouldUpdate = !selectedContract || 
          selectedContract.fileId !== currentFile.id || 
          !contractNames.includes(selectedContract.name);
          
        if (shouldUpdate) {
          setSelectedContract({
            name: contractNames[0],
            fileId: currentFile.id
          });
        }
      }
    }
  }, [currentFile, selectedContract]);
  
  // Memoize the current content to prevent unnecessary re-renders
  const currentContent = useMemo(() => currentFile?.content, [currentFile?.content]);
  
  // Get all contracts from all files
  const allContracts = useMemo(() => {
    const contracts: { name: string, fileId: string }[] = [];
    
    files.forEach(file => {
      if (file.type === 'file' && file.content && file.name.endsWith('.sol')) {
        const contractNames = extractContractNames(file.content);
        contractNames.forEach(name => {
          contracts.push({
            name,
            fileId: file.id
          });
        });
      }
    });
    
    return contracts;
  }, [files]);
  
  // Handle editor change - memoized with proper dependencies
  const handleEditorChange = useCallback((content: string) => {
    if (currentFile && content !== currentFile.content) {
      updateFileContent(currentFile.id, content);
      onEditorChange(content, currentFile.id);
      
      // Update contract names when content changes
      const contractNames = extractContractNames(content);
      if (contractNames.length > 0) {
        // Keep selected contract if it still exists
        if (selectedContract && selectedContract.fileId === currentFile.id) {
          if (!contractNames.includes(selectedContract.name)) {
            setSelectedContract({
              name: contractNames[0],
              fileId: currentFile.id
            });
          }
        } else {
          setSelectedContract({
            name: contractNames[0],
            fileId: currentFile.id
          });
        }
      }
    }
  }, [currentFile, updateFileContent, onEditorChange, selectedContract]);
  
  // Handle file selection - memoized to prevent unnecessary recreations
  const handleFileSelect = useCallback((file: any) => {
    if (file && file.id && (!currentFile || file.id !== currentFile.id)) {
      selectFile(file.id);
      
      // Auto-update the selected contract when a file is selected
      if (file.content) {
        const contractNames = extractContractNames(file.content);
        if (contractNames.length > 0) {
          setSelectedContract({
            name: contractNames[0],
            fileId: file.id
          });
        }
      }
    }
  }, [currentFile, selectFile, setSelectedContract]);
  
  // Select file by ID - exposed in ref
  const selectFileById = useCallback((fileId: string) => {
    selectFile(fileId);
  }, [selectFile]);
  
  // Handle file closure - memoized to prevent unnecessary recreations
  const handleCloseFile = useCallback((fileId: string) => {
    if (currentFile && currentFile.id === fileId) {
      selectFile('');
    }
  }, [currentFile, selectFile]);
  
  // Handle creating a new file
  const handleCreateNewFile = useCallback(() => {
    // Get the currently selected folder from the file explorer or current file's parent
    let parentId = undefined;
    
    if (currentFile) {
      // If we have a current file selected, use its parent folder
      const parent = files.find(item => {
        if (item.type === 'folder' && item.children) {
          return item.children.some(child => child.id === currentFile.id);
        }
        return false;
      });
      
      if (parent) {
        parentId = parent.id;
      }
    }
    
    setNewItemType('file');
    setNewItemName('');
    setSelectedParentFolder(parentId);
    setIsCreateDialogOpen(true);
  }, [currentFile, files]);
  
  // Create a new folder
  const handleCreateNewFolder = useCallback(() => {
    // Get the currently selected folder from the file explorer or current file's parent
    let parentId = undefined;
    
    if (currentFile) {
      // If we have a current file selected, use its parent folder
      const parent = files.find(item => {
        if (item.type === 'folder' && item.children) {
          return item.children.some(child => child.id === currentFile.id);
        }
        return false;
      });
      
      if (parent) {
        parentId = parent.id;
      }
    }
    
    setNewItemType('folder');
    setNewItemName('');
    setSelectedParentFolder(parentId);
    setIsCreateDialogOpen(true);
  }, [currentFile, files]);
  
  // Helper to expand all parent folders of a file
  const expandParentFolders = useCallback((fileId: string) => {
    const expandParents = (items: FileSystemItem[], expanded: Record<string, boolean> = {}): Record<string, boolean> => {
      for (const item of items) {
        if (item.id === fileId) {
          return expanded;
        }
        
        if (item.type === 'folder' && item.children) {
          // Check if the file is in this folder's children
          const directChild = item.children.some(child => child.id === fileId);
          
          if (directChild) {
            // If found directly, expand this folder
            expanded[item.id] = true;
            return expanded;
          }
          
          // Otherwise recursively check children
          const childResult = expandParents(item.children, expanded);
          if (Object.keys(childResult).length > Object.keys(expanded).length) {
            // If child search found something, expand this folder too
            expanded[item.id] = true;
            return childResult;
          }
        }
      }
      return expanded;
    };
    
    const newExpandedFolders = expandParents(files, {...expandedFolders});
    setExpandedFolders(newExpandedFolders);
  }, [files, expandedFolders]);
  
  // Handle creating a file or folder
  const handleCreateItem = useCallback(() => {
    if (!newItemName.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        type: 'error'
      });
      return;
    }

    // Validate file/folder name
    const invalidChars = /[\<\>\:\"\\\/\|\?\*\u0000-\u001F]/g; // Using unicode escape sequences instead of hex
    if (invalidChars.test(newItemName)) {
      toast({
        title: 'Error',
        description: 'Name contains invalid characters',
        type: 'error'
      });
      return;
    }

    // Check if name already exists in the selected location
    const parentFolder = selectedParentFolder 
      ? files.find(f => f.id === selectedParentFolder) 
      : { children: files };

    if (parentFolder && parentFolder.children) {
      const exists = parentFolder.children.some(
        item => item.name.toLowerCase() === newItemName.toLowerCase()
      );

      if (exists) {
        toast({
          title: 'Error',
          description: `A ${newItemType} with this name already exists in this location`,
          type: 'error'
        });
        return;
      }
    }
    
    // If creating in a folder, expand it
    if (selectedParentFolder) {
      setExpandedFolders(prev => ({
        ...prev,
        [selectedParentFolder]: true
      }));
    }
    
    if (newItemType === 'file') {
      // Add .sol extension if not present and it's a Solidity file
      const fileName = newItemName.toLowerCase().endsWith('.sol') 
        ? newItemName 
        : `${newItemName}.sol`;

      createFile(fileName, selectedParentFolder);
      
      // Select the new file once created
      setTimeout(() => {
        // Find the newly created file to select it
        const findNewFile = (items: FileSystemItem[]): string | null => {
          for (const item of items) {
            if (item.type === 'file' && item.name === fileName && 
                (selectedParentFolder ? item.parent === selectedParentFolder : !item.parent)) {
              return item.id;
            }
            if (item.type === 'folder' && item.children) {
              const found = findNewFile(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const newFileId = findNewFile(files);
        if (newFileId) {
          selectFile(newFileId);
          // Expand all parent folders of the new file
          expandParentFolders(newFileId);
        }
      }, 100);
    } else {
      createFolder(newItemName, selectedParentFolder);
      
      // Expand the newly created folder
      setTimeout(() => {
        const findNewFolder = (items: FileSystemItem[]): string | null => {
          for (const item of items) {
            if (item.type === 'folder' && item.name === newItemName && 
                (selectedParentFolder ? item.parent === selectedParentFolder : !item.parent)) {
              return item.id;
            }
            if (item.type === 'folder' && item.children) {
              const found = findNewFolder(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const newFolderId = findNewFolder(files);
        if (newFolderId) {
          setExpandedFolders(prev => ({
            ...prev,
            [newFolderId]: true
          }));
        }
      }, 100);
    }
    
    setIsCreateDialogOpen(false);
    
    toast({
      title: 'Success',
      description: `${newItemType === 'file' ? 'File' : 'Folder'} created successfully`,
      type: 'success'
    });
  }, [newItemName, newItemType, selectedParentFolder, createFile, createFolder, selectFile, files, expandParentFolders, toast]);
  
  // Handle folder selection in the dialog
  const handleParentFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedParentFolder(e.target.value === "root" ? undefined : e.target.value);
  }, []);
  
  // Handle creating a template contract
  const handleCreateFromTemplate = useCallback((templateName: keyof typeof CONTRACT_TEMPLATES) => {
    const template = CONTRACT_TEMPLATES[templateName];
    if (!template) return;
    
    // Set up dialog for template creation
    setTemplateFileName(`${templateName}-contract`);
    setCurrentTemplateName(templateName);
    setSelectedParentFolder(undefined);
    setIsTemplateDialogOpen(true);
    
    // Hide templates panel
    setShowTemplates(false);
  }, []);
  
  // Handle template creation confirmation
  const handleCreateTemplate = useCallback(() => {
    if (!templateFileName.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        type: 'error'
      });
      return;
    }
    
    if (!currentTemplateName) {
      toast({
        title: 'Error',
        description: 'Invalid template selected',
        type: 'error'
      });
      return;
    }
    
    // If creating in a folder, expand it
    if (selectedParentFolder) {
      setExpandedFolders(prev => ({
        ...prev,
        [selectedParentFolder]: true
      }));
    }
    
    // Add .sol extension if not present
    const fileName = templateFileName.endsWith('.sol') ? templateFileName : `${templateFileName}.sol`;
    const templateCode = CONTRACT_TEMPLATES[currentTemplateName];
    
    // Create the file with default content first
    createFile(fileName, selectedParentFolder);
    
    // Find the file and update its content with the template
    setTimeout(() => {
      // Find the newly created file
      const findNewFile = (items: FileSystemItem[]): FileSystemItem | null => {
        for (const item of items) {
          if (item.type === 'file' && item.name === fileName && 
              (selectedParentFolder ? item.parent === selectedParentFolder : !item.parent)) {
            return item;
          }
          if (item.type === 'folder' && item.children) {
            const found = findNewFile(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const newFile = findNewFile(files);
      if (newFile) {
        // Update the file content with the template code
        updateFileContent(newFile.id, templateCode);
        selectFile(newFile.id);
      }
      
      toast({
        title: 'Template Created',
        description: `Created ${fileName} from template`,
        type: 'success'
      });
    }, 100);
    
    setIsTemplateDialogOpen(false);
  }, [templateFileName, currentTemplateName, selectedParentFolder, createFile, updateFileContent, selectFile, files, toast]);
  
  // Helper function to find a file by name
  const findFileByName = useCallback((name: string) => {
    const findInItems = (items: FileSystemItem[]): FileSystemItem | undefined => {
      for (const item of items) {
        if (item.type === 'file' && item.name === name) {
          return item;
        } else if (item.type === 'folder' && item.children) {
          const found = findInItems(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    
    return findInItems(files);
  }, [files]);
  
  // Handle contract selection
  const handleContractSelect = useCallback((file: string) => {
    setCurrentContractFile(file);
    // Find the file in the file tree
    const fileObj = findFileByName(file);
    if (fileObj) {
      handleFileSelect(fileObj);
    }
  }, [handleFileSelect, findFileByName]);
  
  // Add a useEffect to update the contracts list when files change
  useEffect(() => {
    // Build contract files list
    const contractFiles: string[] = [];
    
    const findSolFiles = (items: FileSystemItem[]) => {
      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.sol')) {
          contractFiles.push(item.name);
        } else if (item.type === 'folder' && item.children) {
          findSolFiles(item.children);
        }
      }
    };
    
    findSolFiles(files);
    setContractFilesList(contractFiles);
    
    // Auto-select first contract if none selected
    if (contractFiles.length > 0 && !currentContractFile) {
      setCurrentContractFile(contractFiles[0]);
    }
  }, [files, currentContractFile]);
  
  // Validate current file
  const validateCurrentFile = useCallback(async () => {
    if (!currentFile || !currentFile.content) return null;
    
    try {
      // Run validation service on the content
      // This would call the API and process the results
      const results = { 
        errors: [], 
        warnings: [], 
        securityScore: 100 
      };
      
      // Update local validation results for this file
      setValidationResults(prev => ({
        ...prev,
        [currentFile.id]: results
      }));
      
      // Call parent component's validate handler
      if (onValidate) {
        onValidate(results, currentFile.id);
      }
      
      return results;
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      });
      return null;
    }
  }, [currentFile, onValidate, toast]);
  
  // Compile with dependencies
  const compileCurrentFile = useCallback(async () => {
    if (!currentFile || !currentFile.content) return null;
    
    try {
      // Reset compilation status
      setCompilationStatus({
        stage: 'loading',
        message: 'Analyzing dependencies...',
        progress: 10,
        externalLibraries: []
      });

      // Collect all dependencies recursively
      const filesToCompile: Record<string, string> = {};
      const processedFiles: Set<string> = new Set();
      const externalLibsUsed: Map<string, Set<string>> = new Map();
      let hasCircularDependency = false;
      const dependencyChain: string[] = [];
      
      // Helper function to get full path of a file based on ID
      const getFullPath = (fileId: string, items = files): string => {
        const findFileWithPath = (id: string, items: any[], currentPath: string = ''): string => {
          for (const item of items) {
            if (item.id === id) {
              return currentPath ? `${currentPath}/${item.name}` : item.name;
            }
            
            if (item.type === 'folder' && item.children) {
              const path = findFileWithPath(id, item.children, currentPath ? `${currentPath}/${item.name}` : item.name);
              if (path) return path;
            }
          }
          return '';
        };
        
        return findFileWithPath(fileId, items);
      };

      // Recursively collect all dependencies
      const collectDependencies = (fileId: string, chain: string[] = []) => {
        // Check for circular dependencies
        if (chain.includes(fileId)) {
          hasCircularDependency = true;
          console.error(`Circular dependency detected: ${[...chain, fileId].join(' -> ')}`);
          return;
        }
        
        // Skip already processed files
        if (processedFiles.has(fileId)) return;
        processedFiles.add(fileId);
        
        const newChain = [...chain, fileId];
        dependencyChain.push(fileId);
        
        const file = files.flatMap(item => 
          item.type === 'folder' && item.children 
            ? item.children.filter(child => child.type === 'file')
            : item.type === 'file' ? [item] : []
        ).find(f => f.id === fileId);
        
        if (!file || !file.content) return;
        
        // Get file path for compilation
        const filePath = getFullPath(fileId);
        if (!filePath) return;
        
        // Add this file to the compilation set
        filesToCompile[filePath] = file.content;
        
        // Extract imports from this file
        const imports = parseImports(file.content);
        if (!imports.length) return;
        
        // Track all external libraries used with specific imports
        imports.forEach(importPath => {
          const libraryCheck = isKnownLibrary(importPath);
          if (libraryCheck.isKnown && libraryCheck.prefix) {
            if (!externalLibsUsed.has(libraryCheck.prefix)) {
              externalLibsUsed.set(libraryCheck.prefix, new Set());
            }
            externalLibsUsed.get(libraryCheck.prefix)!.add(importPath);
          }
        });
        
        // Process each import to find internal dependencies
        imports.forEach(importPath => {
          // Skip external libraries as they'll be handled by the backend
          const libraryCheck = isKnownLibrary(importPath);
          if (libraryCheck.isKnown) {
            return; // Skip processing external libraries
          }
          
          // Handle relative imports
          let targetPath = importPath;
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            // Use the same resolveRelativePath function for consistency
            targetPath = resolveRelativePath(filePath, importPath);
          }
          
          // Find the imported file by exact path match
          const importedFile = files.flatMap(item => 
            item.type === 'folder' && item.children 
              ? item.children.filter(child => child.type === 'file')
              : item.type === 'file' ? [item] : []
          ).find(f => {
            const path = getFullPath(f.id);
            return path === targetPath || path === `${targetPath}.sol`;
          });
          
          if (importedFile) {
            collectDependencies(importedFile.id, newChain);
          } else {
            // If not found by path, try by filename
            const fileName = importPath.split('/').pop() || '';
            const fileByName = files.flatMap(item => 
              item.type === 'folder' && item.children 
                ? item.children.filter(child => child.type === 'file')
                : item.type === 'file' ? [item] : []
            ).find(f => f.name === fileName || f.name === `${fileName}.sol`);
            
            if (fileByName) {
              collectDependencies(fileByName.id, newChain);
            }
          }
        });
      };
      
      // Start with the current file
      collectDependencies(currentFile.id);
      
      // If circular dependency detected, show warning but continue compilation
      if (hasCircularDependency) {
        toast({
          title: 'Warning',
          description: 'Circular dependency detected in imports. This may cause issues.',
          type: 'warning'
        });
      }
      
      // Format external libraries for the API
      const externalLibrariesArray: string[] = [];
      let externalLibCount = 0;
      
      // Count total external library imports
      externalLibsUsed.forEach((imports, prefix) => {
        externalLibCount += imports.size;
      });
      
      // Convert map to array format for API
      externalLibsUsed.forEach((imports, prefix) => {
        imports.forEach(importPath => {
          externalLibrariesArray.push(importPath);
        });
        
        // Update externalLibraries state to mark libraries as used
        setExternalLibraries(prev => {
          const updated = { ...prev };
          if (!updated[prefix]) {
            const libInfo = Object.entries(KNOWN_LIBRARIES).find(([k]) => k === prefix)?.[1];
            if (libInfo) {
              updated[prefix] = {
                path: Array.from(imports)[0], // Use first import as example path
                info: libInfo,
                used: true
              };
            }
          } else {
            updated[prefix].used = true;
          }
          return updated;
        });
      });
      
      // Log compilation details
      console.log('Files to compile:', Object.keys(filesToCompile));
      console.log('External libraries used:', externalLibrariesArray);
      
      // Update compilation status with external libraries
      setCompilationStatus(prev => ({
        ...prev,
        message: `Preparing compilation with ${Object.keys(filesToCompile).length} files and ${externalLibrariesArray.length} external imports...`,
        progress: 30,
        externalLibraries: Array.from(externalLibsUsed.keys()).map(lib => ({
          name: lib,
          status: 'pending'
        }))
      }));
      
      // For debugging - list dependency chain
      console.log('Dependency chain:', dependencyChain.map(id => {
        const file = files.flatMap(item => 
          item.type === 'folder' && item.children 
            ? item.children.filter(child => child.type === 'file')
            : item.type === 'file' ? [item] : []
        ).find(f => f.id === id);
        return file ? file.name : id;
      }));
      
      // Update status before compilation
      setCompilationStatus(prev => ({
        ...prev,
        message: 'Starting compilation...',
        progress: 40
      }));

      // Use multi-file compilation if we have dependencies
      let result;
      if (Object.keys(filesToCompile).length > 1) {
        // We have dependencies, use the multi-file compilation
        const filePath = getFullPath(currentFile.id);
        const externalData = externalLibrariesArray.length > 0 
          ? { externalLibraries: externalLibrariesArray } 
          : undefined;
        
        // Update compilation status for external libraries
        if (externalLibrariesArray.length > 0) {
          setCompilationStatus(prev => ({
            ...prev,
            message: `Compiling with ${Object.keys(filesToCompile).length} files and ${externalLibrariesArray.length} external libraries...`,
            progress: 60,
            externalLibraries: prev.externalLibraries.map(lib => ({
              ...lib,
              status: 'loading'
            }))
          }));
        } else {
          setCompilationStatus(prev => ({
            ...prev,
            message: `Compiling ${Object.keys(filesToCompile).length} files...`,
            progress: 60
          }));
        }
        
        // Start actual compilation
        result = await compileMultipleFiles(filesToCompile, filePath, externalData);
        
        // Add helpful information to toast
        toast({
          title: 'Compilation Successful',
          description: `Compiled ${Object.keys(filesToCompile).length} files with dependencies${
            externalLibrariesArray.length ? ` and ${externalLibrariesArray.length} external libraries` : ''
          }`,
          type: 'success'
        });
      } else {
        // Single file compilation
        const externalData = externalLibrariesArray.length > 0 
          ? { externalLibraries: externalLibrariesArray } 
          : undefined;
          
        // Update status
        if (externalLibrariesArray.length > 0) {
          setCompilationStatus(prev => ({
            ...prev,
            message: `Compiling with ${externalLibrariesArray.length} external libraries...`,
            progress: 70,
            externalLibraries: prev.externalLibraries.map(lib => ({
              ...lib,
              status: 'loading'
            }))
          }));
        } else {
          setCompilationStatus(prev => ({
            ...prev,
            message: 'Compiling contract...',
            progress: 70
          }));
        }
          
        result = await compileContract(currentFile.content, externalData);
        
        toast({
          title: 'Compilation Successful',
          description: externalLibrariesArray.length 
            ? `Compiled with ${externalLibrariesArray.length} external libraries` 
            : 'Compilation successful',
          type: 'success'
        });
      }
      
      // Add external libraries to the result
      result.externalLibraries = externalLibrariesArray;
      
      // Update status to success
      setCompilationStatus({
        stage: 'success',
        message: 'Compilation successful',
        progress: 100,
        externalLibraries: Array.from(externalLibsUsed.keys()).map(lib => ({
          name: lib,
          status: 'success'
        }))
      });
      
      // Call parent handler
      onCompile(result, currentFile.id);
      
      // Return the result (important for deployment)
      return result;
    } catch (error) {
      console.error('Compilation error:', error);
      
      // Enhanced error handling with detailed messages
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let additionalHelp = '';
      
      // Check for common compilation errors
      if (errorMessage.includes('Source file requires different compiler version')) {
        errorMessage = 'Compiler version mismatch. Please check your pragma directive.';
      } else if (errorMessage.includes('ParserError')) {
        errorMessage = 'Syntax error in contract code. Please check your syntax.';
      } else if (errorMessage.includes('DeclarationError')) {
        errorMessage = 'Declaration error - identifier may not be declared or might be declared multiple times.';
      } else if (errorMessage.includes('not found: File not found')) {
        errorMessage = 'Import not found. Check your import paths.';
      } else if (errorMessage.includes('Wrong argument count for modifier invocation')) {
        // Special handling for Ownable constructor issues
        if (errorMessage.includes('Ownable(')) {
          // Check for OpenZeppelin version from error details
          if (errorMessage.includes('expected 0')) {
            errorMessage = 'Wrong argument count for Ownable constructor. You are using OpenZeppelin v4.x but providing constructor arguments.';
            additionalHelp = 'OpenZeppelin v5.0+ is required for Ownable with arguments. Either update your import to use v5.0+ or remove the constructor arguments.';
          } else if (errorMessage.includes('expected 1')) {
            errorMessage = 'Wrong argument count for Ownable constructor. You need to provide an address argument for OpenZeppelin v5.x.';
            additionalHelp = 'When using OpenZeppelin v5.0+, you must pass an initial owner address to the Ownable constructor.';
          } else {
            errorMessage = 'Wrong argument count for Ownable constructor. Check that you are using the correct OpenZeppelin version for your constructor invocation.';
          }
        }
      } else if (errorMessage.includes('External imports not available')) {
        errorMessage = 'Failed to fetch external libraries. Please check your internet connection and try again.';
      }
      
      // Update status to error with detailed information
      setCompilationStatus({
        stage: 'error',
        message: additionalHelp ? `${errorMessage}\n\n${additionalHelp}` : errorMessage,
        progress: 0,
        externalLibraries: compilationStatus.externalLibraries.map(lib => ({
          ...lib,
          status: 'error'
        }))
      });
      
      toast({
        title: 'Compilation Error',
        description: errorMessage,
        type: 'error'
      });
      return null;
    }
  }, [currentFile, onCompile, toast, files, setExternalLibraries, compilationStatus.externalLibraries]);
  
  // Memoize getAllFiles to get all file contents (for multi-file compilation)
  const getAllFiles = useCallback(() => {
    return files;
  }, [files]);
  
  // Memoize getCurrentFileContent to prevent unnecessary rerenders
  const getCurrentFileContent = useCallback(() => {
    return currentContent;
  }, [currentContent]);
  
  // Memoize getSelectedContract
  const getSelectedContract = useCallback(() => {
    return selectedContract;
  }, [selectedContract]);
  
  // Expose functions to parent component with proper dependency array
  useImperativeHandle(ref, 
    () => ({
      validateCurrentFile,
      compileCurrentFile,
      getCurrentFileContent,
      getSelectedContract,
      getAllFiles,
      selectFileById,
      handleDeploymentSuccess // Export the new function
    }), 
    [validateCurrentFile, compileCurrentFile, getCurrentFileContent, getSelectedContract, getAllFiles, selectFileById, handleDeploymentSuccess]
  );

  // Memoize the file explorer to prevent recreating on each render
  const fileExplorerComponent = useMemo(() => (
    <FileExplorer
      files={files}
      currentFile={currentFile}
      onFileSelect={handleFileSelect}
      onCreateFile={createFile}
      onCreateFolder={createFolder}
      onRenameItem={renameItem}
      onDeleteItem={deleteItem}
    />
  ), [files, currentFile, handleFileSelect, createFile, createFolder, renameItem, deleteItem]);
  
  // Memoize editor component to prevent unnecessary re-renders  
  const editorComponent = useMemo(() => (
    currentFile ? (
      <SolidityEditor
        value={currentFile.content || ''}
        onChange={handleEditorChange}
        validationResults={validationResults[currentFile.id]}
        lintSolidityCode={() => []}
      />
    ) : (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>No file selected</p>
          <p className="text-sm mt-2">Select a file from the explorer or create a new one</p>
        </div>
      </div>
    )
  ), [currentFile, handleEditorChange, validationResults]);
  
  // Memoize tabs manager component
  const tabsManagerComponent = useMemo(() => (
    <TabsManager
      files={files}
      currentFile={currentFile}
      onSelectFile={handleFileSelect}
      onCloseFile={handleCloseFile}
    />
  ), [files, currentFile, handleFileSelect, handleCloseFile]);
  
  // Templates panel - memoize the entire ScrollArea content to prevent re-renders
  const templatesContent = useMemo(() => (
    <div className="p-2 space-y-2">
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start" 
        onClick={() => handleCreateFromTemplate('erc20')}
      >
        <div className="text-left">
          <div className="font-medium">ERC-20 Token</div>
          <div className="text-xs text-muted-foreground">Standard ERC-20 implementation</div>
        </div>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start" 
        onClick={() => handleCreateFromTemplate('nft')}
      >
        <div className="text-left">
          <div className="font-medium">Simple NFT</div>
          <div className="text-xs text-muted-foreground">Basic NFT implementation</div>
        </div>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start" 
        onClick={() => handleCreateFromTemplate('dao')}
      >
        <div className="text-left">
          <div className="font-medium">DAO Contract</div>
          <div className="text-xs text-muted-foreground">Simple DAO with voting</div>
        </div>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start" 
        onClick={() => handleCreateFromTemplate('crowdfunding')}
      >
        <div className="text-left">
          <div className="font-medium">Crowdfunding</div>
          <div className="text-xs text-muted-foreground">Crowdfunding campaign contract</div>
        </div>
      </Button>
    </div>
  ), [handleCreateFromTemplate]);

  const templatesPanel = useMemo(() => (
    showTemplates && (
      <div className="absolute z-10 top-12 right-1 w-64 bg-background border border-border rounded-md shadow-lg p-2">
        <div className="text-sm font-medium p-2 border-b">Select Template</div>
        <ScrollArea className="h-64">
          {templatesContent}
        </ScrollArea>
      </div>
    )
  ), [showTemplates, templatesContent]);
  
  // Add an effect to directly select Token.sol as soon as files are loaded
  useEffect(() => {
    if (files.length > 0 && !currentFile) {
      // First, try to find the contracts folder
      const contractsFolder = files.find(item => item.type === 'folder' && item.name === 'contracts');
      
      if (contractsFolder && contractsFolder.children && contractsFolder.children.length > 0) {
        // Find Token.sol in the contracts folder
        const tokenFile = contractsFolder.children.find(
          file => file.type === 'file' && file.name === 'Token.sol'
        );
        
        // If found, select it
        if (tokenFile) {
          console.log("Auto-selecting Token.sol with ID:", tokenFile.id);
          selectFile(tokenFile.id);
          
          // Extract contract names if needed
          if (tokenFile.content) {
            const contractNames = extractContractNames(tokenFile.content);
            if (contractNames.length > 0) {
              setSelectedContract({
                name: contractNames[0],
                fileId: tokenFile.id
              });
            }
          }
        }
      }
    }
  }, [files, currentFile, selectFile]);
  
  // Recursively get all folders for dropdown selection
  const getAllFolders = useMemo(() => {
    const result: { id: string, name: string, path: string }[] = [];
    
    const traverseFolder = (items: FileSystemItem[], path: string = '') => {
      items.forEach(item => {
        if (item.type === 'folder') {
          const itemPath = path ? `${path}/${item.name}` : item.name;
          result.push({ id: item.id, name: item.name, path: itemPath });
          
          if (item.children) {
            traverseFolder(item.children, itemPath);
          }
        }
      });
    };
    
    traverseFolder(files);
    return result;
  }, [files]);
  
  // Add a function to open documentation
  const openLibraryDocs = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);
  
  // Add the missing functions for UI handling before the render part:
  const handleToggleTreeView = useCallback(() => {
    if (showTreeView && fileExplorerRef.current) {
      // Save scroll position before hiding
      setFileExplorerScrollTop(fileExplorerRef.current.scrollTop);
    }
    
    // Toggle visibility state
    setShowTreeView(prev => !prev);
    
    // Force layout recalculation to ensure consistent dimensions
    setTimeout(() => {
      // Restore scroll position when showing again
      if (!showTreeView && fileExplorerRef.current) {
        fileExplorerRef.current.scrollTop = fileExplorerScrollTop;
      }
      
      // Force layout stability by triggering reflow
      document.body.style.minHeight = document.body.offsetHeight + 'px';
      setTimeout(() => {
        document.body.style.minHeight = '';
      }, 50);
    }, 50);
  }, [showTreeView, fileExplorerScrollTop]);

  const handleCreateNew = useCallback((type: 'file' | 'folder') => {
    // Get the currently selected folder from the file explorer or current file's parent
    let parentId = undefined;
    
    if (currentFile) {
      // If we have a current file selected, use its parent folder
      const parent = files.find(item => {
        if (item.type === 'folder' && item.children) {
          return item.children.some(child => child.id === currentFile.id);
        }
        return false;
      });
      
      if (parent) {
        parentId = parent.id;
      }
    }
    
    setNewItemType(type);
    setNewItemName('');
    setSelectedParentFolder(parentId);
    setIsCreateDialogOpen(true);
  }, [currentFile, files]);

  // Add a function to convert the externalLibraries object to an array of strings
  // Add this function before the render return
  const getExternalLibrariesArray = useCallback((): string[] => {
    return Object.entries(externalLibraries)
      .filter(([_, libInfo]) => libInfo.used)
      .map(([prefix, _]) => prefix);
  }, [externalLibraries]);

  // Memoize the libraries array to prevent recalculation on each render
  const externalLibrariesArray = useMemo(() => {
    return Object.entries(externalLibraries)
      .filter(([_, libInfo]) => libInfo.used)
      .map(([prefix, _]) => prefix);
  }, [externalLibraries]);
  const externalLibrariesCount = useMemo(() => externalLibrariesArray.length, [externalLibrariesArray]);

  // Memoize the library documentation click handler
  const handleLibraryDocsClick = useCallback((e: React.MouseEvent, lib: string) => {
    e.stopPropagation();
    const libPath = lib.replace('@openzeppelin/contracts/', '').replace('.sol', '');
    window.open(`https://docs.openzeppelin.com/contracts/5.x/api/${libPath}`, '_blank');
  }, []);

  // Memoize the contract selection click handler to prevent recreating functions on each render
  const handleContractSelectItem = useCallback((file: string) => {
    handleContractSelect(file);
  }, [handleContractSelect]);

  // Memoize handlers for new file/folder menu items
  const handleCreateNewFileClick = useCallback(() => {
    handleCreateNew('file');
  }, [handleCreateNew]);

  const handleCreateNewFolderClick = useCallback(() => {
    handleCreateNew('folder');
  }, [handleCreateNew]);

  // Memoize the contract files list to prevent recreating items on each render
  const contractFilesListItems = useMemo(() => (
    contractFilesList.map(file => (
      <MemoizedDropdownMenuItem key={file} onClick={() => handleContractSelectItem(file)}>
        {file}
      </MemoizedDropdownMenuItem>
    ))
  ), [contractFilesList, handleContractSelectItem]);

  // Memoize dropdown button elements to prevent unnecessary re-renders
  const newButton = useMemo(() => (
    <Button variant="outline" size="sm" className="flex items-center gap-1">
      <FilePlus className="h-4 w-4" />
      <span className="hidden sm:inline">New</span>
    </Button>
  ), []);

  const contractButton = useMemo(() => (
    <Button variant="outline" size="sm" className="flex items-center gap-1 max-w-[130px] sm:max-w-[220px] truncate">
      {currentContractFile || 'Select Contract'}
      <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
    </Button>
  ), [currentContractFile]);

  const libraryButton = useMemo(() => (
    <Button variant="outline" size="sm" className="flex items-center border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">
      <span className="mr-1">{externalLibrariesCount}</span>
      <span className="hidden sm:inline">Library{externalLibrariesCount !== 1 ? 'ies' : ''}</span>
      <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
    </Button>
  ), [externalLibrariesCount]);

  const missingImportsButton = useMemo(() => (
    <Button variant="outline" size="sm" className="flex items-center border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">
      <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
      <span className="hidden sm:inline">Missing</span> ({missingImports.length})
    </Button>
  ), [missingImports.length]);

  // Restore scroll position on file explorer when it becomes visible
  useEffect(() => {
    if (showTreeView && fileExplorerRef.current) {
      fileExplorerRef.current.scrollTop = fileExplorerScrollTop;
    }
  }, [showTreeView, fileExplorerScrollTop]);

  // Add a resize observer to maintain consistent dimensions
  useEffect(() => {
    const handleResize = () => {
      // Force a layout recalculation to maintain consistent dimensions
      if (document.body.style.display === 'none') return;
      document.body.style.display = 'none';
      void document.body.offsetHeight; // Trigger a reflow
      document.body.style.display = '';
    };

    // Add resize event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Add an effect to ensure consistent layout on mount and resize
  useEffect(() => {
    // Force layout calculation on component mount
    const timer = setTimeout(() => {
      // Ensure dimensions are stable
      if (fileExplorerRef.current && showTreeView) {
        // Force width calculation to be exact
        const containerWidth = fileExplorerRef.current.parentElement?.clientWidth || 256;
        if (containerWidth !== 256) {
          console.log('Forcing sidebar width to exact 256px');
          const parent = fileExplorerRef.current.parentElement;
          if (parent) {
            parent.style.width = '256px';
          }
        }
      }
    }, 100);
    
    // Create a resize observer to maintain consistent dimensions
    const resizeObserver = new ResizeObserver(() => {
      if (fileExplorerRef.current && showTreeView) {
        // Ensure the entire layout remains stable during resize
        const editorContainer = document.querySelector('[data-editor-container]');
        if (editorContainer instanceof HTMLElement) {
          editorContainer.style.width = `calc(100% - 256px)`;
        }
      }
    });
    
    // Observe the parent container
    const parentContainer = document.querySelector('[data-ide-container]');
    if (parentContainer) {
      resizeObserver.observe(parentContainer);
    }
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [showTreeView]);

  // Update the main container to have stable dimensions and better responsiveness
  return (
    <div className="flex flex-col h-full" data-ide-container>
      {/* IDE Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-background py-2 px-3 border-b">
        {/* Left section */}
        <div className="flex items-center gap-1 mb-1 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handleToggleTreeView} className="flex items-center gap-1">
            <FilesIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{showTreeView ? 'Hide Files' : 'Show Files'}</span>
          </Button>

          <MemoizedDropdownMenu>
            <MemoizedDropdownMenuTrigger asChild>
              {newButton}
            </MemoizedDropdownMenuTrigger>
            <MemoizedDropdownMenuContent>
              <MemoizedDropdownMenuItem onClick={handleCreateNewFileClick}>
                <FileCode className="h-4 w-4 mr-2" />
                New File
              </MemoizedDropdownMenuItem>
              <MemoizedDropdownMenuItem onClick={handleCreateNewFolderClick}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </MemoizedDropdownMenuItem>
            </MemoizedDropdownMenuContent>
          </MemoizedDropdownMenu>
        </div>
        
        {/* Center section - Contract and Libraries */}
        <div className="flex flex-wrap items-center gap-2 flex-grow justify-center">
          {/* Current Contract Selection */}
          <div className="flex items-center gap-1 mb-1 sm:mb-0">
            <span className="text-xs font-medium hidden sm:inline">Contract:</span>
            <MemoizedDropdownMenu>
              <MemoizedDropdownMenuTrigger asChild>
                {contractButton}
              </MemoizedDropdownMenuTrigger>
              <MemoizedDropdownMenuContent align="center" className="max-h-[300px]">
                <ScrollArea className="max-h-[300px]">
                  {contractFilesListItems}
                </ScrollArea>
              </MemoizedDropdownMenuContent>
            </MemoizedDropdownMenu>
          </div>
          
          {/* External Libraries Section - Made more visible */}
          {externalLibrariesCount > 0 && (
            <div className="flex items-center gap-1 ml-0 sm:ml-2 mb-1 sm:mb-0">
              <span className="text-xs font-medium hidden sm:inline">Libraries:</span>
              <MemoizedDropdownMenu>
                <MemoizedDropdownMenuTrigger asChild>
                  {libraryButton}
                </MemoizedDropdownMenuTrigger>
                <MemoizedDropdownMenuContent>
                  {externalLibrariesArray.map((lib, index) => (
                    <MemoizedExternalLibraryItem key={index} lib={lib} onClick={handleLibraryDocsClick} />
                  ))}
                </MemoizedDropdownMenuContent>
              </MemoizedDropdownMenu>
            </div>
          )}
        </div>
        
        {/* Right section */}
        <div className="flex items-center gap-1 mb-1 sm:mb-0 ml-auto">
          {missingImports.length > 0 && (
            <MemoizedDropdownMenu>
              <MemoizedDropdownMenuTrigger asChild>
                {missingImportsButton}
              </MemoizedDropdownMenuTrigger>
              <MemoizedDropdownMenuContent>
                {missingImports.map((importPath) => (
                  <MemoizedMissingImportItem key={importPath} importPath={importPath} />
                ))}
              </MemoizedDropdownMenuContent>
            </MemoizedDropdownMenu>
          )}
          
          <Button variant="outline" size="sm" onClick={() => validateCurrentFile()} className="flex items-center gap-1">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Validate</span>
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => compileCurrentFile()} className="flex items-center gap-1">
            <CodeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Compile</span>
          </Button>
          
          {onDeploy && (
            <Button variant="default" size="sm" onClick={onDeploy} className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <FileUpIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Deploy</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Compilation Status Indicator */}
      {compilationStatus.stage !== 'idle' && (
        <div className={`p-2 text-sm ${
          compilationStatus.stage === 'loading' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
          compilationStatus.stage === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          <div className="flex justify-between items-center">
            <span className="font-medium text-xs sm:text-sm line-clamp-2">{compilationStatus.message}</span>
            {compilationStatus.stage === 'loading' && (
              <div className="w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-2 flex-shrink-0">
                <div 
                  className="bg-amber-500 dark:bg-amber-400 h-2 rounded-full transition-all"
                  style={{ width: `${compilationStatus.progress}%` }} 
                />
              </div>
            )}
          </div>
          
          {compilationStatus.externalLibraries.length > 0 && (
            <div className="mt-1 text-xs">
              <div>External libraries:</div>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                {compilationStatus.externalLibraries.map(lib => (
                  <span 
                    key={lib.name}
                    className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ${
                      lib.status === 'pending' ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      lib.status === 'loading' ? 'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      lib.status === 'success' ? 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {lib.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {compilationStatus.stage === 'error' && (
            <div className="mt-2 text-xs">
              <div className="font-medium">Error details:</div>
              <pre className="mt-1 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded overflow-auto whitespace-pre-wrap max-h-[80px] sm:max-h-[100px] text-[10px] sm:text-xs">
                {compilationStatus.message}
              </pre>
              {compilationStatus.message.includes('Ownable') && (
                <div className="mt-2 bg-amber-50 dark:bg-amber-950 p-2 border border-amber-200 dark:border-amber-800 rounded">
                  <span className="font-medium">Tip:</span> If you're using Ownable from OpenZeppelin, make sure you're using the correct version:
                  <ul className="list-disc list-inside mt-1 ml-2 text-[10px] sm:text-xs">
                    <li>OpenZeppelin v4.x: Use <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Ownable()</code> with no parameters</li>
                    <li>OpenZeppelin v5.x: Use <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Ownable(msg.sender)</code> with an address parameter</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Main content area with fixed dimensions and stable layout */}
      <div className="flex h-full w-full overflow-hidden relative">
        {/* File Explorer with exact fixed dimensions that match on initial load and after toggle */}
        <div className="h-full absolute left-0 top-0 bottom-0 z-10 transition-transform duration-300 ease-in-out" 
             style={{ 
               width: '256px', 
               transform: showTreeView ? 'translateX(0)' : 'translateX(-256px)',
             }}>
          <div className="h-full w-full border-r border-border/30 overflow-hidden">
            <div 
              ref={fileExplorerRef}
              className={`h-full w-full overflow-auto ${!showTreeView ? 'pointer-events-none' : ''}`}
              style={{ 
                visibility: showTreeView ? 'visible' : 'hidden',
                opacity: showTreeView ? 1 : 0
              }}
            >
              <FileExplorer
                files={files}
                currentFile={currentFile}
                onFileSelect={handleFileSelect}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onRenameItem={renameItem}
                onDeleteItem={deleteItem}
                onCreateNew={handleCreateNew}
              />
            </div>
          </div>
        </div>
        
        {/* Editor Area - Position fixed relative to viewport with exact margin */}
        <div className="absolute top-0 bottom-0 right-0 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out"
             data-editor-container
             style={{ 
               left: showTreeView ? '256px' : '0',
               width: showTreeView ? 'calc(100% - 256px)' : '100%'
             }}>
          {/* Tabs Bar */}
          <div className="border-b w-full">
            {tabsManagerComponent}
          </div>
          
          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
            {editorComponent}
          </div>
        </div>
      </div>
      
      {/* Add a new section for deployment status in the right panel */}
      <div className="fixed top-4 right-4 w-80 space-y-4 z-50">
        {deploymentResult.success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 shadow-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-semibold text-green-700 dark:text-green-400 mb-2">
                  Contract Successfully Deployed!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-300 mb-3">
                  Your contract has been deployed and is ready to use.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeploymentResult({ address: '', success: false })}
                className="text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded border p-2 mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Contract Address</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(deploymentResult.address);
                    toast({
                      title: "Copied!",
                      description: "Contract address copied to clipboard",
                      type: "success"
                    });
                  }}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <code className="text-xs break-all block bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {deploymentResult.address}
              </code>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push(`/interact/${deploymentResult.address}`)}
                className="flex-1 h-8 text-xs"
              >
                <ExternalLinkIcon className="h-3 w-3 mr-1" />
                Interact
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://hashscan.io/testnet/contract/${deploymentResult.address}`, '_blank')}
                className="flex-1 h-8 text-xs"
              >
                <ExternalLinkIcon className="h-3 w-3 mr-1" />
                View on HashScan
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* File/Folder Creation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New {newItemType === 'file' ? 'File' : 'Folder'}</DialogTitle>
            <DialogDescription>
              Enter a name for your new {newItemType === 'file' ? 'file' : 'folder'}.
              {newItemType === 'file' && ' The .sol extension will be added automatically if not included.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={newItemType === 'file' ? 'MyContract.sol' : 'New Folder'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateItem();
                  }
                }}
                autoFocus
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={selectedParentFolder || "root"}
                onValueChange={(value) => setSelectedParentFolder(value === "root" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  {getAllFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>
              Create {newItemType === 'file' ? 'File' : 'Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// Add display name
MultiFileIDE.displayName = 'MultiFileIDE';

export default MultiFileIDE; 