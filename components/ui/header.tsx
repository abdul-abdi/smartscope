'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Menu, X, Github, Code, Cpu, BookOpen, Map } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ThemeSwitcher } from '../providers/theme-provider';

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Create', path: '/create' },
  { name: 'Interact', path: '/interact' },
  { name: 'Wallet', path: '/wallet' },
  { name: 'Learn', path: '/learn' },
  { name: 'Roadmap', path: '/roadmap' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const logoVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut" 
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const navVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const navItemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15
      }
    },
    hover: {
      scale: 1.1,
      color: "#8A2BE2", // Vivid purple
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  const mobileMenuVariants = {
    closed: { 
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2
      }
    },
    open: { 
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const mobileNavItemVariants = {
    closed: { opacity: 0, x: -10 },
    open: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15
      }
    }
  };
  
  // Animated background elements
  const bgDecorVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 0.09,
      transition: { duration: 2, delay: 0.5 }
    }
  };

  return (
    <header className="relative backdrop-blur-sm bg-background/80 border-b border-border/40 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div 
            className="flex-shrink-0 flex items-center"
            initial="hidden"
            animate="visible"
            whileHover="hover"
            variants={logoVariants}
          >
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden">
                <Image 
                  src="/favicon.svg" 
                  alt="SmartScope Logo" 
                  width={36} 
                  height={36}
                  className="w-full h-full" 
                />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                SmartScope
              </span>
            </Link>
          </motion.div>

          {/* Desktop Nav */}
          <motion.nav 
            className="hidden md:flex space-x-8"
            initial="hidden"
            animate="visible"
            variants={navVariants}
          >
            {navItems.map((item) => (
              <motion.div
                key={item.name}
                variants={navItemVariants}
                whileHover="hover"
              >
                <Link 
                  href={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium relative ${
                    pathname === item.path
                      ? 'text-primary font-semibold'
                      : 'text-foreground/80 hover:text-primary'
                  }`}
                >
                  {item.name}
                  {pathname === item.path && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.nav>

          {/* Theme Switcher, GitHub Link and Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            
            <motion.a
              href="https://github.com/abdul-abdi/smartscope"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-primary"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Github className="w-5 h-5" />
              <span className="sr-only">GitHub</span>
            </motion.a>
            
            <motion.button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-foreground/80 hover:text-primary focus:outline-none"
              onClick={toggleMobileMenu}
              whileTap={{ scale: 0.9 }}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <motion.div 
        className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
        initial="closed"
        animate={mobileMenuOpen ? "open" : "closed"}
        variants={mobileMenuVariants}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background/95 backdrop-blur-md border-b border-border/40">
          {navItems.map((item) => (
            <motion.div
              key={item.name}
              variants={mobileNavItemVariants}
            >
              <Link 
                href={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === item.path
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-foreground/80 hover:bg-primary/5 hover:text-primary'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Decorative background elements */}
      <motion.div 
        className="absolute -z-10 top-0 right-0 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl"
        variants={bgDecorVariants}
        initial="initial"
        animate="animate"
      />
      <motion.div 
        className="absolute -z-10 -bottom-32 -left-12 w-64 h-64 bg-purple-600/10 rounded-full filter blur-3xl"
        variants={bgDecorVariants}
        initial="initial"
        animate="animate"
      />
    </header>
  );
} 