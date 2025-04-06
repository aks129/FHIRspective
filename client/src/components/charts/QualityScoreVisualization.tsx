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

interface QualityScoreVisualizationProps {
  summary: AssessmentSummary;
}

export default function QualityScoreVisualization({ summary }: QualityScoreVisualizationProps) {
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [resourceDetails, setResourceDetails] = useState<ResourceQualityScore | null>(null);
  const [resourceIssues, setResourceIssues] = useState<QualityIssue[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');
  
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
        <div className="flex justify-between items-center">
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