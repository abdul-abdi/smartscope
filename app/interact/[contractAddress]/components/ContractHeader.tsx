import React from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft, Copy, CheckCircle, ExternalLink, FileCode, Terminal, Code, Info, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { motion } from 'framer-motion';

export interface ContractHeaderProps {
  contractAddress: string;
  abiSource?: string;
  functionsCount?: number;
  onViewAbi?: () => void;
  simplified?: boolean;
  isVerified?: boolean;
}

const ContractHeader: React.FC<ContractHeaderProps> = ({ 
  contractAddress,
  abiSource,
  functionsCount = 0,
  onViewAbi,
  simplified = false,
  isVerified = false
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If simplified is true, return a simplified card version (previously ContractInfo component)
  if (simplified) {
    return (
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.5 }
          }
        }}
        className="mb-6"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5 text-blue-500" />
              Contract Interaction
            </CardTitle>
            <CardDescription>
              Interact with smart contract at: <span className="font-mono">{contractAddress}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">Address:</span>
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{contractAddress}</code>
              </div>
              {abiSource && (
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">Source:</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    abiSource === 'verified' || abiSource === 'explorer'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : abiSource === 'bytecode' || abiSource === 'manual-bytecode'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                      : abiSource === 'transaction'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                  }`}>
                    {abiSource === 'bytecode' && 'Bytecode Analysis'}
                    {abiSource === 'manual-bytecode' && 'Manual Bytecode'}
                    {abiSource === 'verified' && 'Verified Contract'}
                    {abiSource === 'explorer' && 'Explorer Verified'}
                    {abiSource === 'transaction' && 'Transaction History'}
                    {abiSource === 'unknown' && 'Unknown Source'}
                    {!['bytecode', 'manual-bytecode', 'verified', 'explorer', 'transaction', 'unknown'].includes(abiSource) && abiSource}
                  </span>
                </div>
              )}
              {functionsCount !== undefined && (
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-1">Functions:</span>
                  <span className="font-medium">{functionsCount}</span>
                </div>
              )}
              {isVerified && (
                <div className="flex items-center">
                  <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">
                    <Shield className="h-3 w-3" />
                    ABI Verified
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Regular full header display
  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <Link href="/interact" className="inline-flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="mr-3 group hover:bg-primary/10 hover:text-primary border-border/50 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Interact</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            {contractAddress.substring(0, 7)}...{contractAddress.substring(contractAddress.length - 4)}
          </span>
        </h1>
      </div>
      
      {/* Single row with contract address and buttons */}
      <div className="flex items-center mt-2 mb-2 bg-muted/30 rounded-lg border border-border/40 p-1 overflow-hidden">
        <div className="flex-1 font-mono text-sm p-2 overflow-x-auto whitespace-nowrap">
          {contractAddress}
        </div>
        
        <div className="flex shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 rounded-none border-l border-border/40"
                  onClick={handleCopyAddress}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{copied ? 'Copied!' : 'Copy address'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 px-3 rounded-none border-l border-border/40 bg-primary/5 hover:bg-primary/10"
                  onClick={() => window.open(`https://hashscan.io/testnet/contract/${contractAddress}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">View contract on HashScan Explorer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {onViewAbi && (
            <Button 
              variant="default"
              size="sm"
              className="h-9 px-3 rounded-none border-l border-border/40 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              onClick={onViewAbi}
            >
              <Code className="h-4 w-4" />
              <span>View ABI</span>
            </Button>
          )}

          {isVerified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="ml-2 mr-2 bg-green-50 text-green-800 border-green-200 cursor-help dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    ABI Verified
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    This contract has a verified ABI. All functions are accurately detected and available for interaction.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {abiSource === 'bytecode' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="ml-2 bg-amber-50 text-amber-800 border-amber-200 cursor-help dark:bg-amber-900/20 dark:text-amber-400"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Bytecode-derived
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    This ABI was derived from contract bytecode analysis. Some functions may be missing or incomplete.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Interact with smart contract at: <span className="font-medium">{contractAddress}</span>
        </p>
        
        {abiSource && functionsCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Terminal className="h-3 w-3" />
              {functionsCount} functions
            </Badge>
            
            {isVerified && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
              >
                <Shield className="h-3 w-3" />
                ABI Verified
              </Badge>
            )}
            
            {abiSource === 'bytecode' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
              >
                <FileCode className="h-3 w-3" />
                Bytecode Analysis
              </Badge>
            )}
            
            {abiSource === 'manual-bytecode' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400"
              >
                <FileCode className="h-3 w-3" />
                Manual Bytecode
              </Badge>
            )}
            
            {abiSource === 'verified' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
              >
                <CheckCircle className="h-3 w-3" />
                Verified Contract
              </Badge>
            )}
            
            {abiSource === 'explorer' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
              >
                <FileCode className="h-3 w-3" />
                Explorer Verified
              </Badge>
            )}
            
            {abiSource === 'transaction' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
              >
                <FileCode className="h-3 w-3" />
                Transaction History
              </Badge>
            )}
            
            {abiSource === 'unknown' && (
              <Badge 
                variant="outline" 
                className="flex items-center gap-1"
              >
                <FileCode className="h-3 w-3" />
                Unknown Source
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractHeader; 