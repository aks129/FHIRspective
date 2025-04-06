import React from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
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
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ResourceDetailViewProps {
  resource: ResourceQualityScore;
  issues: QualityIssue[];
}

export default function ResourceDetailView({ resource, issues }: ResourceDetailViewProps) {
  // Prepare dimension data for the chart
  const dimensionData = Object.entries(resource.dimensionScores)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      dimension: key.charAt(0).toUpperCase() + key.slice(1),
      score: value
    }));

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
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dimensionData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="dimension" />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {dimensionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getScoreColor(entry.score)} 
                    />
                  ))}
                  <LabelList dataKey="score" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {resource.resourceType} Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {issues.length > 0 ? (
              issues.map((issue, index) => (
                <div key={index} className="p-3 border rounded-md bg-gray-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{issue.description}</p>
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
                      {issue.details && (
                        <p className="mt-1 text-xs text-gray-600">{issue.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                No issues found for this resource type
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}