import { useState } from "react";
import StepIndicator from "@/components/wizard/StepIndicator";
import ConnectStep from "@/components/wizard/ConnectStep";
import ConfigureStep from "@/components/wizard/ConfigureStep";
import ExecuteStep from "@/components/wizard/ExecuteStep";
import ResultsStep from "@/components/wizard/ResultsStep";
import { useAssessment } from "@/hooks/useAssessment";

export default function Home() {
  const [step, setStep] = useState<number>(1);
  const { 
    serverConnection, 
    updateServerConnection,
    assessmentConfig, 
    updateAssessmentConfig,
    startAssessment,
    assessmentStatus,
    assessmentResults
  } = useAssessment();

  // Step navigation handlers
  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleGoToStep = (stepNumber: number) => {
    setStep(stepNumber);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <StepIndicator currentStep={step} onStepClick={handleGoToStep} />

      {/* Step 1: Connect */}
      {step === 1 && (
        <ConnectStep 
          serverConnection={serverConnection}
          onUpdateServerConnection={updateServerConnection}
          onNext={handleNextStep}
        />
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <ConfigureStep 
          assessmentConfig={assessmentConfig}
          onUpdateConfig={updateAssessmentConfig}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
        />
      )}

      {/* Step 3: Execute */}
      {step === 3 && (
        <ExecuteStep 
          assessmentConfig={assessmentConfig}
          serverConnection={serverConnection}
          onStartAssessment={startAssessment}
          assessmentStatus={assessmentStatus}
          onNext={handleNextStep}
          onPrev={handlePrevStep}
        />
      )}

      {/* Step 4: Results */}
      {step === 4 && (
        <ResultsStep 
          assessmentResults={assessmentResults}
          onStartNewAssessment={() => setStep(1)}
          onPrev={handlePrevStep}
        />
      )}
    </div>
  );
}
