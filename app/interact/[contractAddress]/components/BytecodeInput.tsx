import React from 'react';
import { Loader2, FileCode } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../../components/ui/card';

export interface BytecodeInputProps {
  bytecode: string;
  onChange: (bytecode: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const BytecodeInput: React.FC<BytecodeInputProps> = ({
  bytecode,
  onChange,
  onSubmit,
  isLoading
}) => {
  return (
    <Card className="border-dashed bg-muted/10">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileCode className="h-5 w-5 mr-2 text-primary" />
          Manual Bytecode Input
        </CardTitle>
        <CardDescription>
          Provide the contract bytecode to analyze and generate an ABI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="Enter contract bytecode (0x...)"
                className="font-mono text-xs h-32"
                value={bytecode}
                onChange={(e) => onChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the contract bytecode starting with 0x. 
                You can obtain this from a block explorer or by deploying the contract.
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !bytecode.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Bytecode
                </>
              ) : (
                'Analyze Bytecode'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BytecodeInput; 