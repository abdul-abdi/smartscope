import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Badge } from '../../../../components/ui/badge';
import { Code, Terminal } from 'lucide-react';
import { ContractFunction } from '../../../types/contract';
import { isReadOnlyFunction, groupFunctionsByType } from '../../../utils/interact-utils';
import { FunctionItem } from '../../components/ui';

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
  // Use the shared groupFunctionsByType utility
  const { readFunctions: viewFunctions, writeFunctions } = groupFunctionsByType(functions, searchQuery);

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
                      <FunctionItem 
                        key={index}
                        func={func}
                        selected={selectedFunction?.name === func.name}
                        onClick={() => onFunctionSelect(func)}
                      />
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
                      <FunctionItem 
                        key={index}
                        func={func}
                        selected={selectedFunction?.name === func.name}
                        onClick={() => onFunctionSelect(func)}
                      />
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