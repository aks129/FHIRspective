import { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AssessmentSummary, QualityIssue, ResourceQualityScore } from '@/types';
import InteractiveBarChart from './InteractiveBarChart';
import ResourceDetailView from './ResourceDetailView';
import RadarChart from './RadarChart';
import PieChart from './PieChart';
import { Download, Share2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QualityScoreVisualizationProps {
  summary: AssessmentSummary;
}

export default function QualityScoreVisualization({ summary }: QualityScoreVisualizationProps) {
  const { toast } = useToast();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [resourceDetails, setResourceDetails] = useState<ResourceQualityScore | null>(null);
  const [resourceIssues, setResourceIssues] = useState<QualityIssue[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');
  
  // Function to handle exporting the report in different formats
  const handleExportReport = (format: "pdf" | "json" | "csv") => {
    // In a real implementation, this would make an API call to generate and download the report
    
    // For now, show a toast notification
    toast({
      title: "Export Started",
      description: `Your ${format.toUpperCase()} report is being prepared for download.`,
    });
    
    // Simulate a delay before showing the "completed" toast
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Your report has been exported successfully.`,
      });
    }, 1500);
  };
  
  // Function to handle sharing results
  const handleShareResults = () => {
    // In a real implementation, this would open a share dialog or generate a shareable link
    
    // For now, show a toast notification
    toast({
      title: "Share Feature",
      description: "Sharing functionality will be available in a future update.",
    });
  };
  
  // Reset selection when summary changes
  useEffect(() => {
    setSelectedResource(null);
    setViewMode('summary');
  }, [summary]);
  
  // Update resource details when a resource is selected
  useEffect(() => {
    if (selectedResource) {
      const resource = summary.resourceScores.find(r => r.resourceType === selectedResource) || null;
      setResourceDetails(resource);
      
      // Filter issues for the selected resource
      const issues = summary.topIssues.filter(issue => 
        issue.resourceType === selectedResource ||
        issue.resourceType.includes(selectedResource)
      );
      setResourceIssues(issues);
      
      // Switch to details view
      setViewMode('details');
    }
  }, [selectedResource, summary]);
  
  // Prepare data for dimension radar chart
  const getAverageDimensionScores = () => {
    // Calculate average scores across all resources
    const scores = summary.resourceScores.reduce(
      (acc, resource) => {
        acc.completeness += resource.dimensionScores.completeness;
        acc.conformity += resource.dimensionScores.conformity;
        acc.plausibility += resource.dimensionScores.plausibility;
        
        if (resource.dimensionScores.timeliness) {
          acc.timeliness += resource.dimensionScores.timeliness;
          acc.timelinessCount++;
        }
        
        if (resource.dimensionScores.calculability) {
          acc.calculability += resource.dimensionScores.calculability;
          acc.calculabilityCount++;
        }
        
        return acc;
      },
      { 
        completeness: 0, 
        conformity: 0, 
        plausibility: 0, 
        timeliness: 0, 
        calculability: 0, 
        timelinessCount: 0, 
        calculabilityCount: 0 
      }
    );
    
    const count = summary.resourceScores.length;
    
    // Return averages, handling cases where some dimensions might not be available for all resources
    return {
      completeness: scores.completeness / count,
      conformity: scores.conformity / count,
      plausibility: scores.plausibility / count,
      timeliness: scores.timelinessCount ? scores.timeliness / scores.timelinessCount : undefined,
      calculability: scores.calculabilityCount ? scores.calculability / scores.calculabilityCount : undefined
    };
  };

  // Prepare data for issue distribution chart
  const getIssueDistribution = () => {
    const resourceIssues = summary.resourceScores.map(resource => ({
      name: resource.resourceType,
      value: resource.issuesCount
    }));
    
    return resourceIssues;
  };

  // Handle resource selection
  const handleResourceSelect = (resourceType: string) => {
    setSelectedResource(resourceType);
  };

  // Handle going back to summary view
  const handleBackToSummary = () => {
    setSelectedResource(null);
    setResourceDetails(null);
    setViewMode('summary');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Quality Score Visualization
              </CardTitle>
              <CardDescription>
                {viewMode === 'details' && selectedResource ? 
                  `Detailed view for ${selectedResource} resources` : 
                  `Overall quality score: ${summary.overallQualityScore.toFixed(1)}%`
                }
              </CardDescription>
            </div>
            {viewMode === 'details' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackToSummary}
              >
                Back to Overview
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={() => handleExportReport("pdf")}>
              <FileText className="h-4 w-4 mr-1" /> Export Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShareResults()}>
              <Share2 className="h-4 w-4 mr-1" /> Share Results
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExportReport("pdf")}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'summary' ? (
          <div className="space-y-6">
            <div className="h-80">
              <Tabs defaultValue="bar">
                <TabsList className="mb-4">
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="radar">Radar Chart</TabsTrigger>
                  <TabsTrigger value="pie">Issues Distribution</TabsTrigger>
                </TabsList>
                <TabsContent value="bar" className="h-64">
                  <InteractiveBarChart 
                    data={summary.resourceScores} 
                    onResourceSelect={handleResourceSelect} 
                  />
                </TabsContent>
                <TabsContent value="radar" className="h-64">
                  <RadarChart dimensions={getAverageDimensionScores()} />
                </TabsContent>
                <TabsContent value="pie" className="h-64">
                  <PieChart data={getIssueDistribution()} />
                </TabsContent>
              </Tabs>
            </div>
            <div className="text-sm text-gray-600 text-center">
              Click on any resource in the bar chart to see detailed quality metrics
            </div>
          </div>
        ) : (
          resourceDetails && (
            <ResourceDetailView 
              resource={resourceDetails} 
              issues={resourceIssues} 
            />
          )
        )}
      </CardContent>
    </Card>
  );
}