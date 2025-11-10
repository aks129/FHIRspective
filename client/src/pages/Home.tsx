import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
}

interface ValidationResult {
  resourceId: string;
  resourceType: string;
  valid: boolean;
  issues: ValidationIssue[];
  score: number;
}

interface ValidationResponse {
  success: boolean;
  resourceType: string;
  resourceCount: number;
  statistics: {
    totalResources: number;
    validResources: number;
    invalidResources: number;
    totalIssues: number;
    averageScore: number;
    issuesByType: Record<string, number>;
  };
  results: ValidationResult[];
  error?: string;
  message?: string;
}

export default function Home() {
  const [fhirUrl, setFhirUrl] = useState('https://hapi.fhir.org/baseR4');
  const [resourceType, setResourceType] = useState('Patient');
  const [resourceCount, setResourceCount] = useState('10');
  const [authType, setAuthType] = useState('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const [testing, setTesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setConnectionResult(null);

    try {
      const response = await fetch('/api/test-fhir-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fhirUrl,
          authType,
          username,
          password,
          token,
          timeout: 30
        })
      });

      const result = await response.json();
      setConnectionResult(result);
    } catch (error: any) {
      setConnectionResult({
        success: false,
        error: error.message || 'Failed to test connection'
      });
    } finally {
      setTesting(false);
    }
  };

  const validateResources = async () => {
    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fhirUrl,
          authType,
          username,
          password,
          token,
          timeout: 30,
          resourceType,
          count: parseInt(resourceCount) || 10
        })
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (error: any) {
      setValidationResult({
        success: false,
        error: error.message || 'Failed to validate resources',
        resourceType: '',
        resourceCount: 0,
        statistics: {
          totalResources: 0,
          validResources: 0,
          invalidResources: 0,
          totalIssues: 0,
          averageScore: 0,
          issuesByType: {}
        },
        results: []
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">FHIRspective</h1>
          <p className="text-gray-600">Simple FHIR Resource Validation</p>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>FHIR Server Configuration</CardTitle>
            <CardDescription>Connect to a FHIR server and validate resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* FHIR URL */}
            <div className="space-y-2">
              <Label htmlFor="fhir-url">FHIR Server URL</Label>
              <Input
                id="fhir-url"
                type="url"
                placeholder="https://hapi.fhir.org/baseR4"
                value={fhirUrl}
                onChange={(e) => setFhirUrl(e.target.value)}
              />
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <Label htmlFor="auth-type">Authentication Type</Label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger id="auth-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Auth Fields */}
            {authType === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Bearer Token Field */}
            {authType === 'bearer' && (
              <div className="space-y-2">
                <Label htmlFor="token">Bearer Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            )}

            {/* Resource Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resource-type">Resource Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger id="resource-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Patient">Patient</SelectItem>
                    <SelectItem value="Observation">Observation</SelectItem>
                    <SelectItem value="Condition">Condition</SelectItem>
                    <SelectItem value="Encounter">Encounter</SelectItem>
                    <SelectItem value="MedicationRequest">MedicationRequest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-count">Resource Count</Label>
                <Input
                  id="resource-count"
                  type="number"
                  min="1"
                  max="100"
                  value={resourceCount}
                  onChange={(e) => setResourceCount(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={testConnection}
                disabled={testing || !fhirUrl}
                variant="outline"
                className="flex-1"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>

              <Button
                onClick={validateResources}
                disabled={validating || !fhirUrl || !resourceType}
                className="flex-1"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Resources'
                )}
              </Button>
            </div>

            {/* Connection Result */}
            {connectionResult && (
              <Alert variant={connectionResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  {connectionResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>
                        {connectionResult.message}
                        {connectionResult.fhirVersion && ` (FHIR ${connectionResult.fhirVersion})`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span>{connectionResult.error}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Validation Results */}
        {validationResult && (
          <>
            {/* Statistics Card */}
            {validationResult.success && (
              <Card>
                <CardHeader>
                  <CardTitle>Validation Summary</CardTitle>
                  <CardDescription>
                    Validated {validationResult.statistics.totalResources} {validationResult.resourceType} resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {validationResult.statistics.averageScore}
                      </div>
                      <div className="text-sm text-gray-600">Average Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {validationResult.statistics.validResources}
                      </div>
                      <div className="text-sm text-gray-600">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {validationResult.statistics.invalidResources}
                      </div>
                      <div className="text-sm text-gray-600">Invalid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {validationResult.statistics.totalIssues}
                      </div>
                      <div className="text-sm text-gray-600">Total Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {validationResult.statistics.totalResources}
                      </div>
                      <div className="text-sm text-gray-600">Resources</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Card */}
            {!validationResult.success && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{validationResult.error || validationResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Detailed Results */}
            {validationResult.success && validationResult.results && validationResult.results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Results</CardTitle>
                  <CardDescription>
                    Individual resource validation results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {validationResult.results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.valid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-semibold">
                              {result.resourceType} - {result.resourceId}
                            </div>
                            <div className="text-sm text-gray-600">
                              {result.issues.length} issue(s) found
                            </div>
                          </div>
                        </div>
                        <Badge variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}>
                          Score: {result.score}
                        </Badge>
                      </div>

                      {result.issues.length > 0 && (
                        <div className="space-y-2 ml-8">
                          {result.issues.map((issue, issueIndex) => (
                            <div key={issueIndex} className="flex items-start gap-2 text-sm">
                              {issue.severity === 'error' ? (
                                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              ) : issue.severity === 'warning' ? (
                                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{issue.message}</div>
                                {issue.path && (
                                  <div className="text-gray-600 text-xs">{issue.path}</div>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {issue.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
