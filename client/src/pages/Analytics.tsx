import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Database, TrendingUp, BarChart3, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function Analytics() {
  // Check if Databricks is configured
  const { data: databricksConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/databricks/config'],
  });

  // Fetch quality trends
  const { data: trends = [], isLoading: trendsLoading } = useQuery<any[]>({
    queryKey: ['/api/analytics/trends'],
    enabled: !!databricksConfig,
  });

  // Fetch benchmarks
  const { data: benchmarks = [], isLoading: benchmarksLoading } = useQuery<any[]>({
    queryKey: ['/api/analytics/benchmarks'],
    enabled: !!databricksConfig,
  });

  // If Databricks is not configured
  if (!configLoading && !databricksConfig) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced analytics and trends powered by Databricks
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Databricks integration is not configured. Please configure Databricks in Settings to access
            advanced analytics features.
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Link to="/settings">
            <Button>
              <Database className="mr-2 h-4 w-4" />
              Configure Databricks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Transform trends data for charts
  const trendChartData = trends.reduce((acc: any[], trend) => {
    const existing = acc.find(item => item.date === trend.date);
    if (existing) {
      existing[trend.resource_type] = trend.avg_quality_score;
    } else {
      acc.push({
        date: trend.date,
        [trend.resource_type]: trend.avg_quality_score
      });
    }
    return acc;
  }, []);

  // Get unique resource types for chart legend
  const resourceTypes = Array.from(new Set(trends.map(t => t.resource_type)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Advanced analytics and trends powered by Databricks
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Databricks Status</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Connected</div>
            <p className="text-xs text-muted-foreground">
              Workspace: {databricksConfig?.workspaceUrl?.split('//')[1]?.split('.')[0] || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend Data Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmarks Available</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{benchmarks.length}</div>
            <p className="text-xs text-muted-foreground">
              Resource types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Score Trends</CardTitle>
          <CardDescription>
            Historical quality scores across different resource types (Last 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading trends...
            </div>
          ) : trendChartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No trend data available. Run some assessments to see trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {resourceTypes.map((resourceType, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                  return (
                    <Line
                      key={resourceType}
                      type="monotone"
                      dataKey={resourceType}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Benchmarks Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Benchmarks</CardTitle>
          <CardDescription>
            Compare your quality scores with industry standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {benchmarksLoading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading benchmarks...
            </div>
          ) : benchmarks.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No benchmark data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={benchmarks}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="resource_type" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="p25" name="25th Percentile" fill="#94a3b8" />
                <Bar dataKey="median" name="Median" fill="#3b82f6" />
                <Bar dataKey="p75" name="75th Percentile" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Resources</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-2">
                {trends
                  .sort((a, b) => b.avg_quality_score - a.avg_quality_score)
                  .slice(0, 5)
                  .map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{trend.resource_type}</span>
                      <span className="text-sm font-medium">
                        {Math.round(trend.avg_quality_score)}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resources Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-2">
                {trends
                  .sort((a, b) => a.avg_quality_score - b.avg_quality_score)
                  .slice(0, 5)
                  .map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{trend.resource_type}</span>
                      <span className="text-sm font-medium text-orange-500">
                        {Math.round(trend.avg_quality_score)}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
