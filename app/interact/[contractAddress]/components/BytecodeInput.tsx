import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Loader2, Code } from 'lucide-react';

interface BytecodeInputProps {
  manualBytecode: string;
  setManualBytecode: (value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  bytecodePending: boolean;
}

const BytecodeInput: React.FC<BytecodeInputProps> = ({
  manualBytecode,
  setManualBytecode,
  onSubmit,
  onCancel,
  bytecodePending
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
        <CardHeader>
          <CardTitle>Provide Contract Bytecode</CardTitle>
          <CardDescription>
            Enter the contract bytecode to improve function detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm">
            <p className="mb-2"><strong>Why use bytecode?</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>More reliable function detection than transaction history</li>
              <li>Works even for contracts with no prior transactions</li>
              <li>Identifies all available functions directly from on-chain data</li>
              <li>Better handling of proxy contracts and complex implementations</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              You can get the bytecode from block explorers like Etherscan, Hashscan, or by using tools like <code>eth_getCode</code>
            </p>
          </div>
          
          <form onSubmit={onSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bytecode">Contract Bytecode</Label>
                <div className="mt-1">
                  <textarea
                    id="bytecode"
                    rows={5}
                    className="w-full resize-none rounded-md border border-input p-2 font-mono text-sm"
                    placeholder="0x608060405234801561001057600080fd5b50..."
                    value={manualBytecode}
                    onChange={(e) => setManualBytecode(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  disabled={bytecodePending || !manualBytecode.trim()}
                >
                  {bytecodePending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Bytecode'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BytecodeInput; 