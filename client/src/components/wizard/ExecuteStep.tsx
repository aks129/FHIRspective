import React, { useEffect, useState } from "react";
import { ServerConnection, AssessmentConfig, AssessmentStatus } from "@/types";
import AssessmentProgress from "./AssessmentProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
  const [isStarting, setIsStarting] = useState(false);
  
  // Start assessment automatically when component mounts
  useEffect(() => {
    const startAssessment = async () => {
      // Only start if we haven't started already and don't have a status
      if (!assessmentStatus && !isStarting) {
        setIsStarting(true);
        try {
          await onStartAssessment();
        } catch (error) {
          console.error("Failed to start assessment:", error);
        } finally {
          setIsStarting(false);
        }
      }
    };
    
    startAssessment();
  }, [assessmentStatus, onStartAssessment, isStarting]);

  // Check if assessment is complete
  const isComplete = assessmentStatus?.status === 'completed';
  const isFailed = assessmentStatus?.status === 'failed';
  const isRunning = assessmentStatus?.status === 'running' || isStarting;

  return (
    <div className="fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">Assessment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {!assessmentStatus && isStarting ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-600">Starting assessment...</p>
            </div>
          ) : (
            <AssessmentProgress status={assessmentStatus} />
          )}
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
