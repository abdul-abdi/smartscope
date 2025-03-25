import React from 'react';
import { Loader2, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';

export interface ContractAnalysisCardProps {
  analysis: string;
  isLoading?: boolean;
}

const ContractAnalysisCard: React.FC<ContractAnalysisCardProps> = ({ analysis, isLoading = false }) => {
  const [expanded, setExpanded] = React.useState(false);

  // Split analysis into sections based on headers (lines ending with :)
  const formatAnalysis = () => {
    if (!analysis) return [];
    
    const lines = analysis.split('\n');
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

  const analysisData = formatAnalysis();
  
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
              <p className="text-muted-foreground text-center py-4">
                No analysis data available
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractAnalysisCard; 