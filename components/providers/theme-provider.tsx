"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

export const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "smartscope-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const variants = {
    open: { 
      height: "auto", 
      opacity: 1,
      transition: { 
        staggerChildren: 0.07,
        delayChildren: 0.1
      }
    },
    closed: { 
      height: 0, 
      opacity: 0,
      transition: { 
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    open: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40
      }
    },
    closed: { 
      y: 20, 
      opacity: 0
    }
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  // Get current theme icon
  const currentThemeOption = themeOptions.find(option => option.value === theme);
  const ThemeIcon = currentThemeOption?.icon || Sun;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary/10 text-foreground/80 hover:text-primary transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ThemeIcon className="w-5 h-5" />
      </motion.button>

      <motion.div
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={variants}
        className="absolute right-0 mt-2 overflow-hidden z-50 bg-background/80 backdrop-blur-sm rounded-lg border border-border/40 shadow-lg w-36"
      >
        <div className="p-1">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <motion.button
                key={option.value}
                onClick={() => {
                  setTheme(option.value as Theme);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-md ${
                  theme === option.value 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-primary/5 text-foreground/80 hover:text-primary"
                }`}
                variants={itemVariants}
              >
                <Icon className="w-4 h-4 mr-2" />
                {option.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-40" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}; 