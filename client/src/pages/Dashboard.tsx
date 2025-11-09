import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Plus,
  TrendingUp,
  Database,
  BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Assessment {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  resources: string[];
}

export default function Dashboard() {
  // Fetch all assessments
  const { data: assessments = [], isLoading } = useQuery<Assessment[]>({
    queryKey: ['/api/assessments'],
  });

  // Calculate quick stats
  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.status === 'completed').length;
  const runningAssessments = assessments.filter(a => a.status === 'running').length;
  const failedAssessments = assessments.filter(a => a.status === 'failed').length;

  // Get recent assessments (last 5)
  const recentAssessments = assessments.slice(0, 5);

  // Calculate average quality score (placeholder for now)
  const avgQualityScore = 87; // TODO: Calculate from actual results

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your FHIR data quality assessments
          </p>
        </div>
        <Link to="/assessments/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssessments}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {totalAssessments > 0
                ? `${Math.round((completedAssessments / totalAssessments) * 100)}% completion rate`
                : 'No assessments yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQualityScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {failedAssessments > 0 && `${failedAssessments} failed`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/assessments/new">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Run New Assessment
              </CardTitle>
              <CardDescription>
                Start a new FHIR data quality assessment
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/analytics">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                View Analytics
              </CardTitle>
              <CardDescription>
                Analyze trends and benchmarks
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/settings">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configure Databricks
              </CardTitle>
              <CardDescription>
                Set up analytics integration
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
          <CardDescription>
            Your latest FHIR data quality assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading assessments...
            </div>
          ) : recentAssessments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No assessments yet. Get started by creating your first assessment.
              </p>
              <Link to="/assessments/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assessment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentAssessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  to={`/assessments/${assessment.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{assessment.name}</h4>
                        {getStatusBadge(assessment.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Resources: {Array.isArray(assessment.resources)
                          ? assessment.resources.join(', ')
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assessment.completedAt
                          ? `Completed ${formatDistanceToNow(new Date(assessment.completedAt), { addSuffix: true })}`
                          : `Created ${formatDistanceToNow(new Date(assessment.createdAt), { addSuffix: true })}`
                        }
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
