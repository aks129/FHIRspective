import { AssessmentSummary, ResourceQualityScore } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DownloadIcon, ShareIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResultsSummaryProps {
  summary: AssessmentSummary;
}

export default function ResultsSummary({ summary }: ResultsSummaryProps) {
  // Function to determine color class based on score
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Format score as string with % symbol
  const formatScore = (score: number) => `${score}%`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold text-gray-800">Assessment Summary</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="text-sm">
              <DownloadIcon className="h-4 w-4 mr-1" />
              Export Report
            </Button>
            <Button size="sm" variant="secondary" className="text-sm">
              <ShareIcon className="h-4 w-4 mr-1" />
              Share Results
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <span className="text-sm text-gray-500">Resources Evaluated</span>
            <div className="text-2xl font-bold text-gray-800 mt-1">
              {summary.totalResourcesEvaluated}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <span className="text-sm text-gray-500">Issues Identified</span>
            <div className="text-2xl font-bold text-orange-500 mt-1">
              {summary.totalIssuesIdentified}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <span className="text-sm text-gray-500">Auto-corrected</span>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {summary.totalAutoFixed}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <span className="text-sm text-gray-500">Overall Quality Score</span>
            <div className="text-2xl font-bold text-primary mt-1">
              {formatScore(summary.overallQualityScore)}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-800 mb-3">Quality Score By Resource</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completeness</TableHead>
                <TableHead>Conformity</TableHead>
                <TableHead>Plausibility</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.resourceScores.map((resource) => (
                <TableRow key={resource.resourceType}>
                  <TableCell className="font-medium text-gray-900">
                    {resource.resourceType}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {formatScore(resource.overallScore)}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getScoreColorClass(resource.overallScore)} h-2 rounded-full`} 
                          style={{ width: `${resource.overallScore}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {formatScore(resource.dimensionScores.completeness)}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getScoreColorClass(resource.dimensionScores.completeness)} h-2 rounded-full`} 
                          style={{ width: `${resource.dimensionScores.completeness}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {formatScore(resource.dimensionScores.conformity)}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getScoreColorClass(resource.dimensionScores.conformity)} h-2 rounded-full`} 
                          style={{ width: `${resource.dimensionScores.conformity}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        {formatScore(resource.dimensionScores.plausibility)}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getScoreColorClass(resource.dimensionScores.plausibility)} h-2 rounded-full`} 
                          style={{ width: `${resource.dimensionScores.plausibility}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {resource.issuesCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
