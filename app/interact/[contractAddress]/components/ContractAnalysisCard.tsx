import React from 'react';
import { Shield, Loader2, InfoIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import ReactMarkdown from 'react-markdown';

interface ContractAnalysisCardProps {
  analysis: string;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  isAbiAvailable: boolean;
}

const ContractAnalysisCard: React.FC<ContractAnalysisCardProps> = ({ 
  analysis, 
  isAnalyzing, 
  onAnalyze,
  isAbiAvailable
}) => {
  if (isAnalyzing) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
            <p>Analyzing contract structure and security...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onAnalyze}
        className="mb-6"
        disabled={!isAbiAvailable}
      >
        <InfoIcon className="mr-2 h-4 w-4" />
        Analyze Contract
      </Button>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center">
          <Shield className="mr-2 h-4 w-4 text-green-500" />
          Contract Analysis
        </CardTitle>
        <CardDescription>
          Information about the contract structure and potential security considerations
          <span className="text-amber-600 dark:text-amber-400 block mt-1 text-xs">
            Note: This is a basic analysis and may not identify all security issues
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2" {...props} />,
                h2: ({ node, ...props }) => <h4 className="text-md font-semibold mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractAnalysisCard; 