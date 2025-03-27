'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, Wallet, Box, Loader2, List, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/providers/toast-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import Link from 'next/link';
import { formatToEvmAddress } from '../../app/utils/contract-utils';

type SmartContract = {
  contract_id: string;
  evm_address: string;
  created_timestamp: string;
  memo?: string;
  admin_key?: any;
  runtime_bytecode?: string;
  name?: string; // Could be derived from transaction history or ABI
  type?: string; // Contract type if can be determined
  transaction_id?: string;
};

const WalletContractsPage = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  
  const fetchContracts = async (address: string) => {
    setStatusMessage('Searching for contracts...');
    
    try {
      // Call the API to fetch contracts for this wallet
      const response = await fetch(`/api/get-wallet-contracts?address=${address}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching contracts: ${response.statusText}`);
      }
      
      setStatusMessage('Processing results...');
      
      const data = await response.json();
      
      if (data.contracts && Array.isArray(data.contracts)) {
        setContracts(data.contracts);
        
        const count = data.contracts.length;
        setStatusMessage(`Found ${count} contract${count !== 1 ? 's' : ''}`);
        
        if (count > 0) {
          toast({
            title: 'Contracts Retrieved',
            description: `Found ${count} contract${count !== 1 ? 's' : ''} for this wallet`,
            type: 'success',
          });
        } else {
          setStatusMessage('No contracts found');
          
          toast({
            title: 'No Contracts Found',
            description: isRetrying 
              ? 'Still no contracts found. Try a different address format or wallet.'
              : 'No smart contracts were found for this wallet address',
            type: 'info',
          });
        }
      } else {
        setContracts([]);
        setStatusMessage('No contracts found');
        
        toast({
          title: 'No Contracts Found',
          description: 'No smart contracts were found for this wallet address',
          type: 'info',
        });
      }
    } catch (error: any) {
      console.error('Error fetching wallet contracts:', error);
      setStatusMessage('Error fetching contracts');
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch contracts for this wallet',
        type: 'error',
      });
      setContracts([]);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a valid wallet address',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    setStatusMessage('Preparing request...');
    
    // Format the wallet address if needed
    const formattedAddress = formatToEvmAddress(walletAddress);
    
    await fetchContracts(formattedAddress);
  };

  // Function to retry with alternative address format
  const handleRetry = async () => {
    if (loading || !walletAddress) return;
    
    setIsRetrying(true);
    setLoading(true);
    
    // Try with an alternative format
    let alternativeAddress = walletAddress;
    
    if (walletAddress.includes('.')) {
      // If it's in Hedera format (0.0.X), try converting to EVM format
      const parts = walletAddress.split('.');
      if (parts.length === 3) {
        alternativeAddress = '0x' + parts[2].padStart(40, '0');
        toast({
          title: 'Retrying with EVM format',
          description: `Converted ${walletAddress} to ${alternativeAddress}`,
          type: 'info',
        });
      }
    } else if (walletAddress.startsWith('0x')) {
      // If it's in EVM format, try extracting the account ID
      const numericPart = walletAddress.substring(walletAddress.length - 8);
      try {
        const num = parseInt(numericPart, 16);
        alternativeAddress = `0.0.${num}`;
        toast({
          title: 'Retrying with Hedera account format',
          description: `Trying with account ID: ${alternativeAddress}`,
          type: 'info',
        });
      } catch (e) {
        alternativeAddress = walletAddress;
      }
    }
    
    await fetchContracts(alternativeAddress);
  };

  // Determine contract type if possible based on bytecode or known patterns
  const guessContractType = (contract: SmartContract) => {
    // If contract has no bytecode, try to determine from other properties
    if (!contract.runtime_bytecode) {
      // Check if there might be a memo or name that gives us a hint
      const memo = contract.memo?.toLowerCase() || '';
      const name = contract.name?.toLowerCase() || '';
      
      if (memo.includes('token') || name.includes('token') || 
          memo.includes('erc20') || name.includes('erc20')) {
        return 'Token Contract';
      } else if (memo.includes('nft') || name.includes('nft') || 
                memo.includes('erc721') || name.includes('erc721')) {
        return 'NFT Contract';
      }
      
      return 'Smart Contract';
    }
    
    // For bytecode analysis, look for hex patterns that indicate common function signatures
    const bytecode = contract.runtime_bytecode;
    
    // Common ERC20 function signatures in hex
    if (bytecode.includes('18160ddd') || // totalSupply
        bytecode.includes('70a08231') || // balanceOf
        bytecode.includes('a9059cbb') || // transfer
        bytecode.includes('dd62ed3e') || // allowance
        bytecode.includes('095ea7b3')) { // approve
      return 'Token Contract';
    } 
    // Common ERC721 function signatures in hex
    else if (bytecode.includes('6352211e') || // ownerOf
             bytecode.includes('c87b56dd') || // tokenURI
             bytecode.includes('42842e0e')) { // safeTransferFrom
      return 'NFT Contract';
    }
    // Governance patterns
    else if (bytecode.includes('voting') || 
             bytecode.includes('governance') ||
             bytecode.includes('proposal')) {
      return 'Governance';
    }
    
    return 'Smart Contract';
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      // Check if timestamp is in seconds (Hedera format) or milliseconds
      const ts = parseFloat(timestamp);
      const date = ts > 1000000000000 ? new Date(ts) : new Date(ts * 1000);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <section className="relative py-12 md:py-16 mb-0">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, -20, 0],
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
              Wallet Contract Explorer
            </h1>
            <p className="text-xl text-foreground/80 mb-2">
              Discover all smart contracts deployed by a wallet address on Hedera testnet
            </p>
          </motion.div>
        </div>
      </section>

      {/* Wallet Search Form */}
      <section className="pt-2 pb-4">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-2xl mx-auto bg-background/50 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
          >
            <h2 className="text-2xl font-bold mb-6">Enter Wallet Address</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <Label htmlFor="walletAddress">Wallet Address</Label>
                <div className="mt-2 relative">
                  <Input 
                    id="walletAddress"
                    placeholder="e.g. 0.0.1234567 or 0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter a Hedera account ID (0.0.XXXXX) or EVM address (0x...)
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full group"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {statusMessage || 'Searching Contracts'}
                  </>
                ) : (
                  <>
                    Find Contracts
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
            
            {hasSearched && !loading && (
              <div className="text-center mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {statusMessage}
                </p>
                
                {contracts.length === 0 && !isRetrying && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    className="mt-2"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Try Alternative Format
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      {hasSearched && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <motion.div
              className="max-w-5xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-8">
                <motion.div 
                  className="h-1 w-12 bg-gradient-to-r from-primary to-purple-500 rounded-full mr-4"
                  initial={{ width: 0 }}
                  animate={{ width: 48 }}
                  transition={{ duration: 0.5 }}
                />
                <h2 className="text-2xl font-bold">Contract Results</h2>
                {contracts.length > 0 && (
                  <Badge variant="outline" className="ml-3">
                    {contracts.length} Found
                  </Badge>
                )}
              </div>
              
              {contracts.length === 0 ? (
                <motion.div
                  className="bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 p-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Contracts Found</h3>
                    <p className="text-muted-foreground mb-6">
                      This wallet hasn't deployed any contracts on Hedera testnet yet.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" asChild>
                        <Link href="/create">
                          Deploy Your First Contract
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      
                      {!isRetrying && (
                        <Button 
                          variant="secondary" 
                          onClick={handleRetry}
                        >
                          Try Alternative Format
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-border/50">
                    <h4 className="text-lg font-medium mb-4">Example: What You'll See</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Here's an example of what contract information looks like for a wallet with deployments:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="h-full border-dashed border-muted-foreground/30">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center text-muted-foreground">
                                <Box className="h-5 w-5 mr-2 text-muted-foreground" />
                                Token Example
                              </CardTitle>
                              <CardDescription className="pt-1">
                                Created: Yesterday, 3:45 PM
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="opacity-70">
                              Token Contract
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2 text-muted-foreground/80">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <span className="text-muted-foreground/70 w-24">Contract ID:</span>
                              <code className="bg-muted/70 px-1 rounded text-xs">0.0.1234567</code>
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="text-muted-foreground/70 w-24">EVM Address:</span>
                              <code className="bg-muted/70 px-1 rounded text-xs truncate max-w-[180px]">
                                0x000000000000000000000000000000000012D687
                              </code>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2 opacity-60">
                          <div className="flex justify-between w-full">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              HashScan
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              disabled
                            >
                              Interact
                              <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    
                      <div className="hidden md:block">
                        <Card className="h-full border-dashed border-muted-foreground/30">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg flex items-center text-muted-foreground">
                                  <Box className="h-5 w-5 mr-2 text-muted-foreground" />
                                  NFT Collection
                                </CardTitle>
                                <CardDescription className="pt-1">
                                  Created: Last week
                                </CardDescription>
                              </div>
                              <Badge variant="secondary" className="opacity-70">
                                NFT Contract
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2 text-muted-foreground/80">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <span className="text-muted-foreground/70 w-24">Contract ID:</span>
                                <code className="bg-muted/70 px-1 rounded text-xs">0.0.7654321</code>
                              </div>
                              <div className="flex items-center text-sm">
                                <span className="text-muted-foreground/70 w-24">EVM Address:</span>
                                <code className="bg-muted/70 px-1 rounded text-xs truncate max-w-[180px]">
                                  0x000000000000000000000000000000000074CB31
                                </code>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2 opacity-60">
                            <div className="flex justify-between w-full">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                HashScan
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm" 
                                disabled
                              >
                                Interact
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-4">
                      Try searching for <span className="text-primary font-medium">0.0.3</span> or <span className="text-primary font-medium">0x0000000000000000000000000000000000000003</span> to see an example.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Note:</span> Hedera uses multiple address formats. Try both Hedera format (0.0.X) and EVM format (0x...) for best results.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {contracts.map((contract, index) => (
                    <motion.div
                      key={contract.contract_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="h-full hover:border-primary/50 transition-colors overflow-hidden group">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center">
                                <Box className="h-5 w-5 mr-2 text-primary" />
                                {contract.name || `Contract ${contract.contract_id?.split('.').pop() || 'Unknown'}`}
                              </CardTitle>
                              <CardDescription className="pt-1">
                                Created: {formatDate(contract.created_timestamp)}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary">
                              {guessContractType(contract)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm">
                              <span className="text-muted-foreground w-24">Contract ID:</span>
                              <code className="bg-muted px-1 rounded text-xs">{contract.contract_id}</code>
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="text-muted-foreground w-24">EVM Address:</span>
                              <code className="bg-muted px-1 rounded text-xs truncate max-w-[180px]">
                                {contract.evm_address || 'N/A'}
                              </code>
                            </div>
                            {contract.memo && (
                              <div className="flex items-start text-sm">
                                <span className="text-muted-foreground w-24">Memo:</span>
                                <p className="text-sm">{contract.memo}</p>
                              </div>
                            )}
                            {contract.transaction_id && (
                              <div className="flex items-start text-sm">
                                <span className="text-muted-foreground w-24">Transaction:</span>
                                <a 
                                  href={`https://hashscan.io/testnet/transaction/${contract.transaction_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline truncate max-w-[180px]"
                                >
                                  {contract.transaction_id}
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          <div className="flex justify-between w-full">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                            >
                              <a 
                                href={`https://hashscan.io/testnet/contract/${contract.contract_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                HashScan
                              </a>
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              asChild
                              className="group-hover:bg-primary group-hover:text-white transition-colors"
                            >
                              <Link href={`/interact/${contract.contract_id}`}>
                                Interact
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Resources and Info Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto rounded-2xl p-8 relative overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Glowing background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl" />
            
            {/* Border glow */}
            <div className="absolute inset-0 rounded-2xl border border-primary/20 backdrop-blur-sm" />
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">About Wallet Contract Explorer</h2>
              <p className="text-foreground/80 mb-4">
                This tool allows you to discover all smart contracts deployed from a specific wallet address on the Hedera testnet.
                Whether you're trying to audit your own deployments or researching another developer's contracts, this explorer
                provides a comprehensive view of contract deployments.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="bg-background/40 backdrop-blur-sm rounded-lg p-5 border border-border/40">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <List className="h-5 w-5 mr-2 text-primary" />
                    Features
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 mr-1 text-primary mt-0.5" />
                      <span>View all contracts deployed by a wallet</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 mr-1 text-primary mt-0.5" />
                      <span>Direct access to contract interactions</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-4 w-4 mr-1 text-primary mt-0.5" />
                      <span>Links to HashScan for detailed blockchain info</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-background/40 backdrop-blur-sm rounded-lg p-5 border border-border/40">
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <ExternalLink className="h-5 w-5 mr-2 text-primary" />
                    External Resources
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex items-start">
                      <a 
                        href="https://docs.hedera.com/hedera/sdks-and-apis/rest-api/smart-contracts" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 mr-1 mt-0.5" />
                        Hedera Mirror Node API Documentation
                      </a>
                    </li>
                    <li className="flex items-start">
                      <a 
                        href="https://hashscan.io/testnet" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 mr-1 mt-0.5" />
                        HashScan Explorer
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default WalletContractsPage; 