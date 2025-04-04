import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Badge } from '../../../../components/ui/badge';
import { Progress } from '../../../../components/ui/progress';
import { 
  Loader2, Shield, AlertTriangle, Info, CheckCircle, 
  FileCode, Zap, BrainCircuit, ChevronDown, ChevronUp, 
  AlertOctagon, Cpu, Activity, ArrowDownToLine 
} from 'lucide-react';
import { analyzeContract } from '../../../utils/contract-api-service';
import { ContractFunction } from '../../../types/contract';
import { groupFunctionsByType } from '../../../utils/interact-utils';

interface ContractAnalysisProps {
  contractAddress: string;
  abi?: any[];
  compact?: boolean;
  initialAnalysis?: string;
  contractFunctions?: ContractFunction[];
}

interface SecurityFinding {
  name: string;
  found: boolean;
  description: string;
  severity: 'positive' | 'warning' | 'info';
}

interface HederaStats {
  networkType: string;
  gasUsed: number;
  averageFee: string;
  stakingRewards?: string;
  accountCreated: number;
  hbarBalance?: string;
  tokenAssociations?: number;
  storageUsed?: number;
}

interface AnalysisResult {
  analysis: string;
  securityScore: number;
  securityBreakdown: {
    securityPatterns: number;
    accessControl: boolean;
    pausable: boolean;
    bytecodeSize: number;
    findings: SecurityFinding[];
  };
  bytecodeSize: number;
  functionCount: number;
  eventCount: number;
  hederaStats?: HederaStats;
}

