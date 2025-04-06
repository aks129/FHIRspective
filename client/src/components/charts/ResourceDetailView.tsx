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
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { ResourceQualityScore, QualityIssue } from '@/types';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
          <CardTitle className="text-lg font-semibold">
            {resource.resourceType} Resource Quality
          </CardTitle>
          <CardDescription>
            Overall Score: <span className="font-semibold" style={{ color: getScoreColor(resource.overallScore) }}>{resource.overallScore.toFixed(1)}%</span>
          </CardDescription>
          <div className="text-sm text-gray-500 mt-1">
            Click on any dimension bar to see related issues
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
                <Tooltip 
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
                  <LabelList dataKey="score" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full flex flex-wrap gap-2">
            {dimensionData.map((dim) => (
              <Button
                key={dim.key}
                variant={selectedDimension === dim.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleDimensionSelect(dim.key)}
                className={`${selectedDimension === dim.key ? 'bg-primary hover:bg-primary-dark' : 'hover:bg-gray-100'}`}
              >
                {dim.dimension} ({dim.issueCount})
              </Button>
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
          <CardTitle className="text-lg font-semibold">
            {resource.resourceType} Issues {selectedDimension ? 
              `for ${selectedDimension.charAt(0).toUpperCase() + selectedDimension.slice(1)}` : 
              ""} ({filteredIssues.length})
          </CardTitle>
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
                        <Badge variant="outline" className={getDimensionBadgeColor(issue.dimension)}>
                          {issue.dimension}
                        </Badge>
                        <Badge variant="outline" className={
                          issue.severity === 'error' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {issue.severity}
                        </Badge>
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
                        <Button variant="link" size="sm" className="h-6 px-0 text-primary">
                          <ArrowUpRight className="h-3 w-3 mr-1" /> View affected resources
                        </Button>
                        <Button variant="link" size="sm" className="h-6 px-0 text-emerald-600">
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
    </div>
  );
}