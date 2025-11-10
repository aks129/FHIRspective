/**
 * Simple FHIR Client - handles communication with FHIR servers
 */

export interface FHIRServerConfig {
  url: string;
  authType?: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  token?: string;
  timeout?: number;
}

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
    const headers = buildHeaders(config);

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
    const headers = buildHeaders(config);

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
 * Build HTTP headers with authentication
 */
function buildHeaders(config: FHIRServerConfig): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/fhir+json',
    'Content-Type': 'application/fhir+json'
  };

  if (config.authType === 'basic' && config.username && config.password) {
    const credentials = btoa(`${config.username}:${config.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (config.authType === 'bearer' && config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
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
