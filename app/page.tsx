'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Code, FileText, ExternalLink, Clock, Shield, Zap, ChevronDown, Bot, CheckCircle, Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';

// Sample code animation text
const sampleCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartExample {
    string public message;
    
    constructor(string memory _message) {
        message = _message;
    }
    
    function updateMessage(string memory _newMessage) public {
        message = _newMessage;
    }
}`;

export default function Home() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.05], [1, 0.97]);
  
  return (
    <div className="overflow-hidden">
      {/* Hero Section - Full width and height */}
      <section className="relative min-h-[100vh] pb-20 pt-24 lg:pt-28 flex items-center w-full">
        {/* Enhanced animated background elements */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, 20, 0],
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
            animate={{
              x: [0, -30, 0],
              y: [0, 30, 0],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
            animate={{
              y: [0, -40, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Additional decorative elements */}
          <motion.div 
            className="absolute top-1/2 right-1/4 w-4 h-4 rounded-full bg-primary"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 0.3, 0.7],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div 
            className="absolute bottom-1/3 left-1/4 w-6 h-6 rounded-full bg-purple-500/50"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" 
               style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            style={{ opacity, scale }}
            className="max-w-4xl mx-auto text-center mb-12"
          >
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Visualize, Deploy & Test Smart Contracts with Ease
            </motion.h1>
            
            <motion.p
              className="text-lg md:text-xl text-foreground/80 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              A comprehensive platform for blockchain developers to build, analyze, deploy, and interact with 
              smart contracts on Hedera. From security analysis to one-click deployment, SmartScope eliminates 
              complexity—no wallet setup, no gas fees, just pure development focus.
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap gap-3 justify-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">Solidity Analysis</span>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium">Zero Setup</span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-sm font-medium">Hedera Testnet</span>
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">Real-time Testing</span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium">AI Assistant</span>
            </motion.div>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Button asChild size="lg" className="group">
                <Link href="/create">
                  Get Started 
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/learn">
                  Learn More <FileText className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Enhanced Code Block Animation - Made larger */}
          <motion.div
            className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className="bg-black/80 backdrop-blur-md p-4 flex items-center border-b border-white/10">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="ml-4 text-white/60 text-sm">SmartExample.sol</div>
            </div>
            <div className="bg-black/70 backdrop-blur-md p-6 text-white font-mono text-sm overflow-x-auto">
              {sampleCode.split('\n').map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.9 + (i * 0.05) }}
                  className="leading-relaxed"
                >
                  {line || ' '}
                </motion.div>
              ))}
            </div>
            
            {/* Code glow effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 mix-blend-overlay"
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          
          {/* Scroll indicator */}
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ 
              y: [0, 10, 0],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown className="h-8 w-8 text-primary/60" />
          </motion.div>
        </div>
      </section>

      {/* Reimagined Features Section with 3D card effect */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-muted/30" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 -z-5">
          <svg className="absolute w-full h-full opacity-[0.02]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -top-px" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -bottom-px" />

        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div 
              className="inline-block mb-4 relative"
              whileInView={{
                opacity: [0, 1],
                y: [20, 0]
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-purple-500 rounded-full" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why SmartScope?</h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              A comprehensive toolkit designed to make smart contract development accessible and intuitive
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: <Code className="h-6 w-6" />,
                title: "Smart Contract Analysis",
                description: "Instantly analyze Solidity smart contracts for insights and security considerations",
                color: "from-blue-500/20 to-primary/20"
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "One-Click Deployment",
                description: "Deploy to Hedera Testnet with a single click - no wallet configuration required",
                color: "from-purple-500/20 to-pink-500/20"
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Security Focused",
                description: "Identify potential vulnerabilities and best practices for safer contracts",
                color: "from-green-500/20 to-emerald-500/20"
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: "Real-time Interaction",
                description: "Call functions and view results immediately in an interactive environment",
                color: "from-amber-500/20 to-yellow-500/20"
              },
              {
                icon: <FileText className="h-6 w-6" />,
                title: "Sample Contracts",
                description: "Browse and test pre-built contract templates for common use cases",
                color: "from-indigo-500/20 to-blue-500/20"
              },
              {
                icon: <ExternalLink className="h-6 w-6" />,
                title: "No External Dependencies",
                description: "Everything runs in your browser - no external wallet or accounts needed",
                color: "from-rose-500/20 to-red-500/20"
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="relative group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" 
                     style={{background: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`}} />
                
                <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 h-full transform transition-all duration-300 group-hover:translate-y-[-5px] group-hover:shadow-xl group-hover:border-primary/50">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br ${feature.color}`}>
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-foreground/70">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW SECTION: How It Works - Platform Workflow */}
      <section className="py-24 relative bg-muted/20">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <svg className="absolute w-full h-full opacity-[0.03]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <pattern id="flow-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" stroke="currentColor" strokeWidth="0.5" fill="none" />
            </pattern>
            <rect width="100" height="100" fill="url(#flow-grid)" />
          </svg>
          <motion.div
            className="absolute top-1/4 left-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
            animate={{
              x: [0, 50, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -top-px" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -bottom-px" />

        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div 
              className="inline-block mb-4 relative"
              whileInView={{
                opacity: [0, 1],
                y: [20, 0]
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-purple-500 rounded-full" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How SmartScope Works</h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              From code to deployment to interaction - explore our seamless end-to-end workflow
            </p>
          </motion.div>

          {/* Workflow Steps */}
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/70 to-primary/30 
                          hidden md:block" />

            {/* Step 1: Create or Upload */}
            <motion.div 
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-24"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <div className="md:text-right md:w-1/2 relative">
                <motion.div 
                  className="hidden md:block absolute -right-[4.5rem] top-10 w-10 h-10 rounded-full bg-primary z-10
                            border-4 border-background shadow-lg"
                  whileInView={{
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 1, 1]
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                </motion.div>
                <div className="bg-background rounded-2xl p-8 border border-border/50 shadow-lg relative overflow-hidden group hover:border-primary/50 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                  <h3 className="text-2xl font-semibold mb-3 text-primary">1. Create or Upload</h3>
                  <p className="text-foreground/70 mb-4">
                    Start your journey by creating a new smart contract from scratch using our built-in editor with syntax highlighting, or upload your existing Solidity file. We support all Solidity versions up to 0.8.x.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">Built-in Editor</span>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">File Upload</span>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">Sample Templates</span>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-start w-full md:pl-16">
                <div className="bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-xl w-full max-w-md transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl">
                  <div className="bg-black/90 backdrop-blur-md p-3 flex items-center border-b border-white/10">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="ml-4 text-white/60 text-sm">Create.sol</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-gray-900 to-black font-mono text-sm text-green-400/90">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                    >
                      <p className="text-white/60 mb-2">// Create your contract</p>
                      <p>pragma solidity ^0.8.0;</p>
                      <p>&nbsp;</p>
                      <p>contract MyToken {'{'}</p>
                      <p>&nbsp;&nbsp;string public name;</p>
                      <p>&nbsp;&nbsp;string public symbol;</p>
                      <p>&nbsp;</p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 1 }}
                        className="text-yellow-400"
                      >&nbsp;&nbsp;constructor(string memory _name, string memory _symbol) {'{'}</motion.p>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                      >
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;name = _name;</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;symbol = _symbol;</p>
                        <p>&nbsp;&nbsp;{'}'}</p>
                        <p>{'}'}</p>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2: Compile & Analyze */}
            <motion.div 
              className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16 mb-24"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <div className="md:text-left md:w-1/2 relative">
                <motion.div 
                  className="hidden md:block absolute -left-[4.5rem] top-10 w-10 h-10 rounded-full bg-purple-500 z-10
                            border-4 border-background shadow-lg"
                  whileInView={{
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 1, 1]
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-20"></div>
                </motion.div>
                <div className="bg-background rounded-2xl p-8 border border-border/50 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                  <h3 className="text-2xl font-semibold mb-3 text-purple-500">2. Compile & Analyze</h3>
                  <p className="text-foreground/70 mb-4">
                    SmartScope automatically compiles your contract and performs a comprehensive security analysis. Our analyzer identifies potential vulnerabilities, optimization opportunities, and provides insights into gas usage and contract structure.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">Security Checks</span>
                    <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">Gas Estimation</span>
                    <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">Bytecode Analysis</span>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-end w-full md:pr-16">
                <div className="bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden shadow-xl w-full max-w-md transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl">
                  <div className="p-5 border-b border-border">
                    <h4 className="font-medium flex items-center text-purple-500">
                      <Shield className="h-5 w-5 mr-2" /> Security Analysis
                    </h4>
                  </div>
                  <div className="p-5">
                    <motion.div 
                      className="mb-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground/70">Reentrancy Protection</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Secure</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <motion.div 
                          className="h-full bg-green-500 rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: '100%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="mb-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground/70">Integer Overflow</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">Warning</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <motion.div 
                          className="h-full bg-yellow-500 rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: '75%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.7 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="mb-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground/70">Access Control</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Secure</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full">
                        <motion.div 
                          className="h-full bg-green-500 rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: '90%' }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.9 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                      className="text-xs text-foreground/50 border-t border-border pt-3 mt-3"
                    >
                      Compiled with Solidity 0.8.17 • Optimization: Enabled
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 3: Deploy */}
            <motion.div 
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-24"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <div className="md:text-right md:w-1/2 relative">
                <motion.div 
                  className="hidden md:block absolute -right-[4.5rem] top-10 w-10 h-10 rounded-full bg-indigo-500 z-10
                            border-4 border-background shadow-lg"
                  whileInView={{
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 1, 1]
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
                </motion.div>
                <div className="bg-background rounded-2xl p-8 border border-border/50 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                  <h3 className="text-2xl font-semibold mb-3 text-indigo-500">3. Deploy to Hedera</h3>
                  <p className="text-foreground/70 mb-4">
                    With a single click, deploy your contract to the Hedera Testnet. No wallet configuration or HBAR required – SmartScope handles all the deployment complexity behind the scenes. You can provide constructor arguments and customize gas settings.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500">One-Click Deploy</span>
                    <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500">Constructor Arguments</span>
                    <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500">Fast Confirmation</span>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-start w-full md:pl-16">
                <div className="bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden shadow-xl w-full max-w-md transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl">
                  <div className="p-5 border-b border-border">
                    <h4 className="font-medium flex items-center text-indigo-500">
                      <Zap className="h-5 w-5 mr-2" /> Deployment Console
                    </h4>
                  </div>
                  <div className="p-5 font-mono text-sm">
                    <motion.div 
                      className="text-foreground/70"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      <p>{`> Initializing deployment...`}</p>
                    </motion.div>
                    <motion.div 
                      className="text-foreground/70"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <p>{`> Connecting to Hedera Testnet...`}</p>
                    </motion.div>
                    <motion.div 
                      className="text-foreground/70"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 1 }}
                    >
                      <p>{`> Submitting transaction...`}</p>
                    </motion.div>
                    <motion.div 
                      className="text-foreground/70"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 1.5 }}
                    >
                      <p>{`> Waiting for confirmation...`}</p>
                    </motion.div>
                    <motion.div 
                      className="text-green-500"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 2 }}
                    >
                      <p>{`> Contract deployed successfully!`}</p>
                      <p className="mt-2 text-indigo-400 break-all text-xs">
                        Contract ID: 0.0.3487291
                      </p>
                      <p className="text-indigo-400 break-all text-xs">
                        Address: 0x7d92E83f45139D138b85D828E81706857B881F66
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4: Interact */}
            <motion.div 
              className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
            >
              <div className="md:text-left md:w-1/2 relative">
                <motion.div 
                  className="hidden md:block absolute -left-[4.5rem] top-10 w-10 h-10 rounded-full bg-green-500 z-10
                            border-4 border-background shadow-lg"
                  whileInView={{
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 1, 1]
                  }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></div>
                </motion.div>
                <div className="bg-background rounded-2xl p-8 border border-border/50 shadow-lg relative overflow-hidden group hover:border-green-500/50 transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                  <h3 className="text-2xl font-semibold mb-3 text-green-500">4. Interact & Verify</h3>
                  <p className="text-foreground/70 mb-4">
                    Call your contract's functions directly from our intuitive interface. View real-time transaction results, inspect return values, and verify contract behavior. Toggle between read (view) and write (transactional) functions, all with complete transaction details.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500">Function Execution</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500">Real-time Results</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500">Transaction History</span>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-end w-full md:pr-16">
                <div className="bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden shadow-xl w-full max-w-md transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl">
                  <div className="p-5 border-b border-border">
                    <h4 className="font-medium flex items-center text-green-500">
                      <Code className="h-5 w-5 mr-2" /> Contract Interaction
                    </h4>
                  </div>
                  <div className="p-5 space-y-4">
                    <motion.div 
                      className="bg-muted/30 rounded-lg p-3"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">name()</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Read</span>
                      </div>
                      <div className="bg-background p-2 rounded text-sm">
                        <p className="text-green-500">➞ "MyToken"</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="bg-muted/30 rounded-lg p-3"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">symbol()</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">Read</span>
                      </div>
                      <div className="bg-background p-2 rounded text-sm">
                        <p className="text-green-500">➞ "MTK"</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      className="bg-muted/30 rounded-lg p-3"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.9 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">transfer(address, uint256)</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Write</span>
                      </div>
                      <div className="space-y-2 mb-2">
                        <div className="flex gap-2 text-sm">
                          <input type="text" value="0x7d92...1F66" readOnly className="bg-background rounded px-2 py-1 flex-1 text-foreground/70" />
                        </div>
                        <div className="flex gap-2 text-sm">
                          <input type="text" value="1000" readOnly className="bg-background rounded px-2 py-1 flex-1 text-foreground/70" />
                        </div>
                      </div>
                      <div className="bg-background p-2 rounded text-sm">
                        <p className="text-green-500">✓ Transaction successful</p>
                        <p className="text-xs text-foreground/50 mt-1">Gas used: 51,243</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: Find Your Path */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden -z-10">
          <svg className="absolute w-full h-full opacity-[0.03]" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <pattern id="path-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" stroke="currentColor" strokeWidth="0.5" fill="none" />
            </pattern>
            <rect width="100" height="100" fill="url(#path-grid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.div 
              className="inline-block mb-4 relative"
              whileInView={{
                opacity: [0, 1],
                y: [20, 0]
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-purple-500 rounded-full" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Find Your Path</h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Choose the perfect starting point for your smart contract journey on Hedera
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Create New Contracts",
                description: "Build and deploy smart contracts from scratch with our comprehensive development environment",
                icon: <Code className="h-6 w-6" />,
                color: "from-blue-500/20 to-primary/20",
                link: "/create",
                features: [
                  "Monaco Editor with Solidity Support",
                  "Real-time Syntax Highlighting",
                  "Smart Contract Templates",
                  "One-click Deployment",
                  "Gas Estimation",
                  "Security Analysis"
                ],
                capabilities: [
                  "Write and compile Solidity contracts",
                  "Deploy to Hedera Testnet instantly",
                  "Get instant security feedback",
                  "Test with sample data",
                  "Generate and download ABI"
                ]
              },
              {
                title: "Interact with Contracts",
                description: "Connect to and interact with existing smart contracts on the Hedera network",
                icon: <ExternalLink className="h-6 w-6" />,
                color: "from-purple-500/20 to-pink-500/20",
                link: "/interact",
                features: [
                  "Contract Address Search",
                  "ABI Import/Upload",
                  "Function Explorer",
                  "Event Monitoring",
                  "Transaction History",
                  "Gas Usage Tracking"
                ],
                capabilities: [
                  "Call read/write functions",
                  "Monitor contract events",
                  "View transaction receipts",
                  "Track gas consumption",
                  "Export interaction logs"
                ]
              },
              {
                title: "Check Wallet Contracts",
                description: "View and analyze all contracts deployed by any wallet address on Hedera",
                icon: <Wallet className="h-6 w-6" />,
                color: "from-green-500/20 to-emerald-500/20",
                link: "/wallet",
                features: [
                  "Wallet Address Lookup",
                  "Contract List View",
                  "Transaction History",
                  "Contract Details",
                  "Network Explorer",
                  "ABI Retrieval"
                ],
                capabilities: [
                  "Search by wallet address",
                  "View deployed contracts",
                  "Access contract ABIs",
                  "Check transaction history",
                  "Monitor contract status"
                ]
              }
            ].map((path, i) => (
              <motion.div
                key={i}
                className="relative group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" 
                     style={{background: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`}} />
                
                <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 h-full transform transition-all duration-300 group-hover:translate-y-[-5px] group-hover:shadow-xl group-hover:border-primary/50">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br ${path.color}`}>
                    <div className="text-primary">{path.icon}</div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{path.title}</h3>
                  <p className="text-foreground/70 mb-6">{path.description}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground/90 mb-2">Key Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {path.features.map((feature, j) => (
                          <span key={j} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-foreground/90 mb-2">What You Can Do</h4>
                      <ul className="space-y-2">
                        {path.capabilities.map((capability, j) => (
                          <li key={j} className="flex items-start text-sm text-foreground/70">
                            <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                            {capability}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Button asChild className="w-full mt-6">
                    <Link href={path.link}>
                      {path.title === "Create New Contracts" ? "Create & Deploy Contract" :
                       path.title === "Interact with Contracts" ? "Connect & Interact" :
                       "View Wallet Contracts"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reimagined CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 overflow-hidden -z-10">
          {/* Animated rings */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/5 rounded-full"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full"
            animate={{
              scale: [1.1, 1, 1.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/20 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto rounded-2xl p-12 relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            {/* Glowing background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5" />
            
            {/* Animated blurs */}
            <motion.div 
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
              animate={{
                x: [0, -20, 0],
                y: [0, 20, 0],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div 
              className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Border glow */}
            <div className="absolute inset-0 rounded-2xl border border-primary/20 backdrop-blur-sm" />
            <motion.div 
              className="absolute inset-0 rounded-2xl border-2 border-primary/20 opacity-0"
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0.9, 1.02, 0.9],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            <div className="relative z-10 text-center">
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Ready to build smarter contracts?
              </motion.h2>
              <motion.p 
                className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Learn about smart contracts, test your deployed solutions without integration complexity, and analyze existing contracts on the Hedera blockchain - all in one accessible platform.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <Link href="/create">
                    Start Creating Now
                    <motion.div
                      className="ml-2"
                      animate={{
                        x: [0, 4, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 1,
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 