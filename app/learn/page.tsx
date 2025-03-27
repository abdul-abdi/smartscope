'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BookOpen, Code, ExternalLink, FileText, Lightbulb, Search, Shield, Code2, CheckCircle, GraduationCap, Book, Coffee, FileCode, Users, Image, Scale, ShoppingCart, Sparkles, Circle, Coins, AlertTriangle, Swords, MessagesSquare, MessageCircle, MessageSquare, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export default function LearnPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string>('basics');
  
  // Define all sections data
  const sections = [
    { id: 'platform-guide', label: 'Platform Guide', icon: Coffee, description: 'Learn how to use SmartScope effectively' },
    { id: 'basics', label: 'Smart Contract Basics', icon: Book, description: 'Introduction to smart contracts and their applications' },
    { id: 'solidity', label: 'Solidity Fundamentals', icon: Code, description: 'Learn the basics of Solidity programming language' },
    { id: 'hedera', label: 'Hedera Network', icon: Shield, description: 'Explore the Hedera network and its features' },
    { id: 'deployment', label: 'Deployment Process', icon: FileText, description: 'Learn how to deploy your smart contracts' },
    { id: 'security', label: 'Security Best Practices', icon: GraduationCap, description: 'Essential security practices for smart contracts' },
    { id: 'example-contracts', label: 'Example Contracts', icon: Code2, description: 'Practical examples of smart contracts' },
    { id: 'learning-resources', label: 'Learning Resources', icon: BookOpen, description: 'Curated external resources for further learning' }
  ];
  
  // Load completed sections from localStorage on component mount
  useEffect(() => {
    const savedCompletedSections = localStorage.getItem('completedSections');
    if (savedCompletedSections) {
      setCompletedSections(JSON.parse(savedCompletedSections));
    }
  }, []);
  
  // Save completed sections to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('completedSections', JSON.stringify(completedSections));
  }, [completedSections]);
  
  // Function to toggle section completion status
  const toggleSectionCompletion = (sectionId: string) => {
    setCompletedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    const totalSections = sections.length;
    const completedCount = completedSections.length;
    return Math.round((completedCount / totalSections) * 100);
  };
  
  // Filter sections based on search query and active tab
  const filteredSections = sections.filter(section => {
    const matchesSearch = section.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'completed') return matchesSearch && completedSections.includes(section.id);
    if (activeTab === 'incomplete') return matchesSearch && !completedSections.includes(section.id);
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-16 md:py-24">
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
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
              Learn Smart Contracts
            </h1>
              <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
              Your comprehensive guide to understanding, creating, and deploying 
              smart contracts on the Hedera network.
            </p>
            </div>
            
            {/* Search & Progress Bar */}
            <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search for topics..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-medium">{calculateProgress()}%</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="all">All Topics</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="incomplete">Remaining</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Sidebar Navigation */}
            <motion.div
              className="md:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-background rounded-lg border border-border p-6 sticky top-24">
                <h3 className="text-xl font-semibold mb-4">Quick Navigation</h3>
                {searchQuery && filteredSections.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    <p>No topics found for "{searchQuery}"</p>
                  </div>
                ) : (
                <ul className="space-y-2">
                    {filteredSections.map(section => (
                      <li key={section.id}>
                        <a 
                          href="#"
                          className={`flex items-center p-2 ${activeSection === section.id ? 'bg-primary/10 text-primary' : 'text-foreground/80'} hover:text-primary hover:bg-primary/5 rounded-md transition-colors group relative`}
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveSection(section.id);
                          }}
                        >
                          <div className="flex-shrink-0 bg-primary/10 p-1.5 rounded-md mr-3">
                            <section.icon className="h-4 w-4 text-primary" />
                          </div>
                          <span>{section.label}</span>
                          {completedSections.includes(section.id) && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                      </a>
                    </li>
                  ))}
                </ul>
                )}
                
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Ready to start?</h4>
                    {calculateProgress() > 0 && (
                      <span className="text-xs text-muted-foreground">{completedSections.length}/{sections.length} completed</span>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/create">
                      Create Your First Contract
                    </Link>
                  </Button>
                  
                  <div className="mt-4 text-center">
                    <Link href="/templates" className="text-sm text-primary hover:underline flex items-center justify-center">
                      <Book className="h-3 w-3 mr-1" />
                      Browse templates
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Navigation and Section Display */}
              <div className="bg-background rounded-xl border border-border/40 p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">{sections.find(s => s.id === activeSection)?.label}</h2>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : sections.length - 1;
                        setActiveSection(sections[prevIndex].id);
                      }}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        const nextIndex = currentIndex < sections.length - 1 ? currentIndex + 1 : 0;
                        setActiveSection(sections[nextIndex].id);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                
                <div className="relative">
                  {/* Conditional rendering of section content */}
                  {activeSection === 'platform-guide' && (
                    <motion.div
                      key="platform-guide"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                      <p>
                        Welcome to SmartScope! This comprehensive guide will walk you through all the features and capabilities
                        of our platform for developing, validating, and deploying smart contracts on the Hedera network.
                      </p>

                      <h3>Platform Overview</h3>
                      <div className="bg-muted/50 rounded-lg p-6 border border-border my-6">
                        <p className="mb-4">
                          SmartScope is designed to provide a seamless experience for smart contract development on Hedera.
                          Whether you're creating new contracts, interacting with existing ones, or checking wallet deployments,
                          our platform has you covered.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center">
                              <FileCode className="h-5 w-5 mr-2 text-primary" />
                              Create
                            </h4>
                            <p className="text-sm text-foreground/80">
                              Write, validate, and deploy new smart contracts with our advanced editor
                            </p>
                          </div>
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center">
                              <ExternalLink className="h-5 w-5 mr-2 text-primary" />
                              Interact
                            </h4>
                            <p className="text-sm text-foreground/80">
                              Connect to existing contracts and interact with their functions
                            </p>
                          </div>
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2 flex items-center">
                              <Wallet className="h-5 w-5 mr-2 text-primary" />
                              Wallet
                            </h4>
                            <p className="text-sm text-foreground/80">
                              View and analyze contracts deployed by any wallet address
                            </p>
                          </div>
                        </div>
                      </div>

                      <h3>Getting Started</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <FileCode className="h-5 w-5 mr-2 text-primary" />
                            Contract Creation
                          </h4>
                          <ul className="text-sm space-y-2">
                            <li>1. Navigate to the "Create" page</li>
                            <li>2. Choose between sample contracts or write your own</li>
                            <li>3. Use the advanced code editor with syntax highlighting</li>
                            <li>4. Access real-time validation and security checks</li>
                            <li>5. Test your contract with sample data</li>
                            <li>6. Deploy to Hedera Testnet</li>
                          </ul>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <Shield className="h-5 w-5 mr-2 text-primary" />
                            Contract Validation
                          </h4>
                          <ul className="text-sm space-y-2">
                            <li>1. Click "Validate Contract" to run security checks</li>
                            <li>2. Review warnings and suggested fixes</li>
                            <li>3. Check your contract's security score</li>
                            <li>4. Address critical issues before deployment</li>
                            <li>5. Optimize gas usage</li>
                            <li>6. Generate and download ABI</li>
                          </ul>
                        </div>
                      </div>

                      <h3>Key Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose mb-8">
                        <div className="bg-background rounded-lg border border-border p-4 hover:border-primary/50 transition-all">
                          <div className="flex items-center mb-2">
                            <Sparkles className="h-4 w-4 text-yellow-500 mr-2" />
                            <h4 className="font-medium">Smart Editor</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Advanced code editor with Solidity syntax highlighting, auto-completion, error detection, and real-time validation.
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-4 hover:border-primary/50 transition-all">
                          <div className="flex items-center mb-2">
                            <Scale className="h-4 w-4 text-blue-500 mr-2" />
                            <h4 className="font-medium">Security Analysis</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Comprehensive security scanning with detailed feedback, vulnerability detection, and improvement suggestions.
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-4 hover:border-primary/50 transition-all">
                          <div className="flex items-center mb-2">
                            <Coins className="h-4 w-4 text-green-500 mr-2" />
                            <h4 className="font-medium">Testnet Deployment</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            One-click deployment to Hedera Testnet with transaction monitoring and contract verification.
                          </p>
                        </div>
                      </div>

                      <h3>Using the Contract Editor</h3>
                      <div className="bg-muted/50 p-6 rounded-lg my-6 border border-border">
                        <h4 className="font-medium mb-4">Editor Features</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-sm mb-2">Code Writing</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Syntax highlighting for Solidity</li>
                              <li>• Auto-indentation and formatting</li>
                              <li>• Error underlining and quick fixes</li>
                              <li>• Code snippets and templates</li>
                              <li>• Multi-file support</li>
                              <li>• Version control integration</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm mb-2">Validation Features</h5>
                            <ul className="text-sm space-y-1">
                              <li>• Real-time syntax checking</li>
                              <li>• Security vulnerability scanning</li>
                              <li>• Gas optimization suggestions</li>
                              <li>• Best practices enforcement</li>
                              <li>• Custom validation rules</li>
                              <li>• Detailed error reporting</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <h3>Security Analysis</h3>
                      <div className="bg-yellow-500/10 p-6 rounded-lg my-6 border border-yellow-500/20">
                        <h4 className="flex items-center font-medium text-yellow-500 mb-4">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Understanding Security Warnings
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h5 className="font-medium mb-2">Critical Warnings</h5>
                            <p className="text-sm text-foreground/80">
                              Highlighted in red, these issues must be fixed before deployment. They indicate serious
                              security vulnerabilities that could compromise your contract.
                            </p>
                          </div>
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h5 className="font-medium mb-2">Medium Warnings</h5>
                            <p className="text-sm text-foreground/80">
                              Shown in yellow, these suggest potential issues that should be reviewed but may not be
                              critical depending on your contract's purpose.
                            </p>
                          </div>
                          <div className="bg-background/50 p-4 rounded-lg">
                            <h5 className="font-medium mb-2">Informational Notes</h5>
                            <p className="text-sm text-foreground/80">
                              Displayed in blue, these provide suggestions for code improvement and best practices.
                            </p>
                          </div>
                        </div>
                      </div>

                      <h3>Deployment Process</h3>
                      <div className="not-prose">
                        <div className="bg-muted/50 rounded-lg p-6 border border-border">
                          <h4 className="font-medium mb-4">Deployment Steps</h4>
                          <ol className="space-y-4">
                            <li className="flex items-start">
                              <div className="bg-primary/10 p-1.5 rounded-full mr-3 mt-0.5">
                                <Circle className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium mb-1">Validation Check</h5>
                                <p className="text-sm text-foreground/80">
                                  Ensure your contract passes all critical security checks and has an acceptable security score.
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start">
                              <div className="bg-primary/10 p-1.5 rounded-full mr-3 mt-0.5">
                                <Circle className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium mb-1">Compilation</h5>
                                <p className="text-sm text-foreground/80">
                                  The contract is compiled to bytecode. Any compilation errors must be resolved.
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start">
                              <div className="bg-primary/10 p-1.5 rounded-full mr-3 mt-0.5">
                                <Circle className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h5 className="font-medium mb-1">Deployment</h5>
                                <p className="text-sm text-foreground/80">
                                  Contract is deployed to Hedera Testnet. You'll receive the contract address upon successful deployment.
                                </p>
                              </div>
                            </li>
                          </ol>
                        </div>
                      </div>

                      <h3>Getting Help</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mt-6">
                        <a 
                          href="https://github.com/your-repo/issues" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-purple-100 dark:bg-purple-900/20 p-2">
                              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-medium">Report Issues</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Found a bug? Report it on our GitHub repository
                          </p>
                        </a>
                        <a 
                          href="https://github.com/your-repo/discussions" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <MessagesSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium">Community Support</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Get help from our community in GitHub Discussions
                          </p>
                        </a>
                      </div>

                      <div className="bg-muted p-4 rounded-lg my-6">
                        <h4 className="flex items-center font-medium">
                          <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                          Pro Tip
                        </h4>
                        <p className="mt-2 text-sm">
                          Use the sample contracts as a starting point to understand best practices and common patterns.
                          Each sample is thoroughly documented and demonstrates different aspects of smart contract development.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'basics' && (
                    <motion.div
                      key="basics"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                  <p>
                    Smart contracts are self-executing contracts with the terms directly written into code. 
                    They run on blockchain networks and automatically execute when predetermined conditions are met.
                        Unlike traditional contracts, they don't rely on third parties for enforcement and create
                        a transparent, immutable record on the blockchain.
                  </p>
                  
                  <h3 className="mt-8 mb-4">Key Characteristics</h3>
                  <ul className="space-y-2">
                    <li><strong>Immutable:</strong> Once deployed, they cannot be changed (unless specifically designed to be upgradable)</li>
                    <li><strong>Transparent:</strong> All transactions are recorded on the blockchain and visible to all participants</li>
                    <li><strong>Trustless:</strong> No need for intermediaries as the code guarantees execution</li>
                    <li><strong>Autonomous:</strong> Automatically executes when conditions are met</li>
                    <li><strong>Deterministic:</strong> Given the same input, they will always produce the same output</li>
                  </ul>
                  
                  <h3 className="mt-8 mb-4">How Smart Contracts Work</h3>
                  <p className="mb-6">
                    Smart contracts are deployed on blockchain networks and stored as bytecode. When users interact
                    with a smart contract, they send transactions that trigger specific functions within the contract.
                    The blockchain's nodes execute these functions identically, reaching consensus on the resulting state.
                  </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2">Smart Contract Execution</h4>
                          <ol className="text-sm space-y-2">
                            <li>1. User initiates a transaction to interact with the contract</li>
                            <li>2. Transaction is broadcast to the network</li>
                            <li>3. Miners/validators include it in a block</li>
                            <li>4. Each node executes the contract code</li>
                            <li>5. State changes are recorded on the blockchain</li>
                            <li>6. Events are emitted for off-chain notification</li>
                          </ol>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2">Common Applications</h4>
                          <ul className="text-sm space-y-2">
                            <li>• Decentralized Finance (DeFi)</li>
                            <li>• Non-Fungible Tokens (NFTs)</li>
                            <li>• Decentralized Autonomous Organizations (DAOs)</li>
                            <li>• Supply Chain Tracking</li>
                            <li>• Digital Identity Management</li>
                            <li>• Decentralized Exchanges (DEXs)</li>
                          </ul>
                        </div>
                      </div>
                      
                      <h3>Limitations to Consider</h3>
                      <ul>
                        <li><strong>Immutability Can Be a Challenge:</strong> Error-fixing requires carefully designed upgrade mechanisms</li>
                        <li><strong>Gas Costs:</strong> All operations have associated computational costs</li>
                        <li><strong>External Data Access:</strong> Smart contracts cannot directly access off-chain data</li>
                        <li><strong>Limited Computational Resources:</strong> Complex operations may be expensive or impossible</li>
                  </ul>
                  
                  <div className="bg-muted p-4 rounded-lg my-6">
                    <h4 className="flex items-center font-medium">
                      <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                      Pro Tip
                    </h4>
                    <p className="mt-2 text-sm">
                      When designing smart contracts, always consider how the contract will handle edge cases and 
                      unexpected inputs. Security should be a priority from the start.
                    </p>
                  </div>
                      
                      <h3>External Learning Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                        <a 
                          href="https://www.cyfrin.io/updraft" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-purple-100 dark:bg-purple-900/20 p-2">
                              <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                            <h4 className="font-medium">Cyfrin Updraft</h4>
                </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Free blockchain and smart contract development courses from industry experts
                          </p>
                        </a>
                        <a 
                          href="https://docs.openzeppelin.com/contracts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium">OpenZeppelin Contracts</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Industry-standard library for secure smart contract development
                          </p>
                        </a>
                        <a 
                          href="https://ethereum.org/en/developers/docs/smart-contracts/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-indigo-100 dark:bg-indigo-900/20 p-2">
                              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="font-medium">Ethereum Documentation</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Official guides and tutorials from Ethereum.org
                          </p>
                        </a>
                        <a 
                          href="https://hardhat.org/tutorial" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-yellow-100 dark:bg-yellow-900/20 p-2">
                              <Code className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h4 className="font-medium">Hardhat Tutorial</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Hands-on tutorial for building and testing smart contracts
                          </p>
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'solidity' && (
                    <motion.div
                      key="solidity"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                  <p>
                    Solidity is the primary programming language for writing smart contracts on Ethereum and Hedera. 
                        It's a statically-typed language designed specifically for developing smart contracts that run on 
                        the Ethereum Virtual Machine (EVM). Influenced by C++, Python, and JavaScript, Solidity provides 
                        the tools needed to build complex decentralized applications.
                  </p>
                  
                      <h3>Basic Structure of a Solidity Contract</h3>
                      <pre className="bg-black/90 p-6 rounded-lg overflow-x-auto text-sm my-6 shadow-md">
                        <code className="text-gray-100 font-mono">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    // State variables
    address public owner;
    uint256 public value;
    
    // Events
    event ValueChanged(uint256 newValue);
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Functions
    function setValue(uint256 _newValue) public {
        value = _newValue;
        emit ValueChanged(_newValue);
    }
}`}
                        </code>
                      </pre>
                      
                      <h3>Key Language Features</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 not-prose">
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2">Data Types</h4>
                          <ul className="text-sm space-y-2">
                            <li><strong>Value Types:</strong> bool, int/uint, address, bytes, enum</li>
                            <li><strong>Reference Types:</strong> arrays, structs, mappings</li>
                            <li><strong>Special Types:</strong> contract types, function types</li>
                            <li><strong>Address Type:</strong> Used for Ethereum addresses, with methods like transfer() and call()</li>
                          </ul>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-5 border border-border">
                          <h4 className="text-lg font-medium mb-2">Control Structures</h4>
                          <ul className="text-sm space-y-2">
                            <li><strong>Conditionals:</strong> if, else, ternary operator</li>
                            <li><strong>Loops:</strong> for, while, do-while</li>
                            <li><strong>Error Handling:</strong> require(), assert(), revert(), try/catch</li>
                            <li><strong>Function Modifiers:</strong> Used to modify function behavior</li>
                          </ul>
                        </div>
                      </div>
                  
                  <h3>Important Concepts</h3>
                  <ul>
                    <li><strong>State Variables:</strong> Permanently stored in contract storage</li>
                    <li><strong>Functions:</strong> Executable units of code</li>
                    <li><strong>Modifiers:</strong> Used to change the behavior of functions</li>
                    <li><strong>Events:</strong> Logging mechanisms that applications can subscribe to</li>
                    <li><strong>Gas:</strong> Computational cost paid to execute transactions</li>
                        <li><strong>Inheritance:</strong> Solidity supports multiple inheritance, allowing for code reuse and organization</li>
                        <li><strong>Libraries:</strong> Deployed once and reused by multiple contracts</li>
                        <li><strong>Interfaces:</strong> Define functions without implementation for cross-contract communication</li>
                      </ul>
                      
                      <h3>Solidity Best Practices</h3>
                      <div className="bg-yellow-500/10 p-5 rounded-lg my-6 border border-yellow-500/20">
                        <h4 className="flex items-center font-medium text-yellow-500 mb-3">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Security Best Practices
                        </h4>
                        <ul className="text-sm space-y-2">
                          <li>• <strong>Lock Pragmas:</strong> Use specific compiler versions (e.g., <code>pragma solidity 0.8.4;</code>)</li>
                          <li>• <strong>Explicitly Mark Visibility:</strong> Always specify function visibility (public, private, internal, external)</li>
                          <li>• <strong>Proper Error Handling:</strong> Use require(), assert(), and revert() appropriately</li>
                          <li>• <strong>Checks-Effects-Interactions Pattern:</strong> Perform all state changes before external calls</li>
                          <li>• <strong>Gas Considerations:</strong> Be mindful of operations that consume excessive gas</li>
                          <li>• <strong>Integer Overflow/Underflow:</strong> Use SafeMath library for Solidity versions before 0.8.0</li>
                  </ul>
                </div>
                      
                      <h3>Code Examples</h3>
                      
                      <h4>Function Visibility</h4>
                      <pre className="bg-black/90 p-4 rounded-lg overflow-x-auto text-sm">
                        <code className="text-gray-100">
{`contract VisibilityExample {
    // Private - only accessible within this contract
    function privateFunction() private pure returns (string memory) {
        return "Private";
    }
    
    // Internal - accessible within this contract and derived contracts
    function internalFunction() internal pure returns (string memory) {
        return "Internal";
    }
    
    // External - can only be called from outside the contract
    function externalFunction() external pure returns (string memory) {
        return "External";
    }
    
    // Public - can be called internally or externally
    function publicFunction() public pure returns (string memory) {
        return "Public";
    }
}`}
                        </code>
                      </pre>
                      
                      <h4>Error Handling</h4>
                      <pre className="bg-black/90 p-4 rounded-lg overflow-x-auto text-sm">
                        <code className="text-gray-100">
{`contract ErrorHandling {
    // require is used for input validation
    function requireExample(uint _value) public pure returns (uint) {
        require(_value > 0, "Value must be greater than zero");
        return _value;
    }
    
    // assert is used for internal error checking
    function assertExample(uint _a, uint _b) public pure returns (uint) {
        uint result = _a + _b;
        assert(result >= _a); // Should never fail unless there's an overflow
        return result;
    }
    
    // revert can be used to flag an error and revert state changes
    function revertExample(bool _condition) public pure {
        if (!_condition) {
            revert("Condition not met");
        }
    }
}`}
                        </code>
                      </pre>
                      
                      <h3>External Learning Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                        <a 
                          href="https://docs.soliditylang.org/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                            <h4 className="font-medium">Solidity Documentation</h4>
                </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Official Solidity language documentation with complete reference
                          </p>
                        </a>
                        <a 
                          href="https://cryptozombies.io/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-purple-100 dark:bg-purple-900/20 p-2">
                              <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-medium">CryptoZombies</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Interactive code school for learning Solidity through building games
                          </p>
                        </a>
                        <a 
                          href="https://consensys.io/blog/solidity-best-practices-for-smart-contract-security" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-green-100 dark:bg-green-900/20 p-2">
                              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-medium">Solidity Best Practices</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Security best practices for writing secure Solidity code
                          </p>
                        </a>
                        <a 
                          href="https://github.com/OpenZeppelin/openzeppelin-contracts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-red-100 dark:bg-red-900/20 p-2">
                              <Code2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h4 className="font-medium">OpenZeppelin Contracts</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Library of secure, reusable smart contract components
                          </p>
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {activeSection === 'hedera' && (
                    <motion.div
                      key="hedera"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                  <p>
                    Hedera is a public distributed ledger that uses the hashgraph consensus algorithm. 
                    It provides a platform for smart contracts with faster transaction speeds and lower fees 
                        compared to traditional blockchain networks. Hedera is designed to be a more efficient
                        and secure alternative to conventional blockchain platforms.
                      </p>
                      
                      <div className="not-prose my-8">
                        <div className="flex items-center justify-center">
                          <div className="bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-xl p-6 max-w-md">
                            <h3 className="text-xl font-semibold text-center mb-4">Key Advantages of Hedera</h3>
                            <ul className="space-y-3">
                              <li className="flex items-start">
                                <div className="bg-primary/10 p-1 rounded mr-2 mt-0.5">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                </div>
                                <span><strong>High Throughput:</strong> Process thousands of transactions per second</span>
                              </li>
                              <li className="flex items-start">
                                <div className="bg-primary/10 p-1 rounded mr-2 mt-0.5">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                </div>
                                <span><strong>Low Fees:</strong> Significantly lower transaction costs than Ethereum</span>
                              </li>
                              <li className="flex items-start">
                                <div className="bg-primary/10 p-1 rounded mr-2 mt-0.5">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                </div>
                                <span><strong>Energy Efficiency:</strong> Consumes less energy than proof-of-work blockchains</span>
                              </li>
                              <li className="flex items-start">
                                <div className="bg-primary/10 p-1 rounded mr-2 mt-0.5">
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                </div>
                                <span><strong>Finality:</strong> Transactions reach finality in seconds</span>
                              </li>
                  </ul>
                          </div>
                        </div>
                      </div>
                      
                      <h3>Hedera Services</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-6">
                        <div className="bg-background rounded-lg border border-border p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                          <div className="flex items-center mb-3">
                            <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                              <Code className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="font-medium">Smart Contract Service</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Enables deploying and executing Solidity smart contracts on the Hedera network.
                            Solidity contracts compiled for the EVM can run on Hedera with minimal modifications.
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                          <div className="flex items-center mb-3">
                            <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="font-medium">Token Service</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Built-in support for creating and managing fungible and non-fungible tokens without
                            requiring custom smart contracts, improving efficiency and reducing costs.
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                          <div className="flex items-center mb-3">
                            <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="font-medium">Consensus Service</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Provides a verifiable timestamp and ordering of events for applications
                            requiring high throughput and fair ordering of transactions.
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                          <div className="flex items-center mb-3">
                            <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="font-medium">File Service</h4>
                          </div>
                          <p className="text-sm text-foreground/80">
                            Enables distributed storage of files and data on the Hedera network with
                            tamper-proof properties and controlled access.
                          </p>
                        </div>
                      </div>
                      
                      <h3>Differences from Ethereum</h3>
                      <table className="w-full my-4">
                        <thead>
                          <tr>
                            <th className="text-left py-2 px-4 bg-muted/60">Feature</th>
                            <th className="text-left py-2 px-4 bg-muted/60">Hedera</th>
                            <th className="text-left py-2 px-4 bg-muted/60">Ethereum</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 border-b border-border">Consensus</td>
                            <td className="py-2 px-4 border-b border-border">Hashgraph</td>
                            <td className="py-2 px-4 border-b border-border">Proof of Stake (PoS)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border-b border-border">TPS</td>
                            <td className="py-2 px-4 border-b border-border">10,000+</td>
                            <td className="py-2 px-4 border-b border-border">15-30</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border-b border-border">Finality</td>
                            <td className="py-2 px-4 border-b border-border">3-5 seconds</td>
                            <td className="py-2 px-4 border-b border-border">~12 minutes</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border-b border-border">Native Token</td>
                            <td className="py-2 px-4 border-b border-border">HBAR</td>
                            <td className="py-2 px-4 border-b border-border">ETH</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4 border-b border-border">Gas Model</td>
                            <td className="py-2 px-4 border-b border-border">Fixed, predictable fees</td>
                            <td className="py-2 px-4 border-b border-border">Variable based on network congestion</td>
                          </tr>
                        </tbody>
                      </table>
                  
                  <div className="bg-muted p-4 rounded-lg my-6">
                    <p className="text-sm">
                      Unlike Ethereum, Hedera uses HBAR as its native cryptocurrency, and its gas model is different. 
                          Transactions on Hedera typically cost significantly less than on Ethereum, making it suitable for 
                          applications requiring high transaction volumes or frequent small transactions.
                    </p>
                  </div>
                      
                      <h3>External Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-4">
                        <a 
                          href="https://hedera.com/learning" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-green-100 dark:bg-green-900/20 p-2">
                              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                            <h4 className="font-medium">Hedera Learning Center</h4>
                </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Official educational resources from Hedera
                          </p>
                        </a>
                        <a 
                          href="https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium">Hedera Smart Contract Docs</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Developer documentation for smart contracts on Hedera
                          </p>
                        </a>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeSection === 'deployment' && (
                    <motion.div
                      key="deployment"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                  <p>
                    Deploying a smart contract to Hedera involves compiling your Solidity code to bytecode and 
                        then submitting it via the Hedera Smart Contract Service. This section covers the deployment process
                        and best practices for successful contract deployment.
                      </p>
                      
                      <h3>Deployment Steps Overview</h3>
                      <div className="bg-muted/30 p-5 rounded-lg border border-border mb-6">
                        <ol className="list-decimal pl-5 space-y-2 mb-0">
                          <li>Develop and thoroughly test your smart contract code</li>
                          <li>Compile your Solidity code to bytecode using a compatible compiler</li>
                    <li>Set up your Hedera client with account credentials</li>
                    <li>Submit the bytecode via a ContractCreateTransaction</li>
                          <li>Wait for the transaction to be processed and receive the contract ID</li>
                          <li>Store the contract ID for future interactions</li>
                          <li>Verify the contract deployment by testing its functions</li>
                  </ol>
                      </div>
                      
                      <h3>Detailed Deployment Process</h3>
                      
                      <h4>1. Preparation</h4>
                      <ul>
                        <li>Ensure all tests pass: unit tests, integration tests, security tests</li>
                        <li>Optimize your contract for gas efficiency</li>
                        <li>Consider having your code audited if it will manage significant value</li>
                        <li>Prepare documentation for users and developers</li>
                      </ul>
                      
                      <h4>2. Compilation</h4>
                      <p>
                        Your Solidity smart contract needs to be compiled into bytecode before deployment.
                        You can use tools like Hardhat, Truffle, Remix, or the Solidity compiler directly.
                      </p>
                      
                      <pre className="bg-black/90 p-4 rounded-lg overflow-x-auto text-sm">
                        <code className="text-gray-100">
{`// Example compilation command using solc
solc --bin --abi -o ./build MyContract.sol`}
                        </code>
                      </pre>
                      
                      <h4>3. Creating a Deployment Transaction</h4>
                      <p>
                        With the Hedera JavaScript SDK, deploying a contract looks like this:
                      </p>
                      
                      <pre className="bg-black/90 p-4 rounded-lg overflow-x-auto text-sm">
                        <code className="text-gray-100">
{`// Example JavaScript code for deploying to Hedera
const { Client, ContractCreateFlow } = require("@hashgraph/sdk");

async function deployContract() {
  // Configure client with your account
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  // Read the bytecode
  const bytecode = fs.readFileSync("./build/MyContract.bin");
  
  // Deploy the contract
  const contractCreateTx = new ContractCreateFlow()
    .setGas(100000)
    .setBytecode(bytecode)
    .setConstructorParameters(/* constructor parameters if any */);
    
  const contractCreateSubmit = await contractCreateTx.execute(client);
  const contractCreateRx = await contractCreateSubmit.getReceipt(client);
  
  // Get the contract ID
  const contractId = contractCreateRx.contractId;
  console.log("The contract ID is: " + contractId);
  
  return contractId;
}`}
                        </code>
                      </pre>
                      
                      <h4>4. Contract Verification</h4>
                      <p>
                        After deployment, verify your contract by:
                      </p>
                      <ul>
                        <li>Testing all key functions to ensure they work as expected</li>
                        <li>Checking the contract state to confirm initialization</li>
                        <li>Monitoring gas usage for optimization opportunities</li>
                      </ul>
                      
                      <h3>Deployment Environments</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose my-6">
                        <div className="bg-background rounded-lg border border-border p-5">
                          <h4 className="font-medium mb-2">Local Development</h4>
                          <p className="text-sm text-muted-foreground">
                            Use local development networks like Hardhat Network or Ganache for rapid testing and development
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-5">
                          <h4 className="font-medium mb-2">Testnet</h4>
                          <p className="text-sm text-muted-foreground">
                            Deploy to Hedera Testnet for testing in a production-like environment without real value at risk
                          </p>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-5">
                          <h4 className="font-medium mb-2">Mainnet</h4>
                          <p className="text-sm text-muted-foreground">
                            Final deployment to Hedera Mainnet for production use, where real HBAR is used
                          </p>
                        </div>
                      </div>
                      
                      <h3>Contract Upgrades</h3>
                      <p>
                        By default, smart contracts are immutable once deployed. To allow for upgrades:
                      </p>
                      <ul>
                        <li><strong>Proxy Pattern:</strong> Deploy a proxy contract that delegates calls to an implementation contract</li>
                        <li><strong>Diamond Pattern:</strong> Advanced pattern allowing modular upgrades</li>
                        <li><strong>Data Separation:</strong> Store data in a separate contract from logic</li>
                      </ul>
                      
                      <div className="bg-yellow-500/10 p-5 rounded-lg my-6 border border-yellow-500/20">
                        <h4 className="flex items-center font-medium text-yellow-500 mb-3">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Deployment Best Practices
                        </h4>
                        <ul className="text-sm space-y-2">
                          <li>• <strong>Gas Optimization:</strong> Review your contract for gas inefficiencies before deployment</li>
                          <li>• <strong>Security First:</strong> Consider security implications of every feature</li>
                          <li>• <strong>Test Thoroughly:</strong> Test all edge cases and failure modes</li>
                          <li>• <strong>Emergency Measures:</strong> Implement circuit breakers or pause functionality</li>
                          <li>• <strong>Documentation:</strong> Document the deployment process and contract interactions</li>
                        </ul>
                      </div>
                      
                      <p>With SmartScope, this entire deployment process is simplified to a few clicks, handling compilation, deployment, and verification automatically.</p>
                  
                  <div className="mt-6 bg-muted p-4 rounded-lg">
                        <h4 className="font-medium">Ready to try deploying a contract yourself?</h4>
                    <Button asChild className="mt-2">
                      <Link href="/create">
                        Go to Create Contract
                      </Link>
                    </Button>
                  </div>
                    </motion.div>
                  )}
                  
                  {activeSection === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                      <p>
                        Security is paramount in smart contract development. Once deployed, smart contracts are immutable and 
                        publicly visible, making them attractive targets for attackers. A single vulnerability can lead to 
                        significant financial losses, as history has shown with major hacks in the blockchain space.
                      </p>
                      
                      <h3>Common Smart Contract Vulnerabilities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-6">
                        <div className="bg-red-500/10 rounded-lg p-5 border border-red-500/20">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Reentrancy Attacks
                          </h4>
                          <p className="text-sm text-foreground/80">
                            Occurs when a contract calls an external contract before resolving its own state changes, 
                            allowing the external contract to recursively call back into the original function.
                          </p>
                          <div className="mt-2 bg-black/90 p-2 rounded text-xs text-gray-100 overflow-x-auto">
                            <pre>
                              <code>
{`// Vulnerable to reentrancy
function withdraw() public {
  uint amount = balances[msg.sender];
  (bool success, ) = msg.sender.call{value: amount}("");
  require(success, "Transfer failed");
  balances[msg.sender] = 0; // State updated AFTER external call
}`}
                              </code>
                            </pre>
                </div>
                        </div>
                        
                        <div className="bg-red-500/10 rounded-lg p-5 border border-red-500/20">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Integer Overflow/Underflow
                          </h4>
                          <p className="text-sm text-foreground/80">
                            When arithmetic operations exceed variable size limits, leading to unexpected values.
                            Solidity 0.8.0+ includes built-in overflow checking, but older contracts need SafeMath.
                          </p>
                          <div className="mt-2 bg-black/90 p-2 rounded text-xs text-gray-100 overflow-x-auto">
                            <code>
                              // Vulnerable pre-0.8.0<br/>
                              uint8 x = 255;<br/>
                              x = x + 1; // Overflows to 0<br/>
                              uint8 y = 0;<br/>
                              y = y - 1; // Underflows to 255
                            </code>
                          </div>
                        </div>
                        
                        <div className="bg-red-500/10 rounded-lg p-5 border border-red-500/20">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Access Control Flaws
                          </h4>
                          <p className="text-sm text-foreground/80">
                            Improper permission management that allows unauthorized users to execute privileged functions.
                          </p>
                          <div className="mt-2 bg-black/90 p-2 rounded text-xs text-gray-100 overflow-x-auto">
                            <pre>
                              <code>
{`// Missing access control
function transferOwnership(address newOwner) public {
  // Missing check for msg.sender == owner
  owner = newOwner;
}`}
                              </code>
                            </pre>
                          </div>
                        </div>
                        
                        <div className="bg-red-500/10 rounded-lg p-5 border border-red-500/20">
                          <h4 className="text-lg font-medium mb-2 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Front-Running
                          </h4>
                          <p className="text-sm text-foreground/80">
                            When attackers observe pending transactions and insert their own transactions with higher gas fees
                            to execute before the original transaction.
                          </p>
                          <div className="mt-2 bg-black/90 p-2 rounded text-xs text-gray-100 overflow-x-auto">
                            <pre>
                              <code>
{`// Vulnerable to front-running
function claimReward(bytes32 solution) public {
  if (keccak256(solution) == puzzleHash) {
    msg.sender.transfer(reward); // Can be front-run
  }
}`}
                              </code>
                            </pre>
                          </div>
                        </div>
                      </div>
                      
                      <h3>Advanced Vulnerabilities</h3>
                      <ul>
                        <li><strong>Oracle Manipulation:</strong> Manipulating the input data from external oracles to influence contract outcomes</li>
                        <li><strong>Flash Loan Attacks:</strong> Using large borrowed amounts to manipulate market prices within a single transaction</li>
                        <li><strong>Denial of Service:</strong> Making contracts unusable by exploiting gas limits or logical constraints</li>
                        <li><strong>Block Timestamp Manipulation:</strong> Exploiting the miner's ability to adjust block timestamps slightly</li>
                        <li><strong>Signature Replay:</strong> Reusing signatures intended for one-time use across multiple transactions</li>
                      </ul>
                      
                      <h3>Security Best Practices</h3>
                      
                      <h4>1. Secure Coding Patterns</h4>
                      <div className="bg-muted p-4 rounded-lg my-4">
                        <ul className="space-y-2 text-sm mb-0">
                          <li>
                            <strong>Checks-Effects-Interactions Pattern:</strong> Always perform state changes before external calls
                            <div className="bg-black/90 p-2 rounded mt-1 text-xs text-gray-100 overflow-x-auto">
                              <pre>
                                <code>
{`// Secure pattern
function withdraw() public {
  uint amount = balances[msg.sender]; // Check
  balances[msg.sender] = 0; // Effect
  (bool success, ) = msg.sender.call{value: amount}(""); // Interaction
  require(success, "Transfer failed");
}`}
                                </code>
                              </pre>
                            </div>
                          </li>
                          <li>
                            <strong>Pull over Push Payments:</strong> Let users withdraw funds rather than pushing payments to them
                          </li>
                          <li>
                            <strong>Guard Checks:</strong> Use require statements to validate inputs and preconditions
                          </li>
                          <li>
                            <strong>Emergency Stop:</strong> Implement circuit breaker patterns for critical issues
                          </li>
                        </ul>
                      </div>
                      
                      <h4>2. Defensive Testing</h4>
                      <ul>
                        <li><strong>Unit Tests:</strong> Test individual functions in isolation</li>
                        <li><strong>Integration Tests:</strong> Test interactions between contract components</li>
                        <li><strong>Fuzz Testing:</strong> Test with randomly generated inputs to find edge cases</li>
                        <li><strong>Invariant Testing:</strong> Verify that critical properties always hold true</li>
                        <li><strong>Simulation:</strong> Model and simulate attacks to test defenses</li>
                      </ul>
                      
                      <h4>3. Static Analysis and Formal Verification</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-6 mt-4">
                        <div className="bg-background rounded-lg border border-border p-4">
                          <h5 className="font-medium mb-2">Static Analysis Tools</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Slither: Automated vulnerability detector</li>
                            <li>• Mythril: Security analysis tool</li>
                            <li>• Solhint: Linter for best practices</li>
                          </ul>
                        </div>
                        <div className="bg-background rounded-lg border border-border p-4">
                          <h5 className="font-medium mb-2">Formal Verification</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Mathematical proof of correctness</li>
                            <li>• Tools like Certora Prover</li>
                            <li>• Verification of critical invariants</li>
                          </ul>
                        </div>
                      </div>
                      
                      <h4>4. Professional Audits</h4>
                      <p>
                        For contracts managing significant value, consider professional audits from reputable security firms.
                        They bring specialized expertise and tools to identify vulnerabilities that automated tools might miss.
                      </p>
                      
                      <h3>Security Resources</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                        <a 
                          href="https://consensys.github.io/smart-contract-best-practices/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium">ConsenSys Best Practices</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Comprehensive guide to smart contract security best practices
                          </p>
                        </a>
                        <a 
                          href="https://swcregistry.io/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-red-100 dark:bg-red-900/20 p-2">
                              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h4 className="font-medium">Smart Contract Weakness Registry</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Catalog of known smart contract vulnerabilities
                          </p>
                        </a>
                        <a 
                          href="https://ethernaut.openzeppelin.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-green-100 dark:bg-green-900/20 p-2">
                              <Swords className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-medium">Ethernaut</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Interactive challenges to learn about security vulnerabilities
                          </p>
                        </a>
                        <a 
                          href="https://github.com/crytic/building-secure-contracts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-purple-100 dark:bg-purple-900/20 p-2">
                              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-medium">Trail of Bits Security Guide</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Guidelines and training materials for secure contract development
                          </p>
                        </a>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeSection === 'example-contracts' && (
                    <motion.div
                      key="example-contracts"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                      <p>
                        Below are well-crafted examples of smart contracts that demonstrate common patterns and use cases. 
                        These examples are designed to be educational and serve as a foundation for your own smart contract development.
                      </p>
                      
                      <div className="mt-8 space-y-10">
                        {/* Simple Token Contract */}
                        <div>
                          <h3 className="flex items-center text-xl font-semibold mb-4">
                            <Coins className="h-5 w-5 mr-2 text-amber-500" />
                            Token Contract
                          </h3>
                          <div className="bg-muted p-5 rounded-lg overflow-auto">
                            <pre className="text-sm">
                              <code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1 million tokens
    
    constructor() ERC20("Simple Token", "SIM") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    // Mint new tokens (only owner)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    // Burn tokens from the caller's account
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}`}</code>
                            </pre>
                          </div>
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p>This example demonstrates a simple ERC20 token with minting and burning capabilities. It uses OpenZeppelin's standard contracts for security and reliability.</p>
                          </div>
                        </div>
                        
                        {/* Crowdfunding Contract */}
                        <div>
                          <h3 className="flex items-center text-xl font-semibold mb-4">
                            <Users className="h-5 w-5 mr-2 text-blue-500" />
                            Simple Crowdfunding Contract
                          </h3>
                          <div className="bg-muted p-5 rounded-lg overflow-auto">
                            <pre className="text-sm">
                              <code>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    address public creator;
    uint public goal;
    uint public deadline;
    mapping(address => uint) public contributions;
    uint public totalRaised;
    bool public goalReached;
    bool public campaignClosed;
    
    event ContributionReceived(address contributor, uint amount);
    event GoalReached(uint totalRaised);
    event RefundIssued(address contributor, uint amount);
    event PayoutIssued(address creator, uint amount);
    
    constructor(uint _goal, uint _durationInDays) {
        creator = msg.sender;
        goal = _goal;
        deadline = block.timestamp + (_durationInDays * 1 days);
        goalReached = false;
        campaignClosed = false;
    }
    
    function contribute() public payable {
        require(!campaignClosed, "Campaign is closed");
        require(block.timestamp < deadline, "Campaign has ended");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        
        emit ContributionReceived(msg.sender, msg.value);
        
        if (totalRaised >= goal) {
            goalReached = true;
            emit GoalReached(totalRaised);
        }
    }
    
    function checkGoalReached() public {
        require(block.timestamp >= deadline, "Campaign has not ended yet");
        require(!campaignClosed, "Campaign already closed");
        
        if (totalRaised >= goal) {
            goalReached = true;
        }
    }
    
    function withdrawFunds() public {
        require(msg.sender == creator, "Only creator can withdraw funds");
        require(goalReached, "Goal not reached");
        require(!campaignClosed, "Campaign already closed");
        
        campaignClosed = true;
        payable(creator).transfer(totalRaised);
        
        emit PayoutIssued(creator, totalRaised);
    }
    
    function requestRefund() public {
        require(block.timestamp >= deadline, "Campaign has not ended yet");
        require(!goalReached, "Goal was reached, no refunds available");
        require(!campaignClosed, "Campaign already closed");
        require(contributions[msg.sender] > 0, "No contributions found");
        
        uint amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        
        payable(msg.sender).transfer(amount);
        
        emit RefundIssued(msg.sender, amount);
    }
    
    function getRemainingTime() public view returns (uint) {
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
}`}</code>
                            </pre>
                          </div>
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p>This crowdfunding contract allows users to contribute funds toward a goal. If the goal is reached before the deadline, the creator can withdraw the funds. Otherwise, contributors can request refunds.</p>
                          </div>
                        </div>
                        
                        {/* More Examples */}
                        <div>
                          <h3 className="text-xl font-semibold mb-4">More Examples</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <h4 className="font-medium flex items-center">
                                <Image className="h-4 w-4 mr-2 text-purple-500" />
                                <a href="https://docs.openzeppelin.com/contracts/5.x/erc721" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="hover:text-primary transition-colors">
                                  NFT Creation Template
                                </a>
                              </h4>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Create your own non-fungible tokens following the ERC-721 standard.
                              </p>
                            </div>
                            
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <h4 className="font-medium flex items-center">
                                <Scale className="h-4 w-4 mr-2 text-green-500" />
                                <a href="https://docs.openzeppelin.com/contracts/5.x/governance" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="hover:text-primary transition-colors">
                                  DAO Governance Templates
                                </a>
                              </h4>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Implement decentralized voting and governance mechanisms.
                              </p>
                            </div>
                            
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <h4 className="font-medium flex items-center">
                                <ShoppingCart className="h-4 w-4 mr-2 text-blue-500" />
                                <a href="https://docs.openzeppelin.com/contracts/5.x/utilities" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="hover:text-primary transition-colors">
                                  Marketplace Contract
                                </a>
                              </h4>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Create a decentralized marketplace for buying and selling digital assets.
                              </p>
                            </div>
                            
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <h4 className="font-medium flex items-center">
                                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                                <a href="https://docs.openzeppelin.com/contracts/5.x/api/finance" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="hover:text-primary transition-colors">
                                  Staking Rewards Contract
                                </a>
                              </h4>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Implement a staking mechanism with time-based rewards distribution.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeSection === 'learning-resources' && (
                    <motion.div
                      key="learning-resources"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose prose-lg dark:prose-invert max-w-none"
                    >
                      <p>
                        Continue your smart contract development journey with these valuable external resources.
                        We've curated the best documentation, tutorials, tools, and communities to help you expand your knowledge.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose mb-6 mt-8">
                        <div className="bg-background rounded-xl shadow-sm border border-border p-5">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <BookOpen className="h-5 w-5 mr-2 text-primary" /> 
                            Documentation
                          </h3>
                          <ul className="space-y-3 text-sm">
                            <li>
                              <a 
                                href="https://docs.soliditylang.org/" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Solidity Documentation
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://docs.hedera.com/hedera/" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Hedera Documentation
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://docs.openzeppelin.com/contracts/" 
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                OpenZeppelin Contracts
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://ethereum.org/en/developers/docs/" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Ethereum Developer Docs
                              </a>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-background rounded-xl shadow-sm border border-border p-5">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Code className="h-5 w-5 mr-2 text-primary" /> 
                            Tutorials & Courses
                          </h3>
                          <ul className="space-y-3 text-sm">
                            <li>
                              <a 
                                href="https://www.cyfrin.io/updraft" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Cyfrin Updraft Courses
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://cryptozombies.io/" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                CryptoZombies
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://www.smartcontract.engineer/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Smart Contract Engineer
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://university.alchemy.com/"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Alchemy University
                              </a>
                            </li>
                          </ul>
                        </div>
                        
                        <div className="bg-background rounded-xl shadow-sm border border-border p-5">
                          <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <Shield className="h-5 w-5 mr-2 text-primary" /> 
                            Security & Best Practices
                          </h3>
                          <ul className="space-y-3 text-sm">
                            <li>
                              <a 
                                href="https://consensys.github.io/smart-contract-best-practices/"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Consensys Best Practices
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://swcregistry.io/"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Smart Contract Weakness Registry
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://ethernaut.openzeppelin.com/"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Ethernaut (Security Challenges)
                              </a>
                            </li>
                            <li>
                              <a 
                                href="https://github.com/crytic/not-so-smart-contracts"
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="flex items-center text-foreground hover:text-primary transition-colors"
                              >
                                <ArrowRight className="h-3 w-3 mr-2" />
                                Examples of Common Vulnerabilities
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-5 border border-border mt-6">
                        <h3 className="text-lg font-semibold mb-4">Development Tools</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 not-prose">
                          <a 
                            href="https://remix.ethereum.org/" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-background rounded-md hover:bg-primary/5 transition-colors"
                          >
                            <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/20 rounded-full mr-3">
                              <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <div className="font-medium">Remix</div>
                              <div className="text-xs text-muted-foreground">Browser-based IDE</div>
                            </div>
                          </a>
                          <a 
                            href="https://hardhat.org/" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-background rounded-md hover:bg-primary/5 transition-colors"
                          >
                            <div className="w-8 h-8 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/20 rounded-full mr-3">
                              <Code className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <div className="font-medium">Hardhat</div>
                              <div className="text-xs text-muted-foreground">Development environment</div>
                            </div>
                          </a>
                          <a 
                            href="https://book.getfoundry.sh/" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-background rounded-md hover:bg-primary/5 transition-colors"
                          >
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 rounded-full mr-3">
                              <Code className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium">Foundry</div>
                              <div className="text-xs text-muted-foreground">Rust-based testing toolkit</div>
                            </div>
                          </a>
                        </div>
                      </div>
                      
                      <h3 className="mt-8">Online Communities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                        <a 
                          href="https://ethereum.stackexchange.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-blue-100 dark:bg-blue-900/20 p-2">
                              <MessagesSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h4 className="font-medium">Ethereum Stack Exchange</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Q&A forum for blockchain development questions
                          </p>
                        </a>
                        <a 
                          href="https://discord.com/invite/ethereum-dev" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-purple-100 dark:bg-purple-900/20 p-2">
                              <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h4 className="font-medium">Ethereum Dev Discord</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Community chat for blockchain developers
                          </p>
                        </a>
                        <a 
                          href="https://forum.openzeppelin.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-green-100 dark:bg-green-900/20 p-2">
                              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="font-medium">OpenZeppelin Forum</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Discussion forum for smart contract development
                          </p>
                        </a>
                        <a 
                          href="https://discord.com/invite/hedera" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex flex-col p-4 border border-border hover:border-primary/50 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="mr-3 rounded-md bg-pink-100 dark:bg-pink-900/20 p-2">
                              <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                            </div>
                            <h4 className="font-medium">Hedera Discord</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Community for Hedera developers and users
                          </p>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {/* Section completion controls */}
                <div className="mt-8 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {completedSections.includes(activeSection) ? (
                        <span className="flex items-center text-green-500">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Completed
                        </span>
                      ) : (
                        <span>Mark this section when you're done</span>
                      )}
                    </div>
                    <Button 
                      variant={completedSections.includes(activeSection) ? "outline" : "default"}
                      onClick={() => toggleSectionCompletion(activeSection)}
                      className={completedSections.includes(activeSection) ? "border-green-500/20 text-green-500" : ""}
                    >
                      {completedSections.includes(activeSection) ? "Mark as Incomplete" : "Mark as Complete"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-muted-foreground">{completedSections.length}/{sections.length} sections completed</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
              </div>
              
              {/* Enhanced call to action */}
              <motion.div 
                className="rounded-lg bg-gradient-to-r from-primary/20 to-blue-500/20 p-8 text-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-2xl font-bold mb-4">Ready to Apply Your Knowledge?</h3>
                <p className="text-lg mb-6">
                  Now that you've learned the essentials, it's time to create your own smart contract.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button asChild size="lg" className="gap-2">
                  <Link href="/create">
                      <GraduationCap className="h-5 w-5" />
                      Start Building
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/community">
                      <Coffee className="h-5 w-5" />
                      Join Community
                  </Link>
                </Button>
              </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
} 