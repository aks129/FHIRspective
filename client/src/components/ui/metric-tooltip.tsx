import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

export interface MetricTooltipProps {
  dimension?: 'completeness' | 'conformity' | 'plausibility' | 'timeliness' | 'calculability' | 'overall' | string;
  children?: React.ReactNode;
}

const dimensionDescriptions: Record<string, { description: string; examples: string[] }> = {
  upcoming: {
    description: 'This feature is coming soon in a future release.',
    examples: [
      'This functionality is currently under development',
      'Check back soon for this capability',
      'Feature will be available in the next release'
    ]
  },
  completeness: {
    description: 'Measures the presence of expected data elements. Higher scores indicate fewer missing required fields.',
    examples: [
      'Required demographic fields like birth date in Patient resources',
      'Coded values in Observation resources',
      'References to practitioners in clinical documents'
    ]
  },
  conformity: {
    description: 'Evaluates adherence to FHIR standards and profiles. Higher scores indicate better standards compliance.',
    examples: [
      'Correct use of code systems like LOINC and SNOMED CT',
      'Compliance with implementation guides like US Core',
      'Valid resource format and relationships'
    ]
  },
  plausibility: {
    description: 'Assesses whether data values are clinically reasonable and logically consistent.',
    examples: [
      'Physiologically possible vital signs',
      'Chronologically consistent dates (birth before death)',
      'Age-appropriate diagnoses and procedures'
    ]
  },
  timeliness: {
    description: 'Measures how current and up-to-date the data is relative to when it should be available.',
    examples: [
      'Recent lab results availability',
      'Prompt documentation of clinical encounters',
      'Timely updates to medication lists'
    ]
  },
  calculability: {
    description: 'Evaluates whether data can be used in calculations, analytics and clinical decision support.',
    examples: [
      'Numeric values for lab results with proper units',
      'Structured data that can be used in risk calculators',
      'Codified information suitable for population analysis'
    ]
  },
  overall: {
    description: 'Aggregate score combining all quality dimensions, weighted according to importance.',
    examples: [
      'Higher scores indicate better overall data quality',
      'Weighting may prioritize conformity and completeness',
      'Comprehensive view of resource interoperability readiness'
    ]
  }
};

export function MetricTooltip({ dimension = 'overall', children }: MetricTooltipProps) {
  const info = dimensionDescriptions[dimension.toLowerCase()] || dimensionDescriptions.overall;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {children || <InfoIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-lg"
          sideOffset={5}
        >
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 capitalize">
              {dimension} Score
            </h4>
            <p className="text-sm text-gray-600">
              {info.description}
            </p>
            <div className="pt-2">
              <h5 className="text-xs font-medium text-gray-700 mb-1">Examples:</h5>
              <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                {info.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}