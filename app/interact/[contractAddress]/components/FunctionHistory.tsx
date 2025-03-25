import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { History, Check, X, ArrowRight, RefreshCw } from 'lucide-react';

interface FunctionCallHistoryProps {
  history: Array<{
    functionName: string;
    params: Array<{ name: string; value: string }>;
    result: any;
    timestamp: number;
  }>;
  onReplayCall: (functionName: string, params: any[]) => void;
}

const FunctionHistory: React.FC<FunctionCallHistoryProps> = ({ 
  history, 
  onReplayCall 
}) => {
  if (!history || history.length === 0) {
    return null;
  }

  // Format the timestamp to a readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Get success/error status from result
  const getCallStatus = (result: any) => {
    if (!result) return { status: 'unknown', icon: null };
    
    if (result.error) {
      return { 
        status: 'error', 
        icon: <X className="h-3 w-3 text-red-500" /> 
      };
    }
    
    if (result.transactionHash) {
      return { 
        status: 'tx', 
        icon: <Check className="h-3 w-3 text-green-500" /> 
      };
    }
    
    return { 
      status: 'success', 
      icon: <Check className="h-3 w-3 text-green-500" /> 
    };
  };

  return (
    <Card className="mt-6">
      <CardHeader className="py-3">
        <CardTitle className="text-md flex items-center">
          <History className="mr-2 h-4 w-4 text-primary" />
          Recent Function Calls
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {history.map((call, index) => {
            const { status, icon } = getCallStatus(call.result);
            
            return (
              <div key={index} className="py-2 px-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex items-center">
                    {call.functionName}
                    <Badge
                      variant="outline"
                      className={`ml-2 text-xs ${
                        status === 'error'
                          ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20'
                          : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20'
                      }`}
                    >
                      <span className="flex items-center">
                        {icon}
                        <span className="ml-1">
                          {status === 'error' ? 'Failed' : status === 'tx' ? 'Transaction' : 'Success'}
                        </span>
                      </span>
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(call.timestamp)}
                  </span>
                </div>
                
                {call.params.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {call.params.map(p => `${p.name ? p.name + ': ' : ''}${p.value}`).join(', ')}
                    </span>
                  </div>
                )}
                
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onReplayCall(
                      call.functionName, 
                      call.params.map(p => ({ type: p.name.split(':')[1]?.trim() || 'unknown', value: p.value }))
                    )}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Replay Call
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FunctionHistory; 