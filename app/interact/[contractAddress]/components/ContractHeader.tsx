import React from 'react';
import Link from 'next/link';
import { Button } from '../../../../components/ui/button';
import { ArrowLeft, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';

interface ContractHeaderProps {
  contractAddress: string;
}

const ContractHeader: React.FC<ContractHeaderProps> = ({ contractAddress }) => {
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
          <Button variant="ghost" size="sm" className="mr-2 group">
            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {contractAddress.substring(0, 7)}...{contractAddress.substring(contractAddress.length - 4)}
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
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Interact with smart contract at: <span className="font-medium">{contractAddress}</span>
      </p>
    </div>
  );
};

export default ContractHeader; 