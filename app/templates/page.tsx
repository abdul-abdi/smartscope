'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Coins, FileCode, Users, ShoppingCart, 
  ArrowRight, Star, Zap, Shield, Check, 
  Gift, Ticket, Vote, FileText, Award, DollarSign,
  Copy, Code, User, Info, AlertCircle, PlusCircle, Lightbulb
} from 'lucide-react';

// Template categories
const categories = [
  { id: 'tokens', label: 'Tokens', icon: Coins },
  { id: 'nfts', label: 'NFTs', icon: Gift },
  { id: 'defi', label: 'DeFi', icon: DollarSign },
  { id: 'dao', label: 'Governance', icon: Vote },
  { id: 'utility', label: 'Utility', icon: FileText },
];

// Template data
const templates = [
  // Tokens
  {
    id: 'erc20-basic',
    category: 'tokens',
    title: 'Basic ERC20 Token',
    description: 'A standard ERC20 token implementation with minting capabilities.',
    fullDescription: `This template provides a complete implementation of the ERC20 standard for fungible tokens on the Hedera network. 
    
    It allows you to create your own cryptocurrency with all the standard functions like transfers, allowances, and minting. The contract owner has special privileges to mint new tokens, making it ideal for projects that need controlled token issuance.
    
    Built on OpenZeppelin's battle-tested ERC20 implementation, this template is secure and follows best practices for token creation.`,
    useCases: [
      'Create a governance token for your DAO',
      'Launch a utility token for your dApp',
      'Build a rewards program with tokenized points',
      'Create a token for in-game currencies'
    ],
    technicalDetails: [
      'Implements all required ERC20 functions (transfer, approve, transferFrom)',
      'Owner-only mint function for controlled token issuance',
      'Inherits from OpenZeppelin\'s secure implementations',
      'Compatible with all ERC20-supporting wallets and exchanges'
    ],
    difficulty: 'Beginner',
    features: ['Transfer', 'Approval', 'Mint', 'Burn'],
    icon: Coins,
    popularity: 'High',
    files: [
      { name: 'BasicToken.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`
  },
  {
    id: 'erc20-capped',
    category: 'tokens',
    title: 'Capped Supply Token',
    description: 'ERC20 token with a maximum supply cap to limit inflation.',
    fullDescription: `This advanced ERC20 token implementation includes a hard cap on the total supply, ensuring your token has scarcity built into its design.
    
    Unlike basic tokens where unlimited minting is possible, this template enforces a maximum number of tokens that can ever exist, creating a deflationary economic model. This is particularly valuable for projects that want to ensure their token maintains value over time.
    
    The cap is set during contract deployment and cannot be changed later, providing certainty to token holders about the maximum possible dilution.`,
    useCases: [
      'Create a token with Bitcoin-like scarcity',
      'Launch a token with anti-inflation guarantees',
      'Establish a limited edition digital currency',
      'Build a token economy with predictable supply economics'
    ],
    technicalDetails: [
      'Extends the ERC20 standard with a maximum cap',
      'Cap is immutable after deployment',
      'Automatically prevents minting beyond the cap',
      'Owner-only minting function with cap enforcement',
      'Inherits all standard ERC20 functionality'
    ],
    difficulty: 'Intermediate',
    features: ['Transfer', 'Approval', 'Mint', 'Supply Cap'],
    icon: Coins,
    popularity: 'Medium',
    files: [
      { name: 'CappedToken.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CappedToken is ERC20Capped, Ownable {
    constructor(
        string memory name, 
        string memory symbol,
        uint256 cap
    ) ERC20(name, symbol) ERC20Capped(cap) {}
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`
  },
  // NFTs
  {
    id: 'erc721-basic',
    category: 'nfts',
    title: 'Basic NFT Collection',
    description: 'A standard ERC721 NFT collection with minting functionality.',
    fullDescription: `This template provides everything you need to create your own NFT collection on the Hedera network. It implements the ERC721 standard for non-fungible tokens with metadata support.
    
    Each token in your collection can have unique properties stored as metadata, accessed through a URI. This makes it perfect for digital art, collectibles, or any application where each token needs distinct characteristics.
    
    The contract owner has exclusive minting rights, allowing controlled creation of new NFTs with specified recipients and metadata.`,
    useCases: [
      'Launch a digital art collection',
      'Create unique in-game items or characters',
      'Issue certificates of authenticity',
      'Build a collection of digital collectibles',
      'Tokenize real-world assets with unique properties'
    ],
    technicalDetails: [
      'Implements the ERC721 standard for non-fungible tokens',
      'Includes URI storage for off-chain metadata',
      'Uses counter mechanism for sequential token ID generation',
      'Owner-controlled minting process',
      'Compatible with NFT marketplaces and wallets'
    ],
    difficulty: 'Beginner',
    features: ['Transfer', 'Minting', 'Metadata URI'],
    icon: Gift,
    popularity: 'High',
    files: [
      { name: 'BasicNFT.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract BasicNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mintNFT(address recipient, string memory tokenURI)
        public onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}`
  },
  {
    id: 'erc721-enumerable',
    category: 'nfts',
    title: 'Enumerable NFT Collection',
    description: 'NFT collection with enumeration for on-chain token tracking.',
    fullDescription: `This advanced NFT template extends the basic ERC721 implementation with enumeration capabilities, allowing for efficient on-chain tracking of all tokens in the collection.
    
    The enumerable extension makes it possible to query all tokens owned by an address, get the total supply, and iterate through tokens - all directly on the blockchain. This is particularly valuable for applications that need to display or interact with a user's entire collection.
    
    This template combines the benefits of metadata storage with the ability to efficiently enumerate tokens, creating a full-featured NFT collection contract.`,
    useCases: [
      'Create NFT collections where displaying ownership is important',
      'Build applications that need to list all tokens in a collection',
      'Develop games where inventories need efficient on-chain verification',
      'Launch platforms where tokens need to be counted or iterated through'
    ],
    technicalDetails: [
      'Implements ERC721Enumerable for efficient token iteration',
      'Includes URI storage for off-chain metadata',
      'Overrides required functions to handle dual inheritance',
      'Provides methods to get token by index and owner',
      'Supports on-chain querying of total supply and ownership',
      'Requires more gas for transfers due to additional index tracking'
    ],
    difficulty: 'Intermediate', 
    features: ['Transfer', 'Minting', 'Enumeration', 'Metadata URI'],
    icon: Gift,
    popularity: 'Medium',
    files: [
      { name: 'EnumerableNFT.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnumerableNFT is ERC721Enumerable, ERC721URIStorage, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mintNFT(address recipient, uint256 tokenId, string memory tokenURI) public onlyOwner {
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    // Override required functions
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`
  },
  // DeFi
  {
    id: 'crowdfunding',
    category: 'defi',
    title: 'Crowdfunding Campaign',
    description: 'Create fundraising campaigns with time-based goals.',
    fullDescription: `This smart contract implements a complete decentralized crowdfunding platform where creators can launch campaigns with specific funding goals and deadlines.
    
    Contributors can pledge funds to campaigns they want to support. If a campaign reaches its goal by the deadline, the creator can claim the funds. If not, contributors can get refunds, ensuring their money isn't locked in failed projects.
    
    The contract includes safeguards like time limits, precise tracking of individual contributions, and verifiable on-chain campaign states. This makes it ideal for transparent fundraising where trust is established through code rather than intermediaries.`,
    useCases: [
      'Launch a crowdfunding platform for creative projects',
      'Raise funds for charitable causes with transparent accounting',
      'Create pre-sales for products with automatic refund guarantees',
      'Build community-funded development initiatives',
      'Set up decentralized grant programs'
    ],
    technicalDetails: [
      'Supports multiple simultaneous campaigns',
      'Time-bound fundraising with configurable start and end times',
      'Automatic goal tracking and success determination',
      'Individual contribution tracking for each backer',
      'Withdrawal functionality for campaign creators',
      'Refund mechanism if goal isn\'t met',
      'Event emissions for all key actions (creation, pledging, claiming, refunding)'
    ],
    difficulty: 'Intermediate',
    features: ['Contribution', 'Goal Setting', 'Deadline', 'Refunds'],
    icon: DollarSign,
    popularity: 'Medium',
    files: [
      { name: 'Crowdfunding.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Crowdfunding {
    struct Campaign {
        address creator;
        uint goal;
        uint pledged;
        uint startAt;
        uint endAt;
        bool claimed;
    }

    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => uint)) public pledgedAmount;
    uint public campaignCount;

    event CampaignCreated(uint id, address creator, uint goal, uint startAt, uint endAt);
    event CampaignPledged(uint id, address pledger, uint amount);
    event CampaignUnpledged(uint id, address pledger, uint amount);
    event CampaignClaimed(uint id);
    event CampaignRefunded(uint id, address pledger, uint amount);

    function createCampaign(uint goal, uint startAt, uint endAt) external {
        require(startAt >= block.timestamp, "Start time is less than current time");
        require(endAt > startAt, "End time must be greater than start time");
        require(endAt <= block.timestamp + 90 days, "End time too far into future");

        campaignCount++;
        campaigns[campaignCount] = Campaign({
            creator: msg.sender,
            goal: goal,
            pledged: 0,
            startAt: startAt,
            endAt: endAt,
            claimed: false
        });

        emit CampaignCreated(campaignCount, msg.sender, goal, startAt, endAt);
    }

    function pledge(uint id) external payable {
        Campaign storage campaign = campaigns[id];
        require(block.timestamp >= campaign.startAt, "Campaign not started");
        require(block.timestamp <= campaign.endAt, "Campaign ended");

        campaign.pledged += msg.value;
        pledgedAmount[id][msg.sender] += msg.value;

        emit CampaignPledged(id, msg.sender, msg.value);
    }

    function unpledge(uint id, uint amount) external {
        Campaign storage campaign = campaigns[id];
        require(block.timestamp <= campaign.endAt, "Campaign ended");
        require(pledgedAmount[id][msg.sender] >= amount, "Insufficient pledged amount");

        campaign.pledged -= amount;
        pledgedAmount[id][msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit CampaignUnpledged(id, msg.sender, amount);
    }

    function claim(uint id) external {
        Campaign storage campaign = campaigns[id];
        require(campaign.creator == msg.sender, "Not campaign creator");
        require(block.timestamp > campaign.endAt, "Campaign not ended");
        require(campaign.pledged >= campaign.goal, "Goal not reached");
        require(!campaign.claimed, "Already claimed");

        campaign.claimed = true;
        payable(campaign.creator).transfer(campaign.pledged);

        emit CampaignClaimed(id);
    }

    function refund(uint id) external {
        Campaign storage campaign = campaigns[id];
        require(block.timestamp > campaign.endAt, "Campaign not ended");
        require(campaign.pledged < campaign.goal, "Goal reached");
        
        uint amount = pledgedAmount[id][msg.sender];
        require(amount > 0, "Nothing to refund");
        
        pledgedAmount[id][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit CampaignRefunded(id, msg.sender, amount);
    }
}`
  },
  // Governance
  {
    id: 'simple-dao',
    category: 'dao',
    title: 'Simple DAO',
    description: 'Basic decentralized autonomous organization with voting.',
    fullDescription: `This template provides a complete foundation for creating a Decentralized Autonomous Organization (DAO) with on-chain governance capabilities.
    
    Members of the DAO can create proposals, vote on them, and execute approved actions. The governance model uses a simple majority voting system with a configurable quorum to ensure decisions have sufficient participation.
    
    This contract handles the entire lifecycle of governance proposals, from creation through voting to execution. It can be used to manage collective decisions on any aspect of your project, from token economics to protocol upgrades.`,
    useCases: [
      'Create community governance for your protocol',
      'Build an investment DAO for collective funding decisions',
      'Establish a grants program with decentralized allocation',
      'Set up governance for a treasury or multisig',
      'Implement stakeholder voting for project decisions'
    ],
    technicalDetails: [
      'Proposal creation with target contract and function data',
      'Member management with voting rights',
      'Configurable quorum requirements',
      'Time-bound voting periods',
      'Secure execution of approved proposals',
      'Complete event tracking for governance actions',
      'Flexible design for various governance models'
    ],
    difficulty: 'Advanced',
    features: ['Proposals', 'Voting', 'Execution', 'Membership'],
    icon: Vote,
    popularity: 'Medium',
    files: [
      { name: 'SimpleDAO.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract SimpleDAO {
    struct Proposal {
        address target;
        bytes data;
        uint yesVotes;
        uint noVotes;
        uint createdAt;
        uint endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(uint => Proposal) public proposals;
    mapping(address => bool) public members;
    uint public proposalCount;
    uint public memberCount;
    uint public votingPeriod = 3 days;
    uint public quorum;

    event MemberAdded(address member);
    event MemberRemoved(address member);
    event ProposalCreated(uint id, address creator, address target);
    event Voted(uint proposalId, address voter, bool support);
    event ProposalExecuted(uint proposalId);

    constructor(address[] memory initialMembers, uint initialQuorum) {
        require(initialQuorum > 0, "Quorum must be positive");
        require(initialMembers.length >= initialQuorum, "Not enough initial members");
        
        quorum = initialQuorum;
        
        for (uint i = 0; i < initialMembers.length; i++) {
            _addMember(initialMembers[i]);
        }
    }

    modifier onlyMember() {
        require(members[msg.sender], "Not a member");
        _;
    }

    function createProposal(address target, bytes calldata data) external onlyMember returns (uint) {
        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.target = target;
        proposal.data = data;
        proposal.createdAt = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        
        emit ProposalCreated(proposalCount, msg.sender, target);
        return proposalCount;
    }

    function vote(uint proposalId, bool support) external onlyMember {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        
        emit Voted(proposalId, msg.sender, support);
    }

    function executeProposal(uint proposalId) external onlyMember {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.yesVotes >= quorum, "Quorum not reached");
        require(proposal.yesVotes > proposal.noVotes, "Proposal not passed");
        
        proposal.executed = true;
        (bool success, ) = proposal.target.call(proposal.data);
        require(success, "Execution failed");
        
        emit ProposalExecuted(proposalId);
    }

    function _addMember(address member) internal {
        require(!members[member], "Already a member");
        members[member] = true;
        memberCount++;
        emit MemberAdded(member);
    }

    function addMember(address member) external onlyMember {
        // This would typically require a proposal and vote
        // Simplified for this example
        _addMember(member);
    }

    function removeMember(address member) external onlyMember {
        // This would typically require a proposal and vote
        // Simplified for this example
        require(members[member], "Not a member");
        members[member] = false;
        memberCount--;
        emit MemberRemoved(member);
    }
}`
  },
  // Utility
  {
    id: 'escrow',
    category: 'utility',
    title: 'Simple Escrow',
    description: 'Escrow contract for secure transactions between parties.',
    fullDescription: `This escrow contract acts as a trusted intermediary between buyers and sellers, enabling secure transactions without requiring parties to trust each other directly.
    
    The contract holds funds from the buyer until predefined conditions are met, at which point the seller can receive payment. If there's a dispute, a designated arbitrator can decide whether to release funds to the seller or refund them to the buyer.
    
    This template is designed for maximum security in peer-to-peer transactions, with clear role separation and event tracking for all key actions. It ensures neither party can take unilateral action once funds are deposited.`,
    useCases: [
      'Facilitate secure peer-to-peer sales',
      'Enable payment for digital services with verification',
      'Create trustless freelance work arrangements',
      'Build marketplace payment protection',
      'Set up conditional payments with third-party verification'
    ],
    technicalDetails: [
      'Three-role model: buyer, seller, and arbitrator',
      'Two-step process: deposit followed by release or refund',
      'Prevention of double-spending or double-refunds',
      'Full event logging for transaction tracking',
      'Simple interface with just three main functions',
      'Built-in dispute resolution mechanism',
      'Clear state management to prevent conflicting actions'
    ],
    difficulty: 'Intermediate',
    features: ['Deposit', 'Release', 'Refund', 'Arbitration'],
    icon: Shield,
    popularity: 'Medium',
    files: [
      { name: 'Escrow.sol', main: true },
    ],
    codePreview: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Escrow {
    address public buyer;
    address public seller;
    address public arbiter;
    uint public amount;
    bool public isReleased;
    bool public isRefunded;
    
    event Deposited(address buyer, uint amount);
    event Released(address seller, uint amount);
    event Refunded(address buyer, uint amount);
    
    constructor(address _buyer, address _seller, address _arbiter) {
        buyer = _buyer;
        seller = _seller;
        arbiter = _arbiter;
    }
    
    function deposit() external payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(amount == 0, "Already deposited");
        amount = msg.value;
        emit Deposited(buyer, msg.value);
    }
    
    function release() external {
        require(msg.sender == buyer || msg.sender == arbiter, "Only buyer or arbiter can release");
        require(!isReleased, "Already released");
        require(!isRefunded, "Already refunded");
        
        isReleased = true;
        payable(seller).transfer(amount);
        emit Released(seller, amount);
    }
    
    function refund() external {
        require(msg.sender == seller || msg.sender == arbiter, "Only seller or arbiter can refund");
        require(!isReleased, "Already released");
        require(!isRefunded, "Already refunded");
        
        isRefunded = true;
        payable(buyer).transfer(amount);
        emit Refunded(buyer, amount);
    }
}`
  },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('tokens');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredTemplates = templates.filter(template => 
    activeCategory === 'all' || template.category === activeCategory
  );

  const handleCreateFromTemplate = (template) => {
    // Include both template ID and code in the URL
    const params = new URLSearchParams();
    params.append('template', template.id);
    params.append('code', encodeURIComponent(template.codePreview));
    window.location.href = `/create?${params.toString()}`;
  };

  const handleViewDetails = (template) => {
    setSelectedTemplate(template);
    setShowDetail(true);
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
            className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl"
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
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-500">
              Contract Templates
            </h1>
            <p className="text-xl text-foreground/80 mb-4">
              Jumpstart your development with pre-built smart contract templates
            </p>
            <p className="text-md text-muted-foreground mb-8 max-w-3xl mx-auto">
              Each template is thoroughly tested, follows security best practices, and can be deployed directly to the Hedera network. 
              Select a template category below to explore options.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Templates content */}
      <section className="pb-24 pt-0">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="tokens" className="w-full" onValueChange={setActiveCategory}>
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <motion.div 
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ y: -5 }}
                        className="flex flex-col h-full"
                      >
                        <Card className="h-full flex flex-col hover:border-primary/50 transition-all relative">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="p-2 rounded-lg bg-primary/10 mb-3">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <Badge variant={template.difficulty === 'Beginner' ? 'outline' : 
                                      template.difficulty === 'Intermediate' ? 'secondary' : 'destructive'}>
                                {template.difficulty}
                              </Badge>
                            </div>
                            <CardTitle className="text-xl">{template.title}</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              {template.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grow pb-3">
                            <div className="flex flex-wrap gap-2 mb-4">
                              {template.features.map(feature => (
                                <div key={feature} className="flex items-center text-xs bg-secondary/50 rounded-full px-2 py-1">
                                  <Check className="h-3 w-3 mr-1 text-primary" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                            <div className="bg-muted/50 rounded-md p-2 mt-4 overflow-hidden relative group">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background group-hover:opacity-0 transition-opacity"></div>
                              <pre className="text-xs overflow-hidden max-h-36">
                                <code>{template.codePreview.substring(0, 300)}...</code>
                              </pre>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-4 text-primary"
                              onClick={() => handleViewDetails(template)}
                            >
                              <Info className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </CardContent>
                          <CardFooter className="flex justify-between items-center pt-3 border-t mt-auto">
                            <div className="text-xs text-muted-foreground flex items-center">
                              <FileCode className="h-3 w-3 mr-1" />
                              {template.files.length} file{template.files.length > 1 ? 's' : ''}
                            </div>
                            <Button onClick={() => handleCreateFromTemplate(template)}>
                              <span>Use Template</span>
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Template Detail Modal */}
      {showDetail && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            className="bg-background rounded-xl border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sticky top-0 bg-background z-10 p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <selectedTemplate.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedTemplate.title}</h2>
                  <p className="text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)}>
                <AlertCircle className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Overview</h3>
                <div className="text-sm whitespace-pre-line">{selectedTemplate.fullDescription}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                    Use Cases
                  </h3>
                  <ul className="space-y-2">
                    {selectedTemplate.useCases.map((useCase, index) => (
                      <li key={index} className="flex items-start">
                        <PlusCircle className="h-4 w-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Code className="h-5 w-5 mr-2 text-blue-500" />
                    Technical Details
                  </h3>
                  <ul className="space-y-2">
                    {selectedTemplate.technicalDetails.map((detail, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Implementation</h3>
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs">
                    <code>{selectedTemplate.codePreview}</code>
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  Close
                </Button>
                <Button onClick={() => handleCreateFromTemplate(selectedTemplate)}>
                  Use This Template
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}