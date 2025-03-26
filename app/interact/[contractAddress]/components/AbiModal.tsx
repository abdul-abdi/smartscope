import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { ContractFunction } from '../../../types/contract';

interface AbiModalProps {
  isOpen: boolean;
  onClose: () => void;
  abi: ContractFunction[];
  contractAddress: string;
}

interface FunctionsByType {
  read: ContractFunction[];
  write: ContractFunction[];
  events: ContractFunction[];
  constructor: ContractFunction[];
  other: ContractFunction[];
}

const AbiModal: React.FC<AbiModalProps> = ({ isOpen, onClose, abi, contractAddress }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(abi, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(abi, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-abi-${contractAddress.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const formatFunctionSignature = (func: ContractFunction) => {
    if (!func || !func.name) return '';
    
    // Function name
    let signature = `${func.name}(`;
    
    // Add parameter types and names
    if (func.inputs && func.inputs.length > 0) {
      signature += func.inputs.map((input) => {
        return `${input.type}${input.name ? ` ${input.name}` : ''}`;
      }).join(', ');
    }
    
    signature += ')';
    
    // Add state mutability if it's not nonpayable
    if (func.stateMutability && func.stateMutability !== 'nonpayable') {
      signature += ` ${func.stateMutability}`;
    }
    
    // Add return types
    if (func.outputs && func.outputs.length > 0) {
      signature += ' returns (';
      signature += func.outputs.map((output) => {
        return `${output.type}${output.name ? ` ${output.name}` : ''}`;
      }).join(', ');
      signature += ')';
    }
    
    return signature;
  };
  
  // Group functions by type
  const functionsByType = abi.reduce((groups: FunctionsByType, item) => {
    if (item.type === 'function') {
      if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
        groups.read.push(item);
      } else {
        groups.write.push(item);
      }
    } else if (item.type === 'event') {
      groups.events.push(item);
    } else if (item.type === 'constructor') {
      groups.constructor.push(item);
    } else {
      groups.other.push(item);
    }
    return groups;
  }, {
    read: [],
    write: [],
    events: [],
    constructor: [],
    other: []
  } as FunctionsByType);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Contract ABI</DialogTitle>
          <DialogDescription>
            Application Binary Interface for contract at <span className="font-mono">{contractAddress}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {abi.length} ABI items: {functionsByType.read.length} read functions, {functionsByType.write.length} write functions, {functionsByType.events.length} events
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="flex items-center gap-1"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy ABI'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="formatted">
          <TabsList className="mb-4">
            <TabsTrigger value="formatted">Formatted View</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>
          
          <TabsContent value="formatted" className="relative">
            <div className="rounded-md border bg-muted/50 p-4 overflow-y-auto max-h-[60vh]">
              <h3 className="text-lg font-medium mb-2">Read Functions</h3>
              {functionsByType.read.length > 0 ? (
                <ul className="space-y-1 mb-6">
                  {functionsByType.read.map((func, index) => (
                    <li key={`read-${index}`} className="px-3 py-2 rounded-md hover:bg-muted">
                      <code className="text-sm font-mono">{formatFunctionSignature(func)}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">No read functions found</p>
              )}
              
              <h3 className="text-lg font-medium mb-2">Write Functions</h3>
              {functionsByType.write.length > 0 ? (
                <ul className="space-y-1 mb-6">
                  {functionsByType.write.map((func, index) => (
                    <li key={`write-${index}`} className="px-3 py-2 rounded-md hover:bg-muted">
                      <code className="text-sm font-mono">{formatFunctionSignature(func)}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">No write functions found</p>
              )}
              
              <h3 className="text-lg font-medium mb-2">Events</h3>
              {functionsByType.events.length > 0 ? (
                <ul className="space-y-1 mb-6">
                  {functionsByType.events.map((event, index) => (
                    <li key={`event-${index}`} className="px-3 py-2 rounded-md hover:bg-muted">
                      <code className="text-sm font-mono">
                        event {event.name}(
                        {event.inputs?.map((input, i) => 
                          `${input.type}${(input as any).indexed ? ' indexed' : ''}${input.name ? ` ${input.name}` : ''}`
                        ).join(', ')})
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">No events found</p>
              )}
              
              {functionsByType.constructor.length > 0 && (
                <>
                  <h3 className="text-lg font-medium mb-2">Constructor</h3>
                  <ul className="space-y-1 mb-6">
                    {functionsByType.constructor.map((ctor, index) => (
                      <li key={`ctor-${index}`} className="px-3 py-2 rounded-md hover:bg-muted">
                        <code className="text-sm font-mono">
                          constructor(
                          {ctor.inputs?.map((input, i) => 
                            `${input.type}${input.name ? ` ${input.name}` : ''}`
                          ).join(', ')})
                        </code>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="raw">
            <div className="relative">
              <pre className="rounded-md border bg-muted/50 p-4 overflow-x-auto overflow-y-auto max-h-[60vh]">
                <code className="text-sm font-mono">
                  {JSON.stringify(abi, null, 2)}
                </code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AbiModal; 