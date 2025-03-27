'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Code, Github, ExternalLink, FileText, Shield, Code2, CheckCircle, Coins, Search, Copy, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Define template categories
  const categories = [
    { id: 'tokens', label: 'Tokens', description: 'Token standards and implementations' },
    { id: 'access', label: 'Access Control', description: 'Ownership and role-based access patterns' },
    { id: 'security', label: 'Security', description: 'Security modules and utilities' },
    { id: 'governance', label: 'Governance', description: 'DAO governance templates' },
    { id: 'utils', label: 'Utilities', description: 'Common contract utilities' }
  ];

  // Define templates
  const templates = [
    {
      id: 'erc20',
      name: 'ERC20 Token',
      description: 'Implementation of the standard ERC20 token with optional features',
      category: 'tokens',
      difficulty: 'beginner',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
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
}`
    },
    {
      id: 'erc721',
      name: 'ERC721 NFT',
      description: 'Non-fungible token implementation following the ERC721 standard',
      category: 'tokens',
      difficulty: 'intermediate',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
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
}`
    },
    {
      id: 'erc1155',
      name: 'ERC1155 Multi-Token',
      description: 'Multi-token standard for both fungible and non-fungible tokens',
      category: 'tokens',
      difficulty: 'advanced',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyMultiToken is ERC1155, Ownable {
    constructor() ERC1155("https://game.example/api/item/{id}.json") Ownable(msg.sender) {}
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data) public onlyOwner {
        _mint(to, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
}`
    },
    {
      id: 'access-control',
      name: 'Role-Based Access Control',
      description: 'Granular role-based access control for contracts',
      category: 'access',
      difficulty: 'intermediate',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleBasedAccess is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function adminOnly() public view onlyRole(ADMIN_ROLE) returns (string memory) {
        return "You have admin privileges";
    }
    
    function minterOnly() public view onlyRole(MINTER_ROLE) returns (string memory) {
        return "You have minter privileges";
    }
}`
    },
    {
      id: 'ownable',
      name: 'Ownable Contract',
      description: 'Basic access control using a single owner address',
      category: 'access',
      difficulty: 'beginner',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    constructor() Ownable(msg.sender) {}
    
    function normalFunction() public pure returns (string memory) {
        return "Anyone can call this";
    }
    
    function restrictedFunction() public view onlyOwner returns (string memory) {
        return "Only owner can call this";
    }
}`
    },
    {
      id: 'reentrancy-guard',
      name: 'Reentrancy Guard',
      description: 'Protect functions from reentrancy attacks',
      category: 'security',
      difficulty: 'intermediate',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
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
}`
    },
    {
      id: 'pausable',
      name: 'Pausable Contract',
      description: 'Implement emergency stop mechanism for your contract',
      category: 'security',
      difficulty: 'beginner',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
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
    },
    {
      id: 'governor',
      name: 'Governor Contract',
      description: 'On-chain governance for DAOs with voting mechanisms',
      category: 'governance',
      difficulty: 'advanced',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract MyGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl {
    constructor(IVotes _token, TimelockController _timelock)
        Governor("MyGovernor")
        GovernorSettings(1 /* 1 block */, 45818 /* 1 week */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
        GovernorTimelockControl(_timelock)
    {}

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        return super.propose(targets, values, calldatas, description);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`
    },
    {
      id: 'multi-sig-wallet',
      name: 'Multi-Signature Wallet',
      description: 'Wallet requiring multiple approvals for transactions',
      category: 'security',
      difficulty: 'advanced',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    event Submit(uint indexed txId);
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    event Execute(uint indexed txId);

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public required;
    
    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txId) {
        require(_txId < transactions.length, "tx does not exist");
        _;
    }

    modifier notApproved(uint _txId) {
        require(!approved[_txId][msg.sender], "tx already approved");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "tx already executed");
        _;
    }

    constructor(address[] memory _owners, uint _required) {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "invalid required number of owners");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submit(address _to, uint _value, bytes calldata _data) external onlyOwner {
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false
        }));
        
        emit Submit(transactions.length - 1);
    }

    function approve(uint _txId) external onlyOwner txExists(_txId) notApproved(_txId) notExecuted(_txId) {
        approved[_txId][msg.sender] = true;
        emit Approve(msg.sender, _txId);
    }

    function _getApprovalCount(uint _txId) private view returns (uint count) {
        for (uint i = 0; i < owners.length; i++) {
            if (approved[_txId][owners[i]]) {
                count++;
            }
        }
    }

    function execute(uint _txId) external txExists(_txId) notExecuted(_txId) {
        require(_getApprovalCount(_txId) >= required, "approvals < required");
        Transaction storage transaction = transactions[_txId];

        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");

        emit Execute(_txId);
    }

    function revoke(uint _txId) external onlyOwner txExists(_txId) notExecuted(_txId) {
        require(approved[_txId][msg.sender], "tx not approved");
        approved[_txId][msg.sender] = false;
        emit Revoke(msg.sender, _txId);
    }
}`
    },
    {
      id: 'merkle-proof',
      name: 'Merkle Proof Verification',
      description: 'Efficiently verify if a value is part of a dataset using Merkle proofs',
      category: 'utils',
      difficulty: 'intermediate',
      openZeppelinUrl: 'https://www.openzeppelin.com/contracts',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleClaimList {
    bytes32 public merkleRoot;
    
    mapping(address => bool) public claimed;
    
    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }
    
    function claim(bytes32[] calldata merkleProof) external {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(!claimed[msg.sender], "Address has already claimed");
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");
        
        claimed[msg.sender] = true;
        
        // Perform the claim logic here
        // e.g., token.transfer(msg.sender, 100);
    }
}`
    }
  ];

  // Filter templates based on search query and active tab
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'beginner') return matchesSearch && template.difficulty === 'beginner';
    if (activeTab === 'intermediate') return matchesSearch && template.difficulty === 'intermediate';
    if (activeTab === 'advanced') return matchesSearch && template.difficulty === 'advanced';
    if (activeTab !== 'all' && categories.find(c => c.id === activeTab)) {
      return matchesSearch && template.category === activeTab;
    }
    
    return matchesSearch;
  });

  const handleCopyCode = (templateId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTemplate(templateId);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setCopiedTemplate(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-12 md:py-16">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, 30, 0],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"
            animate={{
              y: [0, 40, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                Smart Contract Templates
              </h1>
              <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
                Browse our collection of secure, audited smart contract templates to jump-start your development
              </p>
            </div>
            
            {/* Search & Filtering */}
            <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search templates..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href="https://www.openzeppelin.com/contracts" 
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="flex items-center text-sm text-primary hover:underline"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    OpenZeppelin Contracts
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-2 flex flex-wrap">
                  <TabsTrigger value="all">All Templates</TabsTrigger>
                  <TabsTrigger value="beginner">Beginner</TabsTrigger>
                  <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  {categories.map(category => (
                    <TabsTrigger key={category.id} value={category.id}>{category.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="py-8 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <h3 className="text-xl font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-background border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium 
                      ${template.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                      template.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'}`}
                    >
                      {template.difficulty}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 mt-4 mb-4 overflow-hidden border border-border/50 relative group">
                    <div className="code-block scrollbar-thin" style={{ maxHeight: '200px' }}>
                      <pre className="text-xs md:text-sm">
                        <code>{template.code}</code>
                      </pre>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none"></div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 bg-background/80 border border-border rounded opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopyCode(template.id, template.code)}
                      title="Copy code"
                    >
                      {copiedTemplate === template.id ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-foreground/70" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex space-x-2">
                      <a 
                        href={template.openZeppelinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-primary hover:underline"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        View Docs
                      </a>
                      <a 
                        href="https://github.com/OpenZeppelin/openzeppelin-contracts" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-foreground/70 hover:text-foreground"
                      >
                        <Github className="h-3 w-3 mr-1" />
                        GitHub
                      </a>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/create?template=${template.id}`}>
                        <span className="flex items-center">
                          Use Template
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
        
        {/* Call to Action */}
        <div className="max-w-2xl mx-auto text-center bg-primary/5 rounded-xl p-6 border border-primary/20">
          <h2 className="text-2xl font-bold mb-3">Ready to create your own contract?</h2>
          <p className="text-foreground/70 mb-6">
            Start from scratch or customize one of our templates
          </p>
          <Button size="lg" asChild>
            <Link href="/create">Create Contract</Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 