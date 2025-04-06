import { AssessmentSummary } from "@/types";
import ResultsSummary from "./ResultsSummary";
import QualityDashboard from "./QualityDashboard";
import { Button } from "@/components/ui/button";

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
          >
            Download Full Report
          </Button>
        </div>
      </div>
    </div>
  );
}
