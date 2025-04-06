import { AssessmentSummary, QualityIssue } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Download, Share2, FileText } from "lucide-react";
import LineChart from "@/components/charts/LineChart";
import QualityScoreVisualization from "@/components/charts/QualityScoreVisualization";
import { useToast } from "@/hooks/use-toast";

interface QualityDashboardProps {
  summary: AssessmentSummary;
}

export default function QualityDashboard({ summary }: QualityDashboardProps) {
  const { toast } = useToast();
  
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
        {/* New Interactive Quality Score Visualization */}
        <QualityScoreVisualization summary={summary} />
        
        {/* Historical Trend Card - This will be populated with real data in a future enhancement */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">Quality Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
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
