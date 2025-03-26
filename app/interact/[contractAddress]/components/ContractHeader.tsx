import React from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft, Copy, CheckCircle, ExternalLink, FileCode, Terminal, Code } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';
import { Badge } from '../../../../components/ui/badge';

export interface ContractHeaderProps {
  contractAddress: string;
  abiSource?: string;
  functionsCount?: number;
  onViewAbi?: () => void;
}

const ContractHeader: React.FC<ContractHeaderProps> = ({ 
  contractAddress,
  abiSource,
  functionsCount = 0,
  onViewAbi
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            
            <Badge variant="outline" className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              {abiSource === 'bytecode' ? 'Bytecode Analysis' : 
               abiSource === 'manual-bytecode' ? 'Manual Bytecode' : 
               abiSource === 'explorer' ? 'Explorer Verified' : 
               abiSource}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractHeader; 