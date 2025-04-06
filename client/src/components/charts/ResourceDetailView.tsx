import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle, 
  CardFooter
} from '@/components/ui/card';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { ResourceQualityScore, QualityIssue } from '@/types';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, ChevronRight, ArrowUpRight, HelpCircle } from 'lucide-react';
import { MetricTooltip } from '@/components/ui/metric-tooltip';
import { SeverityTooltip } from '@/components/ui/severity-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResourceViewerDialog } from '@/components/resource/ResourceViewerDialog';
import { RemediationDialog } from '@/components/resource/RemediationDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ResourceDetailViewProps {
  resource: ResourceQualityScore;
  issues: QualityIssue[];
  selectedDimension?: string | null;
  onDimensionSelect?: (dimension: string | null) => void;
}

export default function ResourceDetailView({ 
  resource, 
  issues,
  selectedDimension: externalSelectedDimension,
  onDimensionSelect
}: ResourceDetailViewProps) {
  // State to track the selected dimension for filtering issues - use internal if no external control provided
  const [internalSelectedDimension, setInternalSelectedDimension] = useState<string | null>(null);
  
  // Use either the external or internal dimension state
  const selectedDimension = externalSelectedDimension !== undefined ? externalSelectedDimension : internalSelectedDimension;
  
  // State to track expanded issue details
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  
  // State to track the Implementation Guide profile selection for completeness assessment
  const [igProfile, setIgProfile] = useState<string>("all");
  
  // State for dialogs
  const [resourceViewerOpen, setResourceViewerOpen] = useState(false);
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  
  // Mock FHIR resources for demonstration
  const mockResources = [
    {
      resourceType: resource.resourceType,
      id: "example1",
      meta: {
        versionId: "1",
        lastUpdated: "2023-01-15T12:00:00Z"
      },
      status: "active",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8480-6",
            display: "Systolic blood pressure"
          }
        ]
      },
      subject: {
        reference: "Patient/123"
      },
      effectiveDateTime: "2023-01-14T10:30:00Z",
      valueQuantity: {
        value: 120,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      }
    },
    {
      resourceType: resource.resourceType,
      id: "example2",
      meta: {
        versionId: "2",
        lastUpdated: "2023-01-16T09:15:00Z"
      },
      status: "final",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8462-4",
            display: "Diastolic blood pressure"
          }
        ]
      },
      subject: {
        reference: "Patient/456"
      },
      effectiveDateTime: "2023-01-16T08:45:00Z",
      valueQuantity: {
        value: 80,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      }
    }
  ];
  
  // Prepare dimension data for the chart
  const dimensionData = Object.entries(resource.dimensionScores)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      dimension: key.charAt(0).toUpperCase() + key.slice(1),
      score: value,
      key: key.toLowerCase(),
      issueCount: issues.filter(issue => issue.dimension.toLowerCase() === key.toLowerCase()).length
    }));
  
  // Get filtered issues based on selected dimension
  const filteredIssues = selectedDimension 
    ? issues.filter(issue => issue.dimension.toLowerCase() === selectedDimension.toLowerCase())
    : issues;

  // Get the color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4ade80'; // Green
    if (score >= 70) return '#facc15'; // Yellow
    return '#f87171'; // Red
  };
  
  // Get a natural language interpretation of a score
  const getScoreInterpretation = (score: number, dimension?: string) => {
    const dimensionText = dimension ? ` ${dimension}` : '';
    
    if (score >= 95) return `Excellent${dimensionText} quality. Meets best practices and standards with minimal issues.`;
    if (score >= 90) return `Very good${dimensionText} quality. A few minor improvements possible.`;
    if (score >= 80) return `Good${dimensionText} quality. Some non-critical issues exist that could be addressed.`;
    if (score >= 70) return `Acceptable${dimensionText} quality. Several issues exist that should be addressed.`;
    if (score >= 60) return `Fair${dimensionText} quality. Significant issues that require attention.`;
    if (score >= 50) return `Needs improvement in${dimensionText} quality. Critical issues should be prioritized.`;
    return `Poor${dimensionText} quality. Major remediation required for interoperability.`;
  };

  // Get icon for issue severity
  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // Get badge color for issue dimension
  const getDimensionBadgeColor = (dimension: string) => {
    switch(dimension.toLowerCase()) {
      case 'completeness':
        return 'bg-blue-100 text-blue-800';
      case 'conformity':
        return 'bg-purple-100 text-purple-800';
      case 'plausibility':
        return 'bg-cyan-100 text-cyan-800';
      case 'timeliness':
        return 'bg-amber-100 text-amber-800';
      case 'calculability':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handler for bar click
  const handleBarClick = (data: any) => {
    const newDimension = data.key;
    if (onDimensionSelect) {
      onDimensionSelect(newDimension);
    } else {
      setInternalSelectedDimension(newDimension);
    }
  };
  
  // Handle dimension tab selection
  const handleDimensionSelect = (dimension: string) => {
    const newDimension = dimension === selectedDimension ? null : dimension;
    if (onDimensionSelect) {
      onDimensionSelect(newDimension);
    } else {
      setInternalSelectedDimension(newDimension);
    }
  };
  
  // Toggle expanded issue
  const toggleIssueExpand = (index: number) => {
    setExpandedIssue(expandedIssue === index ? null : index);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <CardTitle className="text-lg font-semibold mr-2">
              {resource.resourceType} Resource Quality
            </CardTitle>
            <MetricTooltip dimension="overall">
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </MetricTooltip>
          </div>
          <CardDescription className="flex items-center">
            Overall Score: <span className="font-semibold ml-1" style={{ color: getScoreColor(resource.overallScore) }}>{resource.overallScore.toFixed(1)}%</span>
            <MetricTooltip dimension="overall">
              <span className="ml-1 text-gray-400 cursor-help underline underline-offset-2 text-xs">What does this mean?</span>
            </MetricTooltip>
          </CardDescription>
          <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-100 text-sm text-gray-700">
            <p>
              <span className="font-medium" style={{ color: getScoreColor(resource.overallScore) }}>
                {getScoreInterpretation(resource.overallScore)}
              </span>
              {resource.issuesCount > 0 && 
                ` Found ${resource.issuesCount} issue${resource.issuesCount !== 1 ? 's' : ''} that may affect interoperability.`
              }
            </p>
            <p className="text-xs text-gray-500 mt-1.5">
              Click on any dimension bar to filter issues by quality dimension
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dimensionData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                onClick={(data) => data && data.activePayload && handleBarClick(data.activePayload[0].payload)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="dimension" />
                <RechartsTooltip 
                  wrapperStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '5px', 
                    padding: '10px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Quality Score']}
                  labelFormatter={(label) => {
                    const entry = dimensionData.find(d => d.dimension === label);
                    return `${label} Dimension${entry ? ` (${entry.issueCount} issues)` : ''}`;
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} cursor="pointer">
                  {dimensionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedDimension === entry.key ? '#3b82f6' : getScoreColor(entry.score)}
                      stroke={selectedDimension === entry.key ? '#1d4ed8' : ''}
                      strokeWidth={selectedDimension === entry.key ? 2 : 0}
                    />
                  ))}
                  <LabelList 
                    dataKey="score" 
                    position="right" 
                    formatter={(value: number) => {
                      // Add interpretation indicators for the dimension score
                      if (value >= 90) return `${value.toFixed(1)}% ✓`;
                      if (value >= 70) return `${value.toFixed(1)}% ⚠️`;
                      return `${value.toFixed(1)}% ⚠️⚠️`;
                    }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full flex flex-wrap gap-2">
            {dimensionData.map((dim) => (
              <span key={dim.key} className="group relative">
                <Button
                  variant={selectedDimension === dim.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDimensionSelect(dim.key)}
                  className={`${selectedDimension === dim.key ? 'bg-primary hover:bg-primary-dark' : 'hover:bg-gray-100'} flex items-center`}
                >
                  {dim.dimension} ({dim.issueCount})
                  <MetricTooltip dimension={dim.key}>
                    <HelpCircle className="h-3 w-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                  </MetricTooltip>
                </Button>
              </span>
            ))}
            {selectedDimension && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (onDimensionSelect) {
                    onDimensionSelect(null);
                  } else {
                    setInternalSelectedDimension(null);
                  }
                }}
                className="ml-auto"
              >
                Show All
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {resource.resourceType} Issues {selectedDimension ? 
                `for ${selectedDimension.charAt(0).toUpperCase() + selectedDimension.slice(1)}` : 
                ""} ({filteredIssues.length})
            </CardTitle>
            
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="mr-1">Legend:</span>
              
              <div className="flex items-center">
                <SeverityTooltip severity="error">
                  <XCircle className="h-3 w-3 text-red-500 mr-0.5 cursor-help" />
                </SeverityTooltip>
                <span>Error</span>
              </div>
              
              <div className="mx-1.5">•</div>
              
              <div className="flex items-center">
                <SeverityTooltip severity="warning">
                  <AlertCircle className="h-3 w-3 text-yellow-500 mr-0.5 cursor-help" />
                </SeverityTooltip>
                <span>Warning</span>
              </div>
              
              <div className="mx-1.5">•</div>
              
              <MetricTooltip dimension="overall">
                <span className="inline-flex items-center cursor-help">
                  <HelpCircle className="h-3 w-3 text-gray-400 mr-0.5" />
                  <span>Hover for Help</span>
                </span>
              </MetricTooltip>
            </div>
          </div>
          
          {selectedDimension?.toLowerCase() === "completeness" && (
            <div className="mt-3 flex items-center border-t pt-3">
              <div className="text-sm font-medium text-gray-700 mr-3">Implementation Guide Profile:</div>
              <Select value={igProfile} onValueChange={setIgProfile}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All data elements</SelectItem>
                  <SelectItem value="required">Required elements (Must have)</SelectItem>
                  <SelectItem value="must-support">Must Support elements (Nice to have)</SelectItem>
                  <SelectItem value="optional">Optional elements (Everything)</SelectItem>
                </SelectContent>
              </Select>
              <MetricTooltip dimension="completeness">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400" />
              </MetricTooltip>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue, index) => (
                <Collapsible 
                  key={index} 
                  open={expandedIssue === index}
                  onOpenChange={() => toggleIssueExpand(index)}
                  className={`p-3 border rounded-md ${expandedIssue === index ? 'bg-white shadow-sm' : 'bg-gray-50'}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="ml-3 flex-grow">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {expandedIssue === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <MetricTooltip dimension={issue.dimension.toLowerCase()}>
                          <Badge variant="outline" className={`${getDimensionBadgeColor(issue.dimension)} cursor-help`}>
                            {issue.dimension}
                          </Badge>
                        </MetricTooltip>
                        <SeverityTooltip severity={issue.severity}>
                          <Badge variant="outline" className={`
                            ${issue.severity === 'error' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'} 
                            cursor-help`
                          }>
                            {issue.severity}
                          </Badge>
                        </SeverityTooltip>
                        {issue.count && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            Count: {issue.count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="pt-3">
                    <div className="border-t mt-2 pt-2">
                      {issue.details ? (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Detailed Information</h4>
                          <p className="text-sm text-gray-600">{issue.details}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No additional details available</p>
                      )}
                      
                      <div className="mt-3 pt-2 border-t flex justify-between">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-6 px-0 text-primary"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setResourceViewerOpen(true);
                          }}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" /> View affected resources
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-6 px-0 text-emerald-600"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setRemediationOpen(true);
                          }}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" /> See remediation options
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                {selectedDimension 
                  ? `No issues found for ${selectedDimension} dimension in ${resource.resourceType}`
                  : `No issues found for ${resource.resourceType} resources`
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Resource Viewer Dialog */}
      {selectedIssue && (
        <ResourceViewerDialog
          open={resourceViewerOpen}
          onOpenChange={setResourceViewerOpen}
          resources={mockResources}
          issue={selectedIssue}
        />
      )}
      
      {/* Remediation Dialog */}
      {selectedIssue && (
        <RemediationDialog
          open={remediationOpen}
          onOpenChange={setRemediationOpen}
          issue={selectedIssue}
        />
      )}
    </div>
  );
}