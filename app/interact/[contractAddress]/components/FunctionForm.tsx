import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Input } from '../../../../components/ui/input';
import { Loader2, Send } from 'lucide-react';
import ContractTransactionDetails from './ContractTransactionDetails';
import { ContractFunction, FunctionInput } from '../../../types/contract';
import { isReadOnlyFunction } from '../../../utils/interact-utils';
import { FunctionIcon, FunctionTypeBadge } from '../../components/ui';

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
  if (!selectedFunction) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-4">
          <div className="rounded-full bg-primary/10 p-4 mb-6">
            <FunctionIcon func={{ name: '', inputs: [], outputs: [], stateMutability: '' }} className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-3 text-center">Select a Function to Interact</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Choose a function from the sidebar to interact with this smart contract. Read functions will query data, while write functions will submit transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isRead = isReadOnlyFunction(selectedFunction);

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className={`pb-3 ${isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-amber-50/50 dark:bg-amber-900/10'}`}>
        <CardTitle className="flex items-center text-lg">
          <FunctionIcon func={selectedFunction} className="h-5 w-5 mr-2" />
          {selectedFunction.name}
          <FunctionTypeBadge func={selectedFunction} className="text-xs px-2 py-0.5 rounded-full ml-3" />
        </CardTitle>
        <CardDescription>
          {selectedFunction.humanReadableSignature || `${selectedFunction.name}(${selectedFunction.inputs.map(i => `${i.type} ${i.name}`).join(', ')})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          {functionInputs.length > 0 ? (
            <div className="space-y-4">
              {functionInputs.map((input, index) => (
                <div key={input.name || index} className="grid gap-2">
                  <Label className="flex items-center text-sm">
                    {input.name || `Parameter ${index + 1}`}
                    <span className="ml-2 text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                      {input.type}
                    </span>
                  </Label>
                  <Input
                    value={input.value}
                    onChange={(e) => onInputChange(input.name, e.target.value)}
                    placeholder={`Enter value for ${input.name || `parameter ${index + 1}`} (${input.type})`}
                    className="font-mono border-input/60 bg-background/50"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-md p-3 bg-muted/20">
              <p className="text-sm text-center text-muted-foreground">This function doesn't require any parameters</p>
            </div>
          )}

          <Button
            type="submit"
            className={`w-full ${
              isRead
                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isRead ? 'Calling Function...' : 'Executing Transaction...'}
              </>
            ) : (
              <>
                <FunctionIcon func={selectedFunction} className="mr-2 h-4 w-4" />
                {isRead ? 'Call Function' : 'Execute Transaction'}
              </>
            )}
          </Button>

          {hasWriteFunctionSuggestion && (
            <div className="mt-3 text-center">
              <Button
                onClick={onRetryAsWriteFunction}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
              >
                Retry as Write Function
              </Button>
            </div>
          )}
        </form>

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
      </CardContent>
    </Card>
  );
};

export default FunctionForm;