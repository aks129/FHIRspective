import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, ArrowRight } from "lucide-react";

interface RemediationOption {
  id: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  details: string;
}

interface RemediationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: {
    description: string;
    dimension: string;
    severity: string;
  };
}

export function RemediationDialog({ 
  open, 
  onOpenChange, 
  issue 
}: RemediationDialogProps) {
  // Mock remediation options
  const remediationOptions: RemediationOption[] = [
    {
      id: 'add-required-fields',
      description: 'Add missing required fields',
      impact: 'high',
      details: 'This will add all required fields according to the FHIR specification and the selected implementation guide. This is a non-destructive change that will significantly improve your conformance score.'
    },
    {
      id: 'fix-terminology',
      description: 'Update codes with valid terminology',
      impact: 'medium',
      details: 'This will replace invalid codes with standardized codes from the appropriate value set. This may change the meaning of some data elements if the original code cannot be mapped directly.'
    },
    {
      id: 'fix-date-format',
      description: 'Fix date format issues',
      impact: 'low',
      details: 'This will correct all dates to use the ISO 8601 format required by FHIR. This is a safe change that preserves the original date values while ensuring they are properly formatted.'
    },
    {
      id: 'add-references',
      description: 'Add proper references to related resources',
      impact: 'medium',
      details: 'This will add the necessary resource references to establish proper relationships between resources. This improves data integrity but may require additional data to be collected.'
    },
    {
      id: 'fix-units',
      description: 'Use correct units for measurements',
      impact: 'high',
      details: 'This will standardize all measurement units according to UCUM standards. This is critical for interoperability but may change how values are represented.'
    }
  ];

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const toggleOption = (id: string) => {
    setSelectedOptions(prev => 
      prev.includes(id) 
        ? prev.filter(optId => optId !== id)
        : [...prev, id]
    );
  };

  const handleApplyFixes = () => {
    // In a production app, this would apply the selected fixes
    alert(`Applied ${selectedOptions.length} fixes to address "${issue.description}" issue`);
    onOpenChange(false);
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    return {
      high: 'text-emerald-600 border-emerald-200 bg-emerald-50',
      medium: 'text-amber-600 border-amber-200 bg-amber-50',
      low: 'text-blue-600 border-blue-200 bg-blue-50'
    }[impact];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Remediation Options</DialogTitle>
          <DialogDescription>
            Available fixes for the "{issue.description}" issue
            ({issue.severity}, {issue.dimension})
          </DialogDescription>
        </DialogHeader>
        
        <Separator className="my-2" />
        
        <Alert variant="default" className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Select the remediation options you want to apply. These changes will be applied to all affected resources.
          </AlertDescription>
        </Alert>
        
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {remediationOptions.map((option) => (
              <div 
                key={option.id} 
                className={`p-4 border rounded-md ${
                  selectedOptions.includes(option.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id={option.id} 
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={() => toggleOption(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <label 
                        htmlFor={option.id} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.description}
                      </label>
                      <div className={`text-xs px-2 py-1 rounded-full border ${getImpactColor(option.impact)}`}>
                        {option.impact} impact
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {option.details}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApplyFixes}
            disabled={selectedOptions.length === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Apply {selectedOptions.length} fix{selectedOptions.length !== 1 ? 'es' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}