// Add this function to generate a detailed text analysis based on contract functions
const generateDetailedAnalysis = (contractFunctions: ContractFunction[], bytecodeSize?: number): string => {
  const { readFunctions, writeFunctions } = groupFunctionsByType(contractFunctions, '');
  
  // Group functions by category for better analysis
  const viewFunctions = readFunctions.filter(f => f.stateMutability === 'view');
  const pureFunctions = readFunctions.filter(f => f.stateMutability === 'pure');
  const payableFunctions = writeFunctions.filter(f => f.stateMutability === 'payable');
  const nonPayableFunctions = writeFunctions.filter(f => f.stateMutability === 'nonpayable');
  
  // Identify potential roles based on function names
  const ownerFunctions = contractFunctions.filter(f => 
    f.name.toLowerCase().includes('owner') || 
    f.name.toLowerCase().includes('admin') ||
    f.name.toLowerCase().match(/^(set|update|change|modify|grant|revoke)/)
  );
  
  // Identify potential token functions
  const tokenFunctions = contractFunctions.filter(f => 
    f.name.toLowerCase().includes('token') || 
    f.name.toLowerCase().includes('balance') ||
    f.name.toLowerCase().includes('allowance') ||
    f.name.toLowerCase().includes('transfer') ||
    f.name.toLowerCase().includes('approve')
  );
  
  let analysis = `## Detailed Analysis\n\n`;
  
  // Contract Type Analysis
  analysis += `### Contract Type:\n`;
  if (tokenFunctions.length >= 3) {
    analysis += `- This appears to be a token contract with ${tokenFunctions.length} token-related functions\n`;
  } else if (ownerFunctions.length >= 3) {
    analysis += `- This appears to be an administrative or governance contract with ${ownerFunctions.length} admin functions\n`;
  } else {
    analysis += `- This appears to be a utility or custom contract\n`;
  }
  
  // Function Breakdown
  analysis += `\n### Function Breakdown:\n`;
  analysis += `- ${readFunctions.length} read functions (${viewFunctions.length} view, ${pureFunctions.length} pure)\n`;
  analysis += `- ${writeFunctions.length} write functions (${payableFunctions.length} payable, ${nonPayableFunctions.length} non-payable)\n`;
  
  // Contract Size Analysis
  if (bytecodeSize) {
    analysis += `\n### Contract Size:\n`;
    analysis += `- Bytecode size: ${bytecodeSize.toLocaleString()} bytes\n`;
    
    const sizeAssessment = bytecodeSize > 24000 ? 
      "This contract is approaching Ethereum's maximum contract size limit (24KB)." :
      bytecodeSize > 16000 ?
      "This is a medium-sized contract." :
      "This is a relatively compact contract.";
      
    analysis += `- ${sizeAssessment}\n`;
  }
  
  // Key Features
  analysis += `\n### Key Features:\n`;
  
  // Check for common contract features
  const hasOwnership = contractFunctions.some(f => 
    f.name === 'owner' || f.name === 'getOwner' || f.name === 'transferOwnership'
  );
  
  const hasPausable = contractFunctions.some(f => 
    f.name === 'pause' || f.name === 'unpause' || f.name === 'paused'
  );
  
  const hasUpgradeable = contractFunctions.some(f => 
    f.name.includes('upgrade') || f.name.includes('implementation') || f.name === 'initialize'
  );
  
  const hasRoles = contractFunctions.some(f => 
    f.name.includes('role') || f.name.includes('grant') || f.name.includes('revoke')
  );
  
  if (hasOwnership) analysis += `- Ownership management functions\n`;
  if (hasPausable) analysis += `- Circuit breaker (pause/unpause) functionality\n`;
  if (hasUpgradeable) analysis += `- Upgrade mechanisms\n`;
  if (hasRoles) analysis += `- Role-based access control\n`;
  
  // List significant functions
  if (payableFunctions.length > 0) {
    analysis += `- Payable functions: ${payableFunctions.map(f => f.name).join(', ')}\n`;
  }
  
  // Security Considerations
  analysis += `\n### Security Considerations:\n`;
  
  if (hasUpgradeable) {
    analysis += `- This contract appears to be upgradeable, which requires trust in the upgrade admin\n`;
  }
  
  if (hasPausable) {
    analysis += `- The contract can be paused, which may affect user operations\n`;
  }
  
  const hasExternalCalls = contractFunctions.some(f => 
    f.name.toLowerCase().includes('call') || 
    f.name.toLowerCase().includes('send') || 
    f.name.toLowerCase().includes('transfer')
  );
  
  if (hasExternalCalls) {
    analysis += `- Contains functions that may make external calls (potential reentrancy risk)\n`;
  }
  
  // Interaction Guidance
  analysis += `\n### Interaction Guidance:\n`;
  
  if (readFunctions.length > 0) {
    analysis += `- Start by exploring the read functions to understand the contract state\n`;
  }
  
  if (hasOwnership) {
    analysis += `- Check the contract owner before attempting administrative functions\n`;
  }
  
  if (hasPausable) {
    analysis += `- Verify if the contract is paused before attempting to interact with it\n`;
  }
  
  return analysis;
};

