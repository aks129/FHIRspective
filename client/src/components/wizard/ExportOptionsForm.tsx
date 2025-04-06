import { RemediationOptions, ExportFormat } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ExportOptionsFormProps {
  remediationOptions: RemediationOptions;
  exportFormat: ExportFormat;
  onUpdateRemediationOptions: (options: RemediationOptions) => void;
  onUpdateExportFormat: (format: ExportFormat) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ExportOptionsForm({
  remediationOptions,
  exportFormat,
  onUpdateRemediationOptions,
  onUpdateExportFormat,
  onNext,
  onPrev
}: ExportOptionsFormProps) {
  const handleRemediationChange = (option: keyof RemediationOptions, checked: boolean) => {
    onUpdateRemediationOptions({
      ...remediationOptions,
      [option]: checked
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">Remediation & Export Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Remediation</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <Checkbox
                  id="auto-fix"
                  checked={remediationOptions.autoFix}
                  onCheckedChange={(checked) => handleRemediationChange("autoFix", !!checked)}
                />
                <Label
                  htmlFor="auto-fix"
                  className="ml-2 text-sm text-gray-700"
                >
                  Auto-correct fixable issues
                </Label>
              </div>

              <div className="flex items-center">
                <Checkbox
                  id="flag-issues"
                  checked={remediationOptions.flagIssues}
                  onCheckedChange={(checked) => handleRemediationChange("flagIssues", !!checked)}
                />
                <Label
                  htmlFor="flag-issues"
                  className="ml-2 text-sm text-gray-700"
                >
                  Flag unfixable issues for review
                </Label>
              </div>

              <div className="flex items-center">
                <Checkbox
                  id="write-back"
                  checked={remediationOptions.writeBack}
                  onCheckedChange={(checked) => handleRemediationChange("writeBack", !!checked)}
                />
                <Label
                  htmlFor="write-back"
                  className="ml-2 text-sm text-gray-700"
                >
                  Write back meta.tag to problematic resources
                </Label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Export Format</h3>
            <RadioGroup 
              value={exportFormat} 
              onValueChange={(value) => onUpdateExportFormat(value as ExportFormat)}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="format-json" />
                  <Label htmlFor="format-json">JSON Bundle</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ndjson" id="format-ndjson" />
                  <Label htmlFor="format-ndjson">NDJSON (Newline Delimited JSON)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <Label htmlFor="format-pdf">PDF Report</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="format-excel" />
                  <Label htmlFor="format-excel">Excel Workbook</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Button 
          variant="secondary" 
          onClick={onPrev}
        >
          Back
        </Button>
        <Button 
          className="bg-primary hover:bg-primary-dark text-white"
          onClick={onNext}
        >
          Start Assessment
        </Button>
      </CardFooter>
    </Card>
  );
}
