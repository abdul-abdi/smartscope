import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';

// Simple progress component
const Progress = ({ value = 0, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div 
      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
      style={{ width: `${value}%` }}
    ></div>
  </div>
);

// Simple toast implementation
const useToast = () => {
  return {
    toast: ({ title, description, variant = 'default' }) => {
      console.log(`Toast: ${title} - ${description} (${variant})`);
    }
  };
};

interface LargeContractFormProps {
  onDeploySuccess?: (contractId: string, contractAddress: string) => void;
}

export default function LargeContractForm({ onDeploySuccess }: LargeContractFormProps) {
  const [bytecode, setBytecode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const { toast } = useToast();

  const validateBytecode = (code: string): boolean => {
    // Remove 0x prefix if present
    const hex = code.startsWith('0x') ? code.slice(2) : code;
    
    // Check if it's a valid hex string
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      setError('Invalid bytecode format. Must be a valid hexadecimal string.');
      return false;
    }
    
    // Check if it's not empty
    if (hex.length === 0) {
      setError('Bytecode cannot be empty.');
      return false;
    }
    
    return true;
  };

  const handleDeployContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setProgress(0);
    
    if (!validateBytecode(bytecode)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate progress for better user experience
      const progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 1000);
      
      const response = await fetch('/api/handle-large-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bytecode,
          gas: 500000, // Default gas limit
        }),
      });
      
      clearInterval(progressInterval);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to deploy contract');
      }
      
      setProgress(100);
      setSuccess(true);
      setDeploymentResult(data);
      
      toast({
        title: "Contract Deployed Successfully",
        description: `Contract ID: ${data.contractId}`,
      });
      
      if (onDeploySuccess && data.contractId && data.contractAddress) {
        onDeploySuccess(data.contractId, data.contractAddress);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deploy contract');
      setProgress(0);
      
      toast({
        title: "Deployment Failed",
        description: err.message || 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deploy Large Contract</CardTitle>
        <CardDescription>
          For deploying contracts with large bytecode (over 2KB), our specialized deployment process will chunk the bytecode into manageable parts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleDeployContract} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="bytecode" className="text-sm font-medium">
              Contract Bytecode (with or without 0x prefix)
            </label>
            <Textarea
              id="bytecode"
              placeholder="0x608060405234801561001057600080fd5b50..."
              value={bytecode}
              onChange={(e) => setBytecode(e.target.value)}
              className="font-mono text-xs h-48"
              disabled={loading}
              required
            />
          </div>
          
          {(loading || success) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Deployment Progress</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {progress === 100 && (
                <p className="text-sm text-muted-foreground">
                  Deployment complete! Contract size: {deploymentResult?.bytecodeSize} bytes
                </p>
              )}
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Success</AlertTitle>
              <AlertDescription className="flex flex-col space-y-2">
                <p>Contract deployed successfully!</p>
                <p className="font-mono text-xs">Contract ID: {deploymentResult?.contractId}</p>
                <p className="font-mono text-xs">Contract Address: {deploymentResult?.contractAddress}</p>
                {deploymentResult?.fileId && (
                  <p className="font-mono text-xs">File ID: {deploymentResult?.fileId}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" disabled={loading || bytecode.trim() === ''} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              'Deploy Contract'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 