const ContractAnalysis: React.FC<ContractAnalysisProps> = ({
  contractAddress,
  abi = [],
  compact = false,
  initialAnalysis = '',
  contractFunctions = []
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [textAnalysis, setTextAnalysis] = useState<string>(initialAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expanded, setExpanded] = useState(false);
  const [networkType, setNetworkType] = useState<string>('testnet');

  const { readFunctions, writeFunctions } = groupFunctionsByType(contractFunctions, '');

  useEffect(() => {
    if (initialAnalysis) {
      setTextAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  useEffect(() => {
    if (contractAddress && typeof contractAddress === 'string') {
      if (contractAddress.includes('mainnet') || 
          contractAddress.match(/^0\.0\.[1-9][0-9]{5,}$/) ||
          contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setNetworkType('mainnet');
      } else {
        setNetworkType('testnet');
      }
    }
  }, [contractAddress]);

  // Add useEffect to update analysis based on contractFunctions when they change
  useEffect(() => {
    if (contractFunctions.length > 0 && !textAnalysis) {
      const generatedAnalysis = generateDetailedAnalysis(
        contractFunctions, 
        analysisResult?.bytecodeSize
      );
      setTextAnalysis(generatedAnalysis);
    }
  }, [contractFunctions, analysisResult, textAnalysis]);

  // Function to analyze contract
  const handleAnalyzeContract = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await analyzeContract(contractAddress, abi);
      
      // Merge function data from our grouping with the analysis result
      if (data) {
        data.functionCount = contractFunctions.length;
        data.readFunctionCount = readFunctions.length;
        data.writeFunctionCount = writeFunctions.length;
        
        // Generate detailed analysis if API doesn't provide it
        if (!data.analysis) {
          data.analysis = generateDetailedAnalysis(contractFunctions, data.bytecodeSize);
        }
      }
      
      setAnalysisResult(data);
      setTextAnalysis(data.analysis || '');
    } catch (err: any) {
      console.error('Error analyzing contract:', err);
      setError(err.message || 'An error occurred while analyzing the contract');
      
      // Still generate local analysis even if the API fails
      const generatedAnalysis = generateDetailedAnalysis(
        contractFunctions,
        undefined // We don't have bytecode size if API failed
      );
      setTextAnalysis(generatedAnalysis);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format markdown to HTML
  const formatMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    
    // Replace headers
    let html = markdown
      .replace(/## (.*?)\n/g, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/### (.*?)\n/g, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>');
    
    // Replace bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace newlines with <br>
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };
  
  // Split analysis into sections based on headers (lines ending with :)
  const formatSimpleAnalysis = (analysisText: string) => {
    if (!analysisText) return [];
    
    const lines = analysisText.split('\n');
    const sections: { title: string; content: string[] }[] = [];
    let currentSection: { title: string; content: string[] } | null = null;
    
    lines.forEach(line => {
      if (line.trim().endsWith(':') || /^#+\s+.+:$/.test(line)) {
        // This is a header, start a new section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.trim(),
          content: []
        };
      } else if (currentSection && line.trim()) {
        // This is content for the current section
        currentSection.content.push(line.trim());
      }
    });
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };
  
  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Simple card view
  if (compact) {
    const analysisData = formatSimpleAnalysis(textAnalysis);
    
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2 text-purple-500" />
            Contract Analysis
          </CardTitle>
          <CardDescription>
            Automated analysis of contract functionality and potential usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Analyzing contract...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {analysisData.length > 0 ? (
                <>
                  {/* Show network info badge */}
                  <div className="mb-4">
                    <Badge variant={networkType === 'mainnet' ? 'default' : 'outline'} className="mb-2">
                      {networkType === 'mainnet' ? 'Hedera Mainnet' : 'Hedera Testnet'}
                    </Badge>
                  </div>
                  
                  {/* Show first two sections always */}
                  {analysisData.slice(0, 2).map((section, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="text-sm font-medium">{section.title}</h3>
                      <div className="text-sm space-y-1">
                        {section.content.map((line, i) => (
                          <p key={i} className="text-muted-foreground">{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show remaining sections if expanded */}
                  {expanded && analysisData.length > 2 && (
                    <div className="space-y-4 pt-2 border-t">
                      {analysisData.slice(2).map((section, index) => (
                        <div key={index} className="space-y-2">
                          <h3 className="text-sm font-medium">{section.title}</h3>
                          <div className="text-sm space-y-1">
                            {section.content.map((line, i) => (
                              <p key={i} className="text-muted-foreground">{line}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Toggle button if there are more than 2 sections */}
                  {analysisData.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setExpanded(!expanded)}
                      className="w-full flex items-center justify-center text-xs"
                    >
                      {expanded ? (
                        <>Show Less <ChevronUp className="ml-1 h-3 w-3" /></>
                      ) : (
                        <>Show More <ChevronDown className="ml-1 h-3 w-3" /></>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No analysis data available. Click "Analyze Contract" to get insights.
                  </p>
                  <Button 
                    onClick={handleAnalyzeContract} 
                    disabled={isLoading}
                    size="sm"
                    className="mt-4"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Analyze Contract
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Full detailed view
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Contract Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={networkType === 'mainnet' ? 'default' : 'outline'}>
              {networkType === 'mainnet' ? 'Hedera Mainnet' : 'Hedera Testnet'}
            </Badge>
            <Button 
              onClick={handleAnalyzeContract} 
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Analyze Contract
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!analysisResult && !isLoading && !error && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Click "Analyze Contract" to perform a security and functionality analysis
            </p>
          </div>
        )}
        
        {analysisResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="hedera">Hedera</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Security Score</h3>
                    <Badge 
                      variant={analysisResult.securityScore >= 70 ? "secondary" : analysisResult.securityScore >= 50 ? "outline" : "destructive"}
                      className={analysisResult.securityScore >= 70 ? "bg-green-100 text-green-800" : undefined}
                    >
                      {analysisResult.securityScore}/100
                    </Badge>
                  </div>
                  <Progress 
                    value={analysisResult.securityScore} 
                    className="h-2 mb-2"
                    indicatorClassName={getScoreColor(analysisResult.securityScore)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.securityScore >= 80 ? 'Excellent security practices' :
                     analysisResult.securityScore >= 60 ? 'Good security practices' :
                     analysisResult.securityScore >= 40 ? 'Moderate security concerns' :
                     'Significant security concerns'}
                  </p>
                </div>
                
                <div className="rounded-lg border p-4">
                  <div className="flex items-center mb-2">
                    <FileCode className="h-4 w-4 mr-2 text-blue-500" />
                    <h3 className="font-medium">Contract Size</h3>
                  </div>
                  <p className="text-2xl font-bold mb-1">{analysisResult.bytecodeSize.toLocaleString()} bytes</p>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.bytecodeSize > 24000 ? 'Large contract (approaching size limits)' :
                     analysisResult.bytecodeSize > 16000 ? 'Medium-sized contract' :
                     'Compact contract'}
                  </p>
                </div>
                
                <div className="rounded-lg border p-4">
                  <div className="flex items-center mb-2">
                    <Zap className="h-4 w-4 mr-2 text-amber-500" />
                    <h3 className="font-medium">Interface</h3>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Functions:</span>
                    <span className="text-sm font-medium">{analysisResult.functionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Events:</span>
                    <span className="text-sm font-medium">{analysisResult.eventCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Key Findings</h3>
                {analysisResult.securityBreakdown?.findings?.length > 0 ? (
                  <ul className="space-y-2">
                    {analysisResult.securityBreakdown.findings.slice(0, 5).map((finding, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 mt-0.5">{getSeverityIcon(finding.severity)}</span>
                        <div>
                          <span className="font-medium">{finding.name}:</span> {finding.description}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No significant findings detected</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Security Breakdown</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Access Control</span>
                      <Badge 
                        variant={analysisResult.securityBreakdown?.accessControl ? "secondary" : "destructive"}
                        className={analysisResult.securityBreakdown?.accessControl ? "bg-green-100 text-green-800" : undefined}
                      >
                        {analysisResult.securityBreakdown?.accessControl ? "Implemented" : "Missing"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analysisResult.securityBreakdown?.accessControl 
                        ? "Contract implements access control mechanisms" 
                        : "Contract lacks proper access control - high risk"}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Pausable Functionality</span>
                      <Badge 
                        variant={analysisResult.securityBreakdown?.pausable ? "secondary" : "default"}
                        className={analysisResult.securityBreakdown?.pausable ? "bg-green-100 text-green-800" : undefined}
                      >
                        {analysisResult.securityBreakdown?.pausable ? "Implemented" : "Not Found"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analysisResult.securityBreakdown?.pausable 
                        ? "Contract can be paused in case of emergency" 
                        : "Contract cannot be paused if issues are discovered"}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Security Patterns</span>
                      <Badge 
                        variant={analysisResult.securityBreakdown?.securityPatterns > 2 ? "secondary" : "outline"}
                        className={analysisResult.securityBreakdown?.securityPatterns > 2 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                      >
                        {analysisResult.securityBreakdown?.securityPatterns} patterns
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analysisResult.securityBreakdown?.securityPatterns > 3 
                        ? "Contract implements multiple security patterns" 
                        : analysisResult.securityBreakdown?.securityPatterns > 0
                        ? "Contract implements some security patterns"
                        : "No security patterns detected"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">All Security Findings</h3>
                {analysisResult.securityBreakdown?.findings?.length > 0 ? (
                  <ul className="space-y-3">
                    {analysisResult.securityBreakdown.findings.map((finding, index) => (
                      <li key={index} className="flex items-start pb-3 border-b last:border-0 last:pb-0">
                        <span className="mr-2 mt-0.5">{getSeverityIcon(finding.severity)}</span>
                        <div>
                          <div className="font-medium">{finding.name}</div>
                          <p className="text-sm text-muted-foreground">{finding.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No security findings detected</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="hedera" className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Hedera Network Integration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-2">
                      <AlertOctagon className="h-4 w-4 mr-2 text-purple-500" />
                      <h3 className="font-medium">Network Info</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Network:</span>
                        <Badge variant="outline" className="font-mono">
                          {analysisResult.hederaStats?.networkType || networkType}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Contract Format:</span>
                        <span className="text-sm font-medium">
                          {contractAddress.startsWith('0x') ? 'EVM (0x...)' : 'Hedera (0.0.x)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Account Created:</span>
                        <span className="text-sm font-medium">
                          {analysisResult.hederaStats?.accountCreated ? 
                            new Date(analysisResult.hederaStats.accountCreated * 1000).toLocaleDateString() : 
                            'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center mb-2">
                      <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                      <h3 className="font-medium">Resource Usage</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm">Gas Used:</span>
                        <span className="text-sm font-medium">
                          {analysisResult.hederaStats?.gasUsed?.toLocaleString() || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Transaction Fee:</span>
                        <span className="text-sm font-medium">
                          {analysisResult.hederaStats?.averageFee || '~0.0001 ℏ'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Storage Used:</span>
                        <span className="text-sm font-medium">
                          {analysisResult.hederaStats?.storageUsed?.toLocaleString() || '~2'} KB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 rounded-lg border p-4">
                  <div className="flex items-center mb-2">
                    <Activity className="h-4 w-4 mr-2 text-green-500" />
                    <h3 className="font-medium">Hedera Optimization Tips</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <ArrowDownToLine className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
                      <span>
                        <strong>Gas Optimization:</strong> Hedera's gas costs are typically lower than Ethereum. Consider batching multiple operations into one transaction where possible.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowDownToLine className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
                      <span>
                        <strong>HTS Integration:</strong> Consider using Hedera Token Service for token operations instead of custom ERC-20/ERC-721 implementations for better efficiency.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowDownToLine className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
                      <span>
                        <strong>Consensus Service:</strong> For event logging, consider using Hedera Consensus Service instead of contract events for better scalability and lower costs.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <ArrowDownToLine className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
                      <span>
                        <strong>Precompiles:</strong> Hedera offers special precompiles for HTS and other Hedera-specific features that can reduce gas costs.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Detailed Analysis</h3>
                <div 
                  className="prose prose-sm max-w-none" 
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(analysisResult.analysis) }}
                />
              </div>
              <div className="rounded-lg border p-4 mb-4">
                <h3 className="font-medium mb-3">Function Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Total Functions:</span>
                    <Badge variant="outline">{contractFunctions.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Read Functions:</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      {readFunctions.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Write Functions:</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                      {writeFunctions.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractAnalysis;
