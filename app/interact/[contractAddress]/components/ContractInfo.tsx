import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Terminal } from 'lucide-react';

interface ContractInfoProps {
  contractAddress: string;
  abiSource?: string;
  functionsCount?: number;
}

const ContractInfo: React.FC<ContractInfoProps> = ({ 
  contractAddress, 
  abiSource,
  functionsCount 
}) => {
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
                  abiSource === 'transaction' 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                }`}>
                  {abiSource === 'bytecode' && 'Bytecode Analysis'}
                  {abiSource === 'manual-bytecode' && 'Manual Bytecode'}
                  {abiSource === 'source' && 'Source Code'}
                  {abiSource === 'transaction' && 'Transaction History (Limited)'}
                  {abiSource === 'custom' && 'Custom ABI'}
                </span>
              </div>
            )}
            {functionsCount !== undefined && (
              <div className="flex items-center">
                <span className="text-muted-foreground mr-1">Functions:</span>
                <span className="font-medium">{functionsCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ContractInfo; 