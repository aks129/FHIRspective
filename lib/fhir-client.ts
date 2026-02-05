/**
 * Simple FHIR Client - handles communication with FHIR servers
 * Supports OAuth2 client credentials flow
 */

export interface FHIRServerConfig {
  url: string;
  authType?: 'none' | 'basic' | 'bearer' | 'oauth2';
  username?: string;
  password?: string;
  token?: string;
  // OAuth2 client credentials
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  timeout?: number;
}

// Token cache for OAuth2
interface TokenCache {
  accessToken: string;
  expiresAt: Date;
}

const tokenCache: Map<string, TokenCache> = new Map();

export interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: any;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    resource: FHIRResource;
  }>;
}

/**
 * Test connection to a FHIR server by fetching metadata
 */
export async function testFHIRConnection(config: FHIRServerConfig): Promise<{
  success: boolean;
  message?: string;
  fhirVersion?: string;
  error?: string;
}> {
  try {
    const url = normalizeUrl(config.url);
    const headers = await buildHeaders(config);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (config.timeout || 30) * 1000);

    try {
      const response = await fetch(`${url}/metadata`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}`
        };
      }

      const metadata = await response.json();

      if (metadata.resourceType !== 'CapabilityStatement') {
        return {
          success: false,
          error: 'Server did not return a FHIR CapabilityStatement'
        };
      }

      const fhirVersion = metadata.fhirVersion;

      return {
        success: true,
        message: 'Successfully connected to FHIR server',
        fhirVersion
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Connection timeout'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to connect to FHIR server'
    };
  }
}

/**
 * Fetch FHIR resources from a server
 */
export async function fetchFHIRResources(
  config: FHIRServerConfig,
  resourceType: string,
  count: number = 10
): Promise<FHIRResource[]> {
  try {
    const url = normalizeUrl(config.url);
    const headers = await buildHeaders(config);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (config.timeout || 30) * 1000);

    try {
      const response = await fetch(`${url}/${resourceType}?_count=${count}`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const bundle: FHIRBundle = await response.json();

      if (bundle.resourceType !== 'Bundle' || !bundle.entry) {
        throw new Error('Invalid FHIR Bundle response');
      }

      return bundle.entry.map(entry => entry.resource);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * Acquire OAuth2 access token using client credentials grant
 */
async function acquireOAuth2Token(config: FHIRServerConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret || !config.tokenUrl) {
    throw new Error('OAuth2 requires clientId, clientSecret, and tokenUrl');
  }

  // Check cache first
  const cacheKey = `${config.clientId}:${config.tokenUrl}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > new Date()) {
    return cached.accessToken;
  }

  // Acquire new token
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OAuth2 authentication failed: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const tokenData = await response.json();
  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;

  // Cache the token with 60-second buffer
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);
  tokenCache.set(cacheKey, { accessToken, expiresAt });

  return accessToken;
}

/**
 * Build HTTP headers with authentication
 */
async function buildHeaders(config: FHIRServerConfig): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Accept': 'application/fhir+json',
    'Content-Type': 'application/fhir+json'
  };

  if (config.authType === 'basic' && config.username && config.password) {
    const credentials = btoa(`${config.username}:${config.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (config.authType === 'bearer' && config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  } else if (config.authType === 'oauth2') {
    if (config.clientId && config.clientSecret && config.tokenUrl) {
      // OAuth2 client credentials flow
      const accessToken = await acquireOAuth2Token(config);
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else if (config.token) {
      // Fallback to static token
      headers['Authorization'] = `Bearer ${config.token}`;
    }
  }

  return headers;
}

/**
 * Normalize FHIR server URL
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
