import { AssessmentSummary, QualityIssue } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import RadarChart from "@/components/charts/RadarChart";
import PieChart from "@/components/charts/PieChart";
import LineChart from "@/components/charts/LineChart";

interface QualityDashboardProps {
  summary: AssessmentSummary;
}

export default function QualityDashboard({ summary }: QualityDashboardProps) {
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

  // Get severity class for issue badges
  const getIssueSeverityClass = (severity: string) => {
    switch(severity) {
      case 'error':
        return 'bg-red-50 border-red-400 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-400 text-yellow-800';
      case 'info':
      default:
        return 'bg-green-50 border-green-400 text-green-800';
    }
  };

  // Get icon for issue badges
  const getIssueSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      case 'info':
      default:
        return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Data Quality Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
              <div className="w-full md:w-1/2">
                <h3 className="text-base font-medium text-gray-700 mb-3">Quality Dimensions</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <RadarChart dimensions={getAverageDimensionScores()} />
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <h3 className="text-base font-medium text-gray-700 mb-3">Issue Distribution</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <PieChart data={getIssueDistribution()} />
                </div>
              </div>
            </div>
            
            <h3 className="text-base font-medium text-gray-700 mb-3">Quality Trend Over Time</h3>
            <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-center justify-center">
              <LineChart />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Top Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.topIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className={`p-4 border-l-4 rounded-r-md ${getIssueSeverityClass(issue.severity)}`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {getIssueSeverityIcon(issue.severity)}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${issue.severity === 'error' ? 'text-red-800' : issue.severity === 'warning' ? 'text-yellow-800' : 'text-green-800'}`}>
                        {issue.description}
                      </h3>
                      <div className={`mt-1 text-xs ${issue.severity === 'error' ? 'text-red-700' : issue.severity === 'warning' ? 'text-yellow-700' : 'text-green-700'}`}>
                        <p>Affects: {issue.resourceType} resources</p>
                        <p>Dimension: {issue.dimension}</p>
                        {issue.count && <p>Count: {issue.count}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {summary.topIssues.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  No issues found
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full">
                View All Issues
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
