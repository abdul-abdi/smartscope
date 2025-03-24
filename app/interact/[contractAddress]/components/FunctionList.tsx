import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Badge } from '../../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../../components/ui/tooltip';
import { BookOpen, Pencil, Code, Terminal, CheckCircle } from 'lucide-react';

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

interface FunctionListProps {
  functions: ContractFunction[];
  selectedFunction: ContractFunction | null;
  onFunctionSelect: (func: ContractFunction) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  onTabChange: (value: string) => void;
}

const FunctionList: React.FC<FunctionListProps> = ({
  functions,
  selectedFunction,
  onFunctionSelect,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange
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

  // Filter functions by type (read/write) and search query
  const filteredFunctions = (readOnly: boolean) => {
    return functions
      .filter(f => {
        const isReadFunction = isReadOnlyFunction(f);
        return isReadFunction === readOnly;
      })
      .filter(f => {
        if (!searchQuery) return true;
        return f.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  };
  
  const viewFunctions = filteredFunctions(true);
  const writeFunctions = filteredFunctions(false);

  // Function item component with status indication
  const renderFunctionItem = (func: ContractFunction, index: number) => {
    // Use the shared helper function
    const isRead = isReadOnlyFunction(func);
    
    return (
      <div
        key={index}
        className={`border rounded-md p-3 cursor-pointer transition-colors ${
          selectedFunction?.name === func.name
            ? isRead 
              ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700'
              : 'bg-amber-100 border-amber-300 dark:bg-amber-900 dark:border-amber-700'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => onFunctionSelect(func)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-medium flex items-center">
              {isRead ? (
                <BookOpen className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
              ) : (
                <Pencil className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
              )}
              {func.name}
              {func.verified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CheckCircle className="h-4 w-4 ml-1 text-green-600 dark:text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Verified on-chain</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {func.humanReadableSignature && (
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                {func.humanReadableSignature}
              </div>
            )}
          </div>
          <div>
            <Badge
              variant={isRead ? "secondary" : "default"}
              className={isRead 
                ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700"
              }
            >
              {isRead ? 'Read-only' : func.stateMutability === 'payable' ? 'Payable' : 'State-changing'}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

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
      className="lg:col-span-1"
    >
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle>Contract Functions</CardTitle>
          <CardDescription>Select a function to interact with</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-2 sticky top-0 bg-white dark:bg-gray-950 z-10 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Input
                placeholder="Search functions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <Tabs defaultValue="read" value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="w-full grid grid-cols-2 sticky top-20 z-10">
              <TabsTrigger value="read" className="flex items-center gap-1">
                <Code className="h-4 w-4 text-blue-500" />
                Read
                <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  {viewFunctions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="write" className="flex items-center gap-1">
                <Terminal className="h-4 w-4 text-amber-500" />
                Write
                <span className="ml-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  {writeFunctions.length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="read" className="p-4">
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {viewFunctions.length > 0 ? (
                  <div className="space-y-1">
                    {viewFunctions.map((func, index) => (
                      renderFunctionItem(func, index)
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground px-2">
                    <p>No read functions found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="write" className="p-4">
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {writeFunctions.length > 0 ? (
                  <div className="space-y-1">
                    {writeFunctions.map((func, index) => (
                      renderFunctionItem(func, index)
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground px-2">No write functions available{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FunctionList; 