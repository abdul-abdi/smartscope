import React from 'react';
import { BookOpen, Terminal, CheckCircle, Code, AlertTriangle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { ContractFunction } from '../../types/contract';
import { isReadOnlyFunction } from '../../utils/interact-utils';

/**
 * Function type badge component
 */
export const FunctionTypeBadge: React.FC<{ 
  func: ContractFunction,
  className?: string,
  variant?: "default" | "outline" | "secondary" | null
}> = ({ func, className = '', variant = "outline" }) => {
  const isRead = isReadOnlyFunction(func);
  
  return (
    <Badge
      variant={variant}
      className={`${
        isRead
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
      } ${className}`}
    >
      {isRead ? 'read' : 'write'}
    </Badge>
  );
};

/**
 * Function icon component
 */
export const FunctionIcon: React.FC<{ 
  func: ContractFunction,
  className?: string
}> = ({ func, className = '' }) => {
  const isRead = isReadOnlyFunction(func);
  
  return isRead
    ? <BookOpen className={`text-blue-600 dark:text-blue-400 ${className}`} />
    : <Terminal className={`text-amber-600 dark:text-amber-400 ${className}`} />;
};

/**
 * Verification badge component
 */
export const VerificationBadge: React.FC<{ 
  verified: boolean,
  source?: string,
  className?: string
}> = ({ verified, source = '', className = '' }) => {
  if (verified) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 text-[10px] px-1 py-0 h-4 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 ${className}`}>
              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
              verified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Function verified on-chain</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Different tooltip based on source
  let tooltipText = "This function couldn't be verified in the contract bytecode and may not exist.";
  
  if (source === 'bytecode') {
    tooltipText = "This function was detected through bytecode analysis and may have limited accuracy.";
  } else if (source === 'transaction') {
    tooltipText = "This function was detected from transaction history and may not be callable.";
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Function item component for use in lists
 */
export const FunctionItem: React.FC<{
  func: ContractFunction,
  selected: boolean,
  onClick: () => void,
  className?: string,
  source?: string
}> = ({ func, selected, onClick, className = '', source = '' }) => {
  const isRead = isReadOnlyFunction(func);
  const isVerified = func.verified !== false;
  
  // Create selector if it exists
  const selector = func.selector || '';
  
  return (
    <div
      className={`p-2 border rounded-md cursor-pointer transition-all ${
        selected
          ? isRead
            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
            : 'bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
          : 'hover:bg-muted/50 border-border'
      } ${!isVerified ? 'border-dashed' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center">
          {func.name}
          {!isVerified && <VerificationBadge verified={false} source={source} className="ml-1.5" />}
        </span>
        <FunctionTypeBadge func={func} />
      </div>
      {func.humanReadableSignature && (
        <div className="font-mono text-xs text-muted-foreground mt-1 truncate">
          {func.humanReadableSignature}
        </div>
      )}
      {selector && (
        <div className="font-mono text-xs text-muted-foreground mt-1 opacity-70">
          {selector}
        </div>
      )}
    </div>
  );
}; 