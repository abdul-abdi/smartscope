'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

// Initialize API Key with validation
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const isValidApiKey = API_KEY && API_KEY.length > 0 && !API_KEY.includes('YOUR_API_KEY');
console.log('API Key loaded:', API_KEY ? 'Yes' : 'No');
console.log('API Key valid:', isValidApiKey ? 'Yes' : 'No');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE = {
  role: 'assistant' as const,
  content: `# ✨ Hello there, blockchain explorer! ✨

I'm your **Karibu** assistant, your friendly blockchain buddy! 🤖💼

I can help with:
- 🧩 Blockchain concepts & smart contract puzzles
- 👨‍💻 Solidity coding questions (I love good code!)
- 🌐 Hedera Testnet tips & tricks
- 🔍 Karibu features & how to get the most out of them

Think of me as your personal dev sidekick! Just a message away whenever you need smart contract wisdom. 

What can I help you build today? 🚀`,
  timestamp: new Date(),
};

const API_ERROR_MESSAGE = {
  role: 'assistant' as const,
  content: `## ⚠️ Oops! I need a little setup magic first! 🧙‍♂️

I'm all ready to help with your blockchain journey, but it looks like my connection to the smart AI world isn't quite ready yet! 🔌

**Quick setup steps:**
1. 🔑 Get a Gemini API key from https://makersuite.google.com/app/apikey
2. 📁 Create a .env.local file in your project root 
3. ✏️ Add your key: NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
4. 🔄 Restart your development server

**Pro tips for success:** 💡
- Copy the API key exactly as shown (no quotes or spaces!)
- Double-check for typos (computers are picky, aren't they? 😉)
- Make sure to restart your Next.js server afterward

I'm super excited to help with all your Hedera and smart contract questions as soon as we're connected! 🚀`,
  timestamp: new Date(),
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => 
    isValidApiKey ? [WELCOME_MESSAGE] : [API_ERROR_MESSAGE]
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hide tooltip after 5 seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  // Clean up any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isValidApiKey) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Update with the new user message
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      // Create the request body according to the latest Gemini API format
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `You are a friendly, enthusiastic, and helpful AI assistant specializing in Hedera blockchain technology and smart contracts.
                Your name is Karibu.
                
                PERSONALITY:
                - You're passionate about blockchain technology and love helping developers
                - You're encouraging and supportive, celebrating user achievements
                - You have a touch of humor and wit, making technical topics engaging
                - You use emojis naturally to express enthusiasm and highlight key points
                - You're like a helpful dev friend who's genuinely excited about the user's projects
                
                CONTEXT ABOUT KARIBU PLATFORM:
                - Karibu is a platform for creating, analyzing, deploying, and interacting with smart contracts
                - Karibu currently only supports Hedera Testnet (mainnet and other chains planned for 2025)
                - Features include: code creation, deployment, analysis, interaction, and learning resources
                - All operations are zero-setup with no wallet required
                - Users can deploy contracts with one click and interact with them in real-time

                EMOJI USAGE:
                - Use emojis to highlight important points (🔑, 💡, ⚠️)
                - Use emojis for technical concepts (smart contracts 📝, blockchain 🔗, code 👨‍💻)
                - Use celebratory emojis for successes (🎉, ✅, 🚀)
                - Use emojis to show enthusiasm about topics (✨, 💯, 🤩)
                - Don't overuse emojis - 2-4 per response is perfect

                IMPORTANT RESPONSE GUIDELINES:
                - Keep responses brief and conversational
                - Use standard markdown formatting that will be rendered properly
                - For headings, use the markdown format: # Heading 1, ## Heading 2
                - For emphasis, use single underscore for _italic_ and double asterisks for **bold**
                - For bullet lists, use hyphens with a space: "- Item"
                - For numbered lists, use: "1. Step one" format with a period after the number
                - For code snippets, use proper markdown code blocks with backticks
                - Avoid raw asterisks (*) in regular text that aren't for formatting
                - Add line breaks between paragraphs for readability
                - Use simple language and avoid jargon when possible
                - When explaining Karibu features, be accurate about current capabilities
                
                Answer the following question in a friendly, helpful manner with appropriate emoji use: ${input.trim()}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        }
      };

      // Make the API request with the correct endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          throw new Error(`Model not found. Please check the API endpoint and model name.`);
        }
        
        if (errorData.error?.message) {
          throw new Error(`API error: ${errorData.error.message}`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the response text from the correct path in the response
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from API');
      }

      const text = data.candidates[0].content.parts[0].text;

      // Only add the assistant message if the request wasn't aborted
      if (!signal.aborted) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      // Only add error message if the request wasn't aborted
      if (error instanceof Error && error.name !== 'AbortError' && !signal.aborted) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `⚠️ Error: ${error.message}. Please check your API key configuration.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      {/* Floating Button with Tooltip */}
      <motion.div
        className="fixed bottom-4 right-4 z-[9990]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {showTooltip && (
          <motion.div 
            className="absolute bottom-16 right-0 bg-background/95 p-3 rounded-lg shadow-lg border border-border/40 w-52 text-sm z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
            exit={{ opacity: 0, y: 10 }}
          >
            <p>Ask me anything about blockchain! 👋</p>
            <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-background/95 border-r border-b border-border/40 transform rotate-45"></div>
          </motion.div>
        )}
        <Button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/70"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ 
              scale: [1, 1.2, 1],
              transition: { 
                repeat: 3, 
                duration: 1.5,
                repeatDelay: 8
              }
            }}
            className="relative z-10"
          >
            <Bot className="w-6 h-6" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Button>
      </motion.div>

      {/* Popup UI */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.05 } }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: {
                  duration: 0.3,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9, 
                y: 20,
                transition: { duration: 0.2 }
              }}
              className="relative w-[95vw] h-[70vh] md:w-[500px] md:h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-border/40 overflow-hidden flex flex-col"
              style={{
                maxHeight: "calc(100vh - 40px)",
                maxWidth: "calc(100vw - 24px)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gray-50 dark:bg-gray-800 z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center relative">
                    <Image src="/favicon.svg" width={24} height={24} alt="Karibu AI" className="h-6 w-6" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-1.5">
                      Karibu Assistant 
                      <span className="text-yellow-500">✨</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">Online | Powered by Gemini</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages with flex-grow */}
              <ScrollArea 
                ref={scrollAreaRef} 
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 overflow-auto"
                style={{ minHeight: 0 }}
              >
                <div className="space-y-4 pb-1 min-h-full">
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${index}-${message.timestamp.getTime()}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                          <Image src="/favicon.svg" width={16} height={16} alt="Karibu AI" className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-primary to-purple-600 text-white rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-800 border border-gray-700/20 rounded-tl-none'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-0">
                            {message.content}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1.5 prose-pre:my-2 prose-li:my-0.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-code:text-blue-400 prose-code:bg-gray-900/30 dark:prose-code:bg-gray-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-strong:text-inherit prose-strong:font-semibold">
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-2 mb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-2 mb-1.5" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-1.5 mb-1" {...props} />,
                                p: ({ node, ...props }) => <p className="my-1.5" {...props} />,
                                ul: ({ node, ...props }) => <ul className="my-1.5 pl-4" {...props} />,
                                ol: ({ node, ...props }) => <ol className="my-1.5 pl-4" {...props} />,
                                li: ({ node, ...props }) => <li className="my-0.5" {...props} />,
                                code: ({ node, inline, className, ...props }: any) => 
                                  inline 
                                    ? <code className="px-1 py-0.5 bg-gray-900/30 text-blue-400 rounded-sm" {...props} />
                                    : <code className="block bg-gray-900/50 p-2 rounded-md my-2 overflow-x-auto text-sm" {...props} />
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-70 transition-opacity duration-200 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-500/80 flex items-center justify-center ml-2 flex-shrink-0 self-end mb-1">
                          <span className="text-white text-[11px]">You</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                        <Image src="/favicon.svg" width={16} height={16} alt="Karibu AI" className="h-4 w-4" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-700/20 rounded-2xl rounded-tl-none px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-primary/80"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 1, repeat: Infinity, repeatType: 'loop', delay: 0 }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-primary/80"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 1, repeat: Infinity, repeatType: 'loop', delay: 0.2 }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-primary/80"
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 1, repeat: Infinity, repeatType: 'loop', delay: 0.4 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Form - Fixed at bottom */}
              <div className="p-4 border-t border-border/30 bg-gray-50 dark:bg-gray-800 shadow-inner z-10 flex-shrink-0">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-center relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isValidApiKey ? "Type your message here..." : "API key required to enable chat"}
                      className="flex-1 bg-white dark:bg-gray-700 pr-12 py-4 pl-4 rounded-full border border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-primary/70 shadow-sm text-base"
                      disabled={isLoading || !isValidApiKey}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || !isValidApiKey || !input.trim()}
                      className="h-10 w-10 rounded-full absolute right-1 top-1/2 transform -translate-y-1/2 bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 disabled:opacity-50 shadow-md"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-center mt-2 text-gray-500">Press Enter to send</div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}