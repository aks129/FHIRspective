import { useState } from "react";
import { ServerConnection, AuthType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ServerConnectionFormProps {
  serverConnection: ServerConnection;
  onUpdateServerConnection: (connection: ServerConnection) => void;
  onTestAndContinue: () => void;
  isTestingConnection: boolean;
}

export default function ServerConnectionForm({
  serverConnection,
  onUpdateServerConnection,
  onTestAndContinue,
  isTestingConnection
}: ServerConnectionFormProps) {
  const [showAuth, setShowAuth] = useState(false);

  const handleInputChange = (field: keyof ServerConnection, value: string | number) => {
    onUpdateServerConnection({
      ...serverConnection,
      [field]: value
    });
  };

  const handleAuthTypeChange = (value: AuthType) => {
    onUpdateServerConnection({
      ...serverConnection,
      authType: value
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">FHIR Server Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="server-url">FHIR Server URL</Label>
          <Input
            id="server-url"
            type="url"
            placeholder="https://api.example.com/fhir"
            value={serverConnection.url}
            onChange={(e) => handleInputChange("url", e.target.value)}
          />
          <p className="text-xs text-gray-500">The base URL of your FHIR R4B server</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="auth-type">Authentication Type</Label>
            <Select
              value={serverConnection.authType}
              onValueChange={(value) => handleAuthTypeChange(value as AuthType)}
            >
              <SelectTrigger id="auth-type">
                <SelectValue placeholder="Select authentication type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Authentication</SelectItem>
                <SelectItem value="basic">Basic Authentication</SelectItem>
                <SelectItem value="token">Bearer Token</SelectItem>
                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="timeout">Request Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              min={1}
              max={600}
              value={serverConnection.timeout}
              onChange={(e) => handleInputChange("timeout", parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-auth"
              checked={showAuth}
              onCheckedChange={(checked) => setShowAuth(checked as boolean)}
            />
            <Label htmlFor="show-auth" className="text-sm text-gray-700">
              Configure Authentication Details
            </Label>
          </div>

          {showAuth && (
            <div className="pl-6 space-y-4 border-l-2 border-gray-100">
              {(serverConnection.authType === "basic" || serverConnection.authType === "oauth2") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={serverConnection.username || ""}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={serverConnection.password || ""}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(serverConnection.authType === "token" || serverConnection.authType === "oauth2") && (
                <div className="space-y-1">
                  <Label htmlFor="token">Bearer Token</Label>
                  <Input
                    id="token"
                    type="text"
                    value={serverConnection.token || ""}
                    onChange={(e) => handleInputChange("token", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          type="button" 
          className="bg-primary hover:bg-primary-dark text-white"
          onClick={onTestAndContinue}
          disabled={!serverConnection.url || isTestingConnection}
        >
          {isTestingConnection ? "Testing Connection..." : "Test Connection & Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
