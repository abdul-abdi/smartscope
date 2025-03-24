'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, Search, FileCode, EyeIcon, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/providers/toast-provider';

const ExistingContractPage = () => {
  const [contractId, setContractId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractId.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a valid contract ID',
        type: 'error',
      });
      return;
    }
    
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Redirect to analysis page
      window.location.href = `/interact/${contractId}`;
    }, 1500);
  };
  
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <section className="relative py-16 md:py-24">
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
              Analyze Existing Contracts
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Explore and interact with smart contracts already deployed on the Hedera network
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contract Search Form */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-2xl mx-auto bg-background/50 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 p-6 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
          >
            <h2 className="text-2xl font-bold mb-6">Enter Contract Details</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <Label htmlFor="contractId">Contract ID or Address</Label>
                <div className="mt-2 relative">
                  <Input 
                    id="contractId"
                    placeholder="e.g. 0.0.1234567 or 0x..."
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Search className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter the Hedera contract ID (0.0.XXXXX) or a Solidity address (0x...)
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
                    Analyzing Contract
                  </>
                ) : (
                  <>
                    Analyze Contract
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Recent Contracts Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center mb-8">
              <motion.div 
                className="h-1 w-12 bg-gradient-to-r from-primary to-purple-500 rounded-full mr-4"
                initial={{ width: 0 }}
                whileInView={{ width: 48 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              />
              <h2 className="text-2xl font-bold">Recently Analyzed Contracts</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  id: '0.0.1234567',
                  name: 'Token Contract',
                  description: 'ERC-20 compatible token with custom transfer rules',
                  functions: 12,
                  lastViewed: '2 hours ago'
                },
                {
                  id: '0.0.7654321',
                  name: 'Voting System',
                  description: 'Decentralized voting mechanism with time-locked results',
                  functions: 8,
                  lastViewed: '1 day ago'
                },
                {
                  id: '0.0.9876543',
                  name: 'NFT Marketplace',
                  description: 'Marketplace for trading non-fungible tokens with royalties',
                  functions: 18,
                  lastViewed: '3 days ago'
                },
                {
                  id: '0.0.3456789',
                  name: 'Escrow Contract',
                  description: 'Time-based escrow with arbitration capabilities',
                  functions: 10,
                  lastViewed: '1 week ago'
                },
              ].map((contract, i) => (
                <motion.div
                  key={i}
                  className="bg-background/50 backdrop-blur-sm rounded-lg border border-border/50 p-5 hover:border-primary/50 hover:shadow-md transition-all"
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 * i }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <FileCode className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">{contract.lastViewed}</p>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-1">{contract.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{contract.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      ID: {contract.id.substring(0, 6)}...
                    </p>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/interact/${contract.id}`}>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Resources Section */}
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
              <h2 className="text-2xl font-bold mb-4">Helpful Resources</h2>
              <p className="mb-6">
                Explore these resources to learn more about finding and interacting with contracts on Hedera.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Hedera Explorer',
                    description: 'Official block explorer for the Hedera network',
                    link: 'https://hashscan.io/'
                  },
                  {
                    title: 'Smart Contract Documentation',
                    description: 'Learn about smart contracts on Hedera',
                    link: '/learn#hedera'
                  },
                  {
                    title: 'Contract Interaction Guide',
                    description: 'How to safely interact with existing contracts',
                    link: '/learn#interaction'
                  },
                  {
                    title: 'Developer Community',
                    description: 'Join the Hedera developer community',
                    link: 'https://hedera.com/discord'
                  }
                ].map((resource, i) => (
                  <motion.a
                    href={resource.link}
                    target={resource.link.startsWith('http') ? '_blank' : undefined}
                    rel={resource.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                    key={i}
                    className="flex items-start p-4 rounded-lg hover:bg-background/80 transition-colors group"
                    whileHover={{ 
                      y: -2,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      transition: { duration: 0.2 }
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.3 + (i * 0.1) }}
                  >
                    <div className="mr-3 mt-1">
                      <ExternalLink className="h-5 w-5 text-primary group-hover:text-primary/80" />
                    </div>
                    <div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {resource.description}
                      </p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ExistingContractPage; 