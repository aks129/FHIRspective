import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SeverityTooltipProps {
  severity: 'error' | 'warning' | 'info' | string;
  children?: React.ReactNode;
}

const severityDescriptions: Record<string, { description: string; recommendations: string[] }> = {
  error: {
    description: 'Critical issues that prevent proper interpretation or interoperability of the data.',
    recommendations: [
      'These issues should be fixed as soon as possible',
      'Data with error-level issues may cause system interoperability failures',
      'Typically requires immediate attention from data governance teams'
    ]
  },
  warning: {
    description: 'Potential problems that might affect data quality or usability but don\'t prevent basic functionality.',
    recommendations: [
      'Should be reviewed and addressed when possible',
      'May lead to degraded application performance or user experience',
      'Consider fixing during regular maintenance cycles'
    ]
  },
  info: {
    description: 'Suggestions or observations that could improve data quality but don\'t impact core functionality.',
    recommendations: [
      'Optional improvements that can enhance data usability',
      'Suggestions for best practices in data management',
      'Consider implementing as part of continuous improvement'
    ]
  }
};

export function SeverityTooltip({ severity = 'info', children }: SeverityTooltipProps) {
  const normalizedSeverity = severity.toLowerCase();
  const info = severityDescriptions[normalizedSeverity] || severityDescriptions.info;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-lg"
          sideOffset={5}
        >
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 capitalize">
              {severity} Severity
            </h4>
            <p className="text-sm text-gray-600">
              {info.description}
            </p>
            <div className="pt-2">
              <h5 className="text-xs font-medium text-gray-700 mb-1">Recommendations:</h5>
              <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                {info.recommendations.map((recommendation, i) => (
                  <li key={i}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}