import React, { useEffect } from "react";
import { ServerConnection, AssessmentConfig, AssessmentStatus } from "@/types";
import AssessmentProgress from "./AssessmentProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecuteStepProps {
  assessmentConfig: AssessmentConfig;
  serverConnection: ServerConnection;
  onStartAssessment: () => Promise<number | null>;
  assessmentStatus?: AssessmentStatus;
  onNext: () => void;
  onPrev: () => void;
}

export default function ExecuteStep({
  assessmentConfig,
  serverConnection,
  onStartAssessment,
  assessmentStatus,
  onNext,
  onPrev
}: ExecuteStepProps) {
  // Start assessment automatically when component mounts
  useEffect(() => {
    // Use a ref to track if we've already started the assessment
    const shouldStartAssessment = !assessmentStatus && !isStarted.current;
    
    if (shouldStartAssessment) {
      isStarted.current = true;
      onStartAssessment();
    }
  }, [assessmentStatus, onStartAssessment]);
  
  // Use a ref to prevent multiple calls to onStartAssessment
  const isStarted = React.useRef(false);

  // Check if assessment is complete
  const isComplete = assessmentStatus?.status === 'completed';
  const isFailed = assessmentStatus?.status === 'failed';
  const isRunning = assessmentStatus?.status === 'running';

  return (
    <div className="fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Assessment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentProgress
            status={assessmentStatus}
          />
        </CardContent>
        <CardFooter className="flex justify-between pt-6 mt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onPrev}
            disabled={isRunning}
          >
            Back to Configuration
          </Button>
          <Button
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={onNext}
            disabled={!isComplete}
          >
            {isComplete ? "View Results" : "Waiting for Assessment to Complete..."}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
