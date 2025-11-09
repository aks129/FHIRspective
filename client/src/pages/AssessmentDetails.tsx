import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Database, RefreshCw } from "lucide-react";
import ResultsSummary from "@/components/wizard/ResultsSummary";
import QualityDashboard from "@/components/wizard/QualityDashboard";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AssessmentDetails() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch assessment details
  const { data: assessment, isLoading: assessmentLoading } = useQuery<any>({
    queryKey: [`/api/assessments/${id}`],
  });

  // Fetch assessment results
  const { data: results, isLoading: resultsLoading } = useQuery<any>({
    queryKey: [`/api/assessments/${id}/results`],
    enabled: assessment?.status === 'completed',
  });

  // Fetch sync status
  const { data: databricksConfig } = useQuery<any>({
    queryKey: ['/api/databricks/config'],
  });

  const handleSyncToDatabricks = async () => {
    if (!databricksConfig) {
      toast({
        title: "Databricks Not Configured",
        description: "Please configure Databricks in Settings first.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`/api/databricks/sync/${id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Sync Started",
          description: "Assessment data is being synced to Databricks.",
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync data to Databricks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      const response = await fetch(`/api/assessments/${id}/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment-${id}-report.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export assessment results.",
        variant: "destructive",
      });
    }
  };

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

  if (assessmentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              The requested assessment could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{assessment.name}</h1>
            {getStatusBadge(assessment.status)}
          </div>
          <p className="text-muted-foreground">
            Assessment ID: {assessment.id} • Created{' '}
            {new Date(assessment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {assessment.status === 'completed' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              {databricksConfig && (
                <Button
                  onClick={handleSyncToDatabricks}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Sync to Databricks
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assessment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Resources</div>
              <div className="text-sm">
                {Array.isArray(assessment.resources)
                  ? assessment.resources.join(', ')
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Sample Size</div>
              <div className="text-sm">{assessment.sampleSize}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Validator</div>
              <div className="text-sm">{assessment.validator}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Framework</div>
              <div className="text-sm">{assessment.qualityFramework}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {assessment.status === 'completed' && results && (
        <>
          <ResultsSummary summary={results} />
          <QualityDashboard summary={results} />
        </>
      )}

      {assessment.status === 'running' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Assessment in Progress</p>
              <p className="text-sm text-muted-foreground">
                This assessment is currently running. Results will appear when complete.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {assessment.status === 'failed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-lg font-medium text-destructive">Assessment Failed</p>
              <p className="text-sm text-muted-foreground mt-2">
                This assessment encountered an error during execution.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
