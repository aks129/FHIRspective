import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch existing configuration
  const { data: existingConfig, isLoading: configLoading } = useQuery<any>({
    queryKey: ['/api/databricks/config'],
    retry: false,
  });

  // Update form when config is loaded
  useState(() => {
    if (existingConfig) {
      setWorkspaceUrl(existingConfig.workspaceUrl || "");
      setClusterId(existingConfig.clusterId || "");
      // Don't set access token from config (it's not returned for security)
    }
  });

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/databricks/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/databricks/config'] });
      toast({
        title: "Configuration Saved",
        description: "Databricks configuration has been saved successfully.",
      });
      setAccessToken(""); // Clear token field for security
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save Databricks configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    if (!workspaceUrl || !accessToken) {
      toast({
        title: "Missing Information",
        description: "Please provide both Workspace URL and Access Token.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/databricks/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceUrl,
          accessToken,
          clusterId: clusterId || undefined,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Failed to test connection. Please check your credentials.",
      });
      toast({
        title: "Connection Error",
        description: "Failed to test connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!workspaceUrl || !accessToken) {
      toast({
        title: "Missing Information",
        description: "Please provide both Workspace URL and Access Token.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      workspaceUrl,
      accessToken,
      clusterId: clusterId || undefined,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and preferences
        </p>
      </div>

      {/* Databricks Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Databricks Integration
              </CardTitle>
              <CardDescription>
                Connect to your Databricks workspace for advanced analytics
              </CardDescription>
            </div>
            {existingConfig && (
              <Badge className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workspace URL */}
          <div className="space-y-2">
            <Label htmlFor="workspaceUrl">Workspace URL</Label>
            <Input
              id="workspaceUrl"
              type="url"
              placeholder="https://your-workspace.cloud.databricks.com"
              value={workspaceUrl}
              onChange={(e) => setWorkspaceUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Your Databricks workspace URL (including https://)
            </p>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <Label htmlFor="accessToken">Personal Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="dapi..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Generate a personal access token from your Databricks workspace
            </p>
          </div>

          {/* Cluster ID */}
          <div className="space-y-2">
            <Label htmlFor="clusterId">Cluster ID (Optional)</Label>
            <Input
              id="clusterId"
              type="text"
              placeholder="0123-456789-abc123"
              value={clusterId}
              onChange={(e) => setClusterId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Cluster ID for running SQL queries (optional)
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {testResult.message}
                {testResult.clusterState && (
                  <span className="ml-2">
                    (Cluster State: {testResult.clusterState})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !workspaceUrl || !accessToken}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !workspaceUrl || !accessToken}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Sections */}
      <Card>
        <CardHeader>
          <CardTitle>About Databricks Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Features</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Sync assessment results to Delta Lake for long-term storage</li>
              <li>View quality trends over time with historical analysis</li>
              <li>Compare your scores against industry benchmarks</li>
              <li>Run ML-based quality predictions</li>
              <li>Execute custom analytics queries</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Setup Instructions</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Log in to your Databricks workspace</li>
              <li>Navigate to User Settings → Access Tokens</li>
              <li>Generate a new personal access token</li>
              <li>Copy the token and paste it above</li>
              <li>Optionally, create a cluster and provide its ID</li>
              <li>Test the connection and save your configuration</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Security</h4>
            <p className="text-sm text-muted-foreground">
              Your access token is stored securely and never exposed in API responses.
              We recommend using tokens with limited scope and rotating them regularly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
