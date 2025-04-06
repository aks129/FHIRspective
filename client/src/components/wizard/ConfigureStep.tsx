import { AssessmentConfig } from "@/types";
import ResourceSelectionForm from "./ResourceSelectionForm";
import DataQualityFrameworkForm from "./DataQualityFrameworkForm";
import ExportOptionsForm from "./ExportOptionsForm";
import { Card, CardContent } from "@/components/ui/card";

interface ConfigureStepProps {
  assessmentConfig: AssessmentConfig;
  onUpdateConfig: (field: keyof AssessmentConfig, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ConfigureStep({
  assessmentConfig,
  onUpdateConfig,
  onNext,
  onPrev
}: ConfigureStepProps) {
  return (
    <div className="fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceSelectionForm 
          resources={assessmentConfig.resources}
          sampleSize={assessmentConfig.sampleSize}
          validator={assessmentConfig.validator}
          implementationGuide={assessmentConfig.implementationGuide}
          onUpdateResources={(resources) => onUpdateConfig("resources", resources)}
          onUpdateSampleSize={(size) => onUpdateConfig("sampleSize", size)}
          onUpdateValidator={(validator) => onUpdateConfig("validator", validator)}
          onUpdateImplementationGuide={(guide) => onUpdateConfig("implementationGuide", guide)}
        />
        
        <DataQualityFrameworkForm 
          framework={assessmentConfig.qualityFramework}
          dimensions={assessmentConfig.dimensions}
          purpose={assessmentConfig.purpose}
          onUpdateFramework={(framework) => onUpdateConfig("qualityFramework", framework)}
          onUpdateDimensions={(dimensions) => onUpdateConfig("dimensions", dimensions)}
          onUpdatePurpose={(purpose) => onUpdateConfig("purpose", purpose)}
        />
      </div>
      
      <div className="mt-6">
        <ExportOptionsForm 
          remediationOptions={assessmentConfig.remediationOptions}
          exportFormat={assessmentConfig.exportFormat}
          onUpdateRemediationOptions={(options) => onUpdateConfig("remediationOptions", options)}
          onUpdateExportFormat={(format) => onUpdateConfig("exportFormat", format)}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  );
}
