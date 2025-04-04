'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { MessageSquare, Users, Rocket, Lightbulb, Github, Code } from 'lucide-react';

export default function CommunityPage() {
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
              Community Hub
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Join our community of developers building on Hedera with Karibu
            </p>
          </motion.div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="pb-24 pt-0">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-background border border-border rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Coming Soon!</h2>
            <p className="text-lg mb-6">
              Our community features are under development. Soon you'll be able to share your contracts, 
              collaborate with other developers, and get feedback from the community.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-muted/50 rounded-lg p-6 text-left">
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-500" />
                  Community Features
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5"></span>
                    <span>Contract sharing via links</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5"></span>
                    <span>Collaborative development</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5"></span>
                    <span>Community feedback system</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary/10 p-1 rounded-full mr-2 mt-0.5"></span>
                    <span>Public contract templates</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-6 text-left">
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                  Join the Conversation
                </h3>
                <p className="text-sm mb-4">
                  While we're building our community features, you can connect with us on these platforms:
                </p>
                <div className="space-y-3">
                  <a 
                    href="https://github.com/abdul-abdi/smartscope" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 bg-background/80 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    <span>GitHub</span>
                  </a>
                  <a 
                    href="https://discord.com/invite/hedera" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 bg-background/80 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span>Hedera Discord</span>
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              <Button asChild size="lg">
                <Link href="/templates">
                  Browse Templates
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/learn">
                  Learning Resources
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}