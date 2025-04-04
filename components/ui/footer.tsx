'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Image 
              src="/favicon.svg" 
              alt="Karibu" 
              width={24}
              height={24}
              className="h-6 w-6" 
            />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Karibu. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
              href="https://github.com/abdul-abdi/smartscope"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 