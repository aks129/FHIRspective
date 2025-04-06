import { AssessmentSummary } from "@/types";
import ResultsSummary from "./ResultsSummary";
import QualityDashboard from "./QualityDashboard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ResultsStepProps {
  assessmentResults?: AssessmentSummary;
  onStartNewAssessment: () => void;
  onPrev: () => void;
}

export default function ResultsStep({
  assessmentResults,
  onStartNewAssessment,
  onPrev
}: ResultsStepProps) {
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
  if (!assessmentResults) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-800 mb-4">No assessment results available</h3>
        <Button 
          className="bg-primary hover:bg-primary-dark text-white mx-2"
          onClick={onStartNewAssessment}
        >
          Start New Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <ResultsSummary summary={assessmentResults} />
      
      <div className="mt-6">
        <QualityDashboard summary={assessmentResults} />
      </div>
      
      <div className="flex justify-between mt-6">
        <Button 
          variant="secondary"
          onClick={onPrev}
        >
          Back to Assessment
        </Button>
        <div className="space-x-3">
          <Button 
            variant="outline"
            onClick={onStartNewAssessment}
          >
            Start New Assessment
          </Button>
          <Button 
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => handleExportReport("pdf")}
          >
            Download Full Report
          </Button>
        </div>
      </div>
    </div>
  );
}
