import { ResourceSelection } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResourceSelectionFormProps {
  resources: ResourceSelection;
  sampleSize: string;
  validator: string;
  implementationGuide: string;
  onUpdateResources: (resources: ResourceSelection) => void;
  onUpdateSampleSize: (size: string) => void;
  onUpdateValidator: (validator: string) => void;
  onUpdateImplementationGuide: (guide: string) => void;
}

export default function ResourceSelectionForm({
  resources,
  sampleSize,
  validator,
  implementationGuide,
  onUpdateResources,
  onUpdateSampleSize,
  onUpdateValidator,
  onUpdateImplementationGuide
}: ResourceSelectionFormProps) {
  const handleResourceChange = (resource: string, checked: boolean) => {
    onUpdateResources({
      ...resources,
      [resource]: checked
    });
  };

  // List of available FHIR resources
  const availableResources = [
    "Patient",
    "Encounter",
    "Observation",
    "Condition",
    "Procedure",
    "MedicationRequest",
    "AllergyIntolerance",
    "Immunization"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">Resource Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Select FHIR Resources to Evaluate</Label>
          <ScrollArea className="h-72 p-2 border border-gray-200 rounded-md">
            <div className="space-y-2">
              {availableResources.map((resource) => (
                <div key={resource} className="flex items-center">
                  <Checkbox
                    id={`resource-${resource.toLowerCase()}`}
                    checked={resources[resource] || false}
                    onCheckedChange={(checked) => handleResourceChange(resource, !!checked)}
                  />
                  <Label
                    htmlFor={`resource-${resource.toLowerCase()}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {resource}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-1">
          <Label htmlFor="sample-size">Sample Size</Label>
          <Select value={sampleSize} onValueChange={onUpdateSampleSize}>
            <SelectTrigger id="sample-size">
              <SelectValue placeholder="Select sample size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 records</SelectItem>
              <SelectItem value="500">500 records</SelectItem>
              <SelectItem value="1000">1000 records</SelectItem>
              <SelectItem value="all">All available records</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Number of resources to evaluate per resource type</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="validator-type">FHIR Validator</Label>
          <Select value={validator} onValueChange={onUpdateValidator}>
            <SelectTrigger id="validator-type">
              <SelectValue placeholder="Select validator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inferno">Inferno</SelectItem>
              <SelectItem value="hapi">HAPI FHIR Validator</SelectItem>
              <SelectItem value="custom">Custom Validator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ig-selection">Implementation Guide</Label>
          <Select value={implementationGuide} onValueChange={onUpdateImplementationGuide}>
            <SelectTrigger id="ig-selection">
              <SelectValue placeholder="Select implementation guide" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uscore">US Core</SelectItem>
              <SelectItem value="carinbb">CARIN Blue Button</SelectItem>
              <SelectItem value="davinci">Da Vinci</SelectItem>
              <SelectItem value="none">None (Base FHIR Only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
