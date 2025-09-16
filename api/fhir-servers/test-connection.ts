import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ServerConnection {
  url: string;
  authType: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  token?: string;
  timeout: number;
}

interface ConnectionTestResult {
  success: boolean;
  error?: string;
  metadata?: any;
  message?: string;
}

class FhirService {
  private normalizeUrl(url: string): string {
    let normalizedUrl = url.trim();
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
  }

  private buildHeaders(connection: ServerConnection): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
    };

    if (connection.authType === 'basic' && connection.username && connection.password) {
      const credentials = btoa(`${connection.username}:${connection.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (connection.authType === 'bearer' && connection.token) {
      headers['Authorization'] = `Bearer ${connection.token}`;
    }

    return headers;
  }

  async testConnection(connection: ServerConnection): Promise<ConnectionTestResult> {
    try {
      const baseUrl = this.normalizeUrl(connection.url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), connection.timeout * 1000);

      const options: RequestInit = {
        method: 'GET',
        headers: this.buildHeaders(connection),
        signal: controller.signal
      };

      const metadataUrl = `${baseUrl}/metadata`;
      console.log(`Testing connection to: ${metadataUrl}`);

      let response: Response;
      try {
        response = await fetch(metadataUrl, options);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response body');
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}. ${responseText ? 'Response: ' + responseText : ''}`
        };
      }

      const metadata = await response.json();
      const fhirVersion = metadata.fhirVersion || 'Unknown';

      return {
        success: true,
        metadata,
        message: `Successfully connected to FHIR server (${fhirVersion})`
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Connection timeout after ${connection.timeout} seconds`
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

const fhirService = new FhirService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, authType, username, password, token, timeout } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required"
      });
    }

    const serverConnection: ServerConnection = {
      url: url.trim(),
      authType: authType || 'none',
      username: username || undefined,
      password: password || undefined,
      token: token || undefined,
      timeout: typeof timeout === 'number' ? timeout : (parseInt(timeout) || 30)
    };

    console.log(`Testing connection to FHIR server: ${serverConnection.url}`);
    const connectionResult = await fhirService.testConnection(serverConnection);
    console.log(`Connection test result:`, connectionResult);

    res.json(connectionResult);
  } catch (error) {
    console.error("Error testing FHIR server connection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to connect to FHIR server",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}