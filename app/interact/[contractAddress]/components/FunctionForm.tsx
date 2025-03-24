import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Input } from '../../../../components/ui/input';
import { Loader2, Send, BookOpen, Terminal, Code } from 'lucide-react';
import ContractTransactionDetails from '../../../../components/ContractTransactionDetails';

interface FunctionInput {
  name: string;
  type: string;
  value: string;
}

interface ContractFunction {
  name: string;
  inputs: FunctionInput[];
  outputs: Array<{ type: string }>;
  stateMutability: string;
  humanReadableSignature?: string;
  verified?: boolean;
  constant?: boolean;
}

interface FunctionFormProps {
  selectedFunction: ContractFunction | null;
  functionInputs: FunctionInput[];
  onInputChange: (name: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  result: any;
  hasWriteFunctionSuggestion: boolean;
  onRetryAsWriteFunction: () => Promise<void>;
}

const FunctionForm: React.FC<FunctionFormProps> = ({
  selectedFunction,
  functionInputs,
  onInputChange,
  onSubmit,
  isLoading,
  result,
  hasWriteFunctionSuggestion,
  onRetryAsWriteFunction
}) => {
  // Helper to determine if a function is read-only
  const isReadOnlyFunction = (func: ContractFunction): boolean => {
    if (!func) return false;
    
    // Check explicit markers
    const isViewOrPure = func.stateMutability === 'view' || func.stateMutability === 'pure';
    const isConstant = func.constant === true;
    
    // Check name patterns
    const hasGetterNamePattern = 
      func.name.startsWith('get') || 
      func.name.startsWith('is') || 
      func.name.startsWith('has') || 
      func.name.startsWith('total') || 
      func.name === 'symbol' || 
      func.name === 'name' || 
      func.name === 'decimals' || 
      func.name === 'balanceOf' || 
      func.name === 'allowance';
      
    // Check outputs
    const hasOutputs = func.outputs && func.outputs.length > 0;
    
    // Determine if it's read-only
    return isViewOrPure || isConstant || (hasGetterNamePattern && hasOutputs);
  };

  if (!selectedFunction) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Code className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">Select a function</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Choose a function from the sidebar to interact with this smart contract
          </p>
        </CardContent>
      </Card>
    );
  }

  const isRead = isReadOnlyFunction(selectedFunction);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {isRead ? (
            <BookOpen className="mr-2 h-5 w-5 text-blue-500" />
          ) : (
            <Terminal className="mr-2 h-5 w-5 text-amber-500" />
          )}
          {selectedFunction.name}
        </CardTitle>
        <CardDescription>
          {isRead
            ? 'Read function - returns data without modifying state' 
            : 'Write function - modifies contract state and requires transaction'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {functionInputs.length > 0 ? (
            functionInputs.map((input, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`input-${index}`}>
                  {input.name} <span className="text-xs text-muted-foreground ml-1">({input.type})</span>
                </Label>
                <Input
                  id={`input-${index}`}
                  value={input.value}
                  onChange={(e) => onInputChange(input.name, e.target.value)}
                  placeholder={`Enter ${input.type} value`}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">This function doesn't require any inputs</p>
          )}
          
          {result !== null && (
            <div className="mt-6 border rounded-md overflow-hidden">
              <div className={`px-4 py-2 border-b ${
                isRead
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'bg-amber-50 dark:bg-amber-900/20'
              }`}>
                <div className="flex items-center">
                  <h3 className="text-sm font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {isRead ? 'Function Result' : 'Transaction Executed'}
                  </h3>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    isRead
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-300'
                  }`}>
                    {selectedFunction.name}
                  </span>
                </div>
              </div>
              
              <ContractTransactionDetails 
                result={result}
                functionName={selectedFunction.name}
                isReadFunction={isRead}
              />
            </div>
          )}
        
          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isLoading}
              className={
                isRead
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRead ? 'Reading...' : 'Executing...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {isRead ? 'Call Function' : 'Execute Function'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FunctionForm; 