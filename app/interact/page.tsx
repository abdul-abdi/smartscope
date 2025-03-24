'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Cpu, Code, Zap, CodeSquare, FileCode, RotateCw, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/providers/toast-provider';

export default function InteractPage() {
  const [contractAddress, setContractAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractAddress.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a valid contract address',
        type: 'error',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simulate checking contract exists
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = `/interact/${contractAddress}`;
    }, 1500);
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
              Interact With Smart Contracts
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Connect with deployed contracts on Hedera network and execute functions with real-time feedback
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Contract Input */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Enter Contract Information</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="contractAddress" className="mb-2 block">Contract Address</Label>
                  <div className="relative">
                    <Input
                      id="contractAddress"
                      placeholder="e.g. 0.0.1234567 or 0x..."
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Code className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter the Hedera contract ID or Solidity address
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting to Contract
                    </>
                  ) : (
                    <>
                      Connect to Contract
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-border/40">
                <p className="text-sm text-muted-foreground mb-4">Don't have a contract address?</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/create">
                      <FileCode className="mr-2 h-4 w-4" />
                      Create New Contract
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/existing">
                      <CodeSquare className="mr-2 h-4 w-4" />
                      Browse Contracts
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Right Column - Features */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold mb-4">What You Can Do</h3>
            
            {[
              {
                icon: <Cpu className="h-5 w-5" />,
                title: "Execute Contract Functions",
                description: "Call functions on your smart contract with real-time results"
              },
              {
                icon: <Zap className="h-5 w-5" />,
                title: "Fast Transaction Processing",
                description: "Transactions process in seconds on the Hedera network"
              },
              {
                icon: <RotateCw className="h-5 w-5" />,
                title: "Historical Calls",
                description: "View your previous function calls and their results"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                className="bg-background/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-all hover:shadow-md"
              >
                <div className="flex items-start">
                  <div className="mr-4 mt-1 bg-primary/10 p-3 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{feature.title}</h4>
                    <p className="text-sm text-foreground/70">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            <div className="bg-muted/30 rounded-xl p-6 border border-border/30">
              <h4 className="font-medium mb-3 flex items-center">
                <Code className="h-4 w-4 mr-2 text-primary" />
                Sample Contract Addresses
              </h4>
              <div className="space-y-2">
                <div className="p-2 bg-muted/50 rounded-md text-sm font-mono">0.0.1234567</div>
                <div className="p-2 bg-muted/50 rounded-md text-sm font-mono">0.0.7654321</div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These are example contracts for demonstration purposes
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 