'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Sparkles, Code, Shield, Zap, Users, Globe, Database, Lock, LineChart, MessageSquare, FileCode, BookOpen, Cpu, GitBranch, Bug, Rocket, Bot, ArrowRight, Braces, Star, Binoculars } from 'lucide-react';

const roadmapItems = [
  {
    title: 'Current Features',
    status: 'completed',
    items: [
      {
        title: 'Smart Contract Creation',
        description: 'Create and deploy smart contracts on Hedera network',
        icon: Code,
        details: [
          'Solidity contract creation',
          'Contract deployment to Hedera Testnet',
          'Basic contract interaction'
        ]
      },
      {
        title: 'Contract Analysis',
        description: 'Analyze existing smart contracts on Hedera',
        icon: FileCode,
        details: [
          'Contract code analysis',
          'Function discovery',
          'Basic security checks'
        ]
      },
      {
        title: 'Learning Resources',
        description: 'Comprehensive learning materials for smart contract development',
        icon: BookOpen,
        details: [
          'Smart contract basics',
          'Solidity fundamentals',
          'Hedera network overview'
        ]
      },
      {
        title: 'SmartScope AI Assistant',
        description: 'AI-powered chat assistant for blockchain and smart contract questions',
        icon: Bot,
        details: [
          'Instant blockchain knowledge',
          'Smart contract guidance',
          'Hedera-specific information',
          'Zero-setup contextual help'
        ]
      },
      {
        title: 'Dynamic Contract Interaction',
        description: 'Universal smart contract interaction framework',
        icon: Braces,
        details: [
          'Contract-type agnostic interface',
          'Automatic function discovery',
          'Live contract state visualization',
          'Improved React component architecture'
        ]
      },
      {
        title: 'Advanced ABI Discovery',
        description: 'Intelligent detection of contract interfaces',
        icon: Binoculars,
        details: [
          'Bytecode-based function detection',
          'Accurate function signature matching',
          'Support for any contract type',
          'Reliable state variable reading'
        ]
      },
      {
        title: 'Multi-File IDE',
        description: 'Develop complex contract ecosystems with dependencies',
        icon: GitBranch,
        details: [
          'File system organization',
          'Dependency management',
          'Contract inheritance support',
          'Project-based development'
        ]
      },
      {
        title: 'External Library Integration',
        description: 'Seamless support for popular Solidity libraries',
        icon: Cpu,
        details: [
          'OpenZeppelin library support',
          'Automatic dependency resolution',
          'External import handling',
          'Version compatibility detection'
        ]
      }
    ]
  },
  {
    title: 'In Progress (Q2 2025)',
    status: 'current',
    items: [
      {
        title: 'Enhanced Security Analysis',
        description: 'Advanced security scanning and vulnerability detection',
        icon: Shield,
        details: [
          'Common vulnerability checks',
          'Gas optimization analysis',
          'Access control verification',
          'Integration with security standards'
        ]
      },
      {
        title: 'Performance Optimization',
        description: 'Tools for optimizing smart contract performance',
        icon: Zap,
        details: [
          'Gas usage analysis',
          'Performance benchmarking',
          'Optimization suggestions',
          'AI-assisted code improvements'
        ]
      },
      {
        title: 'Community Features',
        description: 'Enhanced collaboration and sharing capabilities',
        icon: Users,
        details: [
          'Contract sharing via links',
          'Collaborative development',
          'Community feedback system',
          'Public contract templates'
        ]
      }
    ]
  },
  {
    title: 'Future Plans (Q3 2025)',
    status: 'future',
    items: [
      {
        title: 'Cross-Chain Support',
        description: 'Expand platform capabilities to support multiple blockchain networks',
        icon: Globe,
        details: [
          'Ethereum integration',
          'Multi-chain deployment',
          'Cross-chain analytics',
          'Unified interface for all chains'
        ]
      },
      {
        title: 'Advanced Analytics',
        description: 'Comprehensive analytics and reporting',
        icon: LineChart,
        details: [
          'Contract usage analytics',
          'Performance metrics',
          'Trend analysis',
          'Customizable reporting dashboard'
        ]
      },
      {
        title: 'Advanced AI Features',
        description: 'Expanded AI capabilities for enhanced development',
        icon: Cpu,
        details: [
          'Smart code generation',
          'Automated bug detection',
          'Personalized recommendations',
          'AI-powered contract optimization'
        ]
      }
    ]
  }
];

const statusColors = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/30',
  current: 'bg-primary/10 text-primary border-primary/30',
  future: 'bg-purple-500/10 text-purple-500 border-purple-500/30'
};

const statusIcons = {
  completed: CheckCircle2,
  current: Clock,
  future: Sparkles
};

const backgroundGradients = {
  completed: 'from-green-500/5 to-transparent',
  current: 'from-primary/5 to-transparent',
  future: 'from-purple-500/5 to-transparent'
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-12 md:py-16 mb-0">
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
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-500">
              SmartScope Roadmap
            </h1>
            <motion.p
              className="text-xl text-foreground/80 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Our journey to revolutionize smart contract development and analysis
            </motion.p>
            
            <motion.div
              className="max-w-3xl mx-auto bg-background/50 border border-border/50 rounded-lg p-4 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-sm text-muted-foreground">
                <strong>Current Network Support:</strong> SmartScope currently supports the <span className="text-primary font-medium">Hedera Testnet</span> only. 
                Our roadmap includes plans for additional networks in 2025.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Roadmap Content */}
      <section className="pt-2 pb-4">
        <div className="container mx-auto px-4">
          <div className="space-y-24 relative">
            {/* Vertical timeline line */}
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-purple-500 to-indigo-300 transform -translate-x-1/2 hidden md:block"></div>
            
            {roadmapItems.map((section, sectionIndex) => {
              const StatusIcon = statusIcons[section.status as keyof typeof statusIcons];
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: sectionIndex * 0.2 }}
                  className="relative"
                >
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-10">
                    <div className={`p-3 rounded-full ${statusColors[section.status as keyof typeof statusColors]} border z-10 shadow-lg`}>
                      <StatusIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                      {section.title}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:pl-12">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: sectionIndex * 0.2 + itemIndex * 0.1 }}
                          className={`bg-background/70 backdrop-blur-sm border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-md hover:shadow-primary/5 hover:-translate-y-1 duration-300 overflow-hidden relative group`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-b ${backgroundGradients[section.status as keyof typeof backgroundGradients]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          <div className="relative z-10">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                                <ul className="space-y-2">
                                  {item.details.map((detail) => (
                                    <li key={detail} className="flex items-center gap-2 text-sm">
                                      <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                                      <span>{detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
} 