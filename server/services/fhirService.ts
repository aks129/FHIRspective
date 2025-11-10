/**
 * Service for interacting with FHIR servers
 */

import { FhirServer } from "@shared/schema";
import { createLogger } from "../utils/logger.js";
import { FhirError, ErrorCode } from "../utils/errors.js";

// Using FhirServer type as ServerConnection
type ServerConnection = FhirServer;

// Create logger for this service
const logger = createLogger('FhirService');

/**
 * Universal base64 encoder that works in Node.js, Edge runtime, and browser
 */
function encodeBase64(str: string): string {
  try {
    // Check if Buffer is available (Node.js)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str).toString('base64');
    }
    // Fallback to btoa for browser/edge runtime
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    // If neither is available, throw error
    throw new Error('No base64 encoding method available in this environment');
  } catch (error) {
    console.error('Error encoding to base64:', error);
    throw new Error('Failed to encode credentials for Basic authentication');
  }
}

export interface ConnectionTestResult {
  success: boolean;
  metadata?: any;
  message?: string;
  error?: string;
}

class FhirService {
  /**
   * Test connection to a FHIR server
   */
  async testConnection(connection: ServerConnection): Promise<ConnectionTestResult> {
    const methodLogger = logger.child('testConnection');
    methodLogger.info('Testing FHIR server connection', { url: connection.url, authType: connection.authType });

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), connection.timeout * 1000);

      // Build request options with authentication
      const options: RequestInit = {
        method: 'GET',
        headers: this.buildHeaders(connection),
        signal: controller.signal
      };

      // Normalize the URL
      const baseUrl = this.normalizeUrl(connection.url);

      // Try to fetch the CapabilityStatement/metadata
      const metadataUrl = `${baseUrl}/metadata`;
      methodLogger.debug('Fetching metadata', { metadataUrl });

      let response: Response;
      try {
        response = await fetch(metadataUrl, options);
        methodLogger.debug('Received response', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response body');
        methodLogger.error('FHIR server returned error status', undefined, {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText.substring(0, 500) // Limit log size
        });

        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}. ${responseText ? 'Response: ' + responseText.substring(0, 200) : ''}`
        };
      }

      // Parse the metadata
      const metadata = await response.json();

      // Check if this is a FHIR server by looking for FHIR version
      const fhirVersion = this.extractFhirVersion(metadata);

      if (!fhirVersion) {
        methodLogger.warn('Server response does not contain FHIR version', {
          resourceType: metadata.resourceType
        });
        return {
          success: false,
          error: "The server does not appear to be a FHIR server (no fhirVersion in CapabilityStatement)"
        };
      }

      // Check if the FHIR version is compatible (R4B or R4)
      if (!this.isCompatibleFhirVersion(fhirVersion)) {
        methodLogger.warn('Incompatible FHIR version detected', { fhirVersion });
        return {
          success: false,
          error: `Incompatible FHIR version: ${fhirVersion}. This app requires R4 (4.0.x) or R4B (4.3.x).`
        };
      }

      methodLogger.info('Successfully connected to FHIR server', {
        fhirVersion,
        serverName: metadata.name || 'Unknown'
      });

      return {
        success: true,
        metadata,
        message: `Successfully connected to FHIR server (${fhirVersion})`
      };
    } catch (error: any) {
      // Handle timeout specifically
      if (error.name === 'AbortError') {
        methodLogger.warn('Connection timeout', { timeout: connection.timeout });
        return {
          success: false,
          error: `Connection timeout after ${connection.timeout} seconds. The server may be slow or unreachable.`
        };
      }

      // Handle network errors
      if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        methodLogger.error('Network error during connection test', error, { url: connection.url });
        return {
          success: false,
          error: `Network error: ${error.message}. Please check the server URL and your internet connection.`
        };
      }

      // Generic error
      methodLogger.error('Unexpected error during connection test', error, { url: connection.url });
      return {
        success: false,
        error: `Connection failed: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Fetch FHIR resources of a specific type
   */
  async fetchResources(connection: ServerConnection, resourceType: string, count: number | 'all'): Promise<any[]> {
    const methodLogger = logger.child('fetchResources');
    methodLogger.info(`Fetching ${resourceType} resources`, {
      url: connection.url,
      count,
      authType: connection.authType
    });

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), connection.timeout * 1000);

      // Build request options with authentication
      const options: RequestInit = {
        method: 'GET',
        headers: this.buildHeaders(connection),
        signal: controller.signal
      };

      // Normalize the URL
      const baseUrl = this.normalizeUrl(connection.url);

      let url = `${baseUrl}/${resourceType}`;
      if (count !== 'all') {
        url += `?_count=${count}`;
      }

      methodLogger.debug('Sending request', { url });
      let response: Response;
      try {
        response = await fetch(url, options);
        methodLogger.debug('Response received', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response body');
        const errorMsg = `Server returned ${response.status}: ${response.statusText}`;

        methodLogger.error('Failed to fetch resources', undefined, {
          resourceType,
          status: response.status,
          statusText: response.statusText,
          responseText: responseText.substring(0, 500)
        });

        throw new FhirError(
          errorMsg,
          ErrorCode.FHIR_CONNECTION_ERROR,
          {
            resourceType,
            status: response.status,
            responseText: responseText.substring(0, 200)
          }
        );
      }

      methodLogger.debug('Parsing response JSON', { resourceType });
      const bundle = await response.json();

      // Validate bundle structure
      if (!bundle || typeof bundle !== 'object') {
        methodLogger.error('Invalid response format - not an object', undefined, { resourceType });
        throw new FhirError(
          'Invalid FHIR response: expected JSON object',
          ErrorCode.FHIR_INVALID_RESPONSE,
          { resourceType }
        );
      }

      // Extract resources from bundle
      if (bundle.resourceType === 'Bundle' && Array.isArray(bundle.entry)) {
        const resources = bundle.entry
          .filter((entry: any) => entry.resource) // Filter out entries without resources
          .map((entry: any) => entry.resource);

        methodLogger.info(`Successfully fetched ${resources.length} ${resourceType} resources`, {
          totalInBundle: bundle.total,
          entriesCount: bundle.entry.length,
          resourcesExtracted: resources.length
        });

        return resources;
      }

      // If it's a single resource (not a bundle), return it in an array
      if (bundle.resourceType === resourceType) {
        methodLogger.info(`Received single ${resourceType} resource`, { resourceId: bundle.id });
        return [bundle];
      }

      methodLogger.warn('Unexpected response format', {
        resourceType,
        bundleType: bundle.resourceType,
        hasEntry: !!bundle.entry
      });

      return [];
    } catch (error: any) {
      // Handle timeout specifically
      if (error.name === 'AbortError') {
        methodLogger.error('Request timeout', undefined, {
          resourceType,
          timeout: connection.timeout
        });
        throw new FhirError(
          `Request timeout after ${connection.timeout} seconds while fetching ${resourceType}`,
          ErrorCode.FHIR_TIMEOUT,
          { resourceType, timeout: connection.timeout }
        );
      }

      // If it's already a FhirError, re-throw it
      if (error instanceof FhirError) {
        throw error;
      }

      // Handle network errors
      if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        methodLogger.error('Network error', error, { resourceType });
        throw new FhirError(
          `Network error while fetching ${resourceType}: ${error.message}`,
          ErrorCode.FHIR_CONNECTION_ERROR,
          { resourceType }
        );
      }

      // Generic error
      methodLogger.error('Unexpected error fetching resources', error, { resourceType });
      throw new FhirError(
        `Failed to fetch ${resourceType} resources: ${error.message}`,
        ErrorCode.FHIR_CONNECTION_ERROR,
        { resourceType }
      );
    }
  }
  
  /**
   * Build headers with appropriate authentication
   */
  private buildHeaders(connection: ServerConnection): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json'
    };

    // Add authentication headers if needed
    try {
      switch(connection.authType) {
        case 'basic':
          if (connection.username && connection.password) {
            const basicAuth = encodeBase64(`${connection.username}:${connection.password}`);
            headers['Authorization'] = `Basic ${basicAuth}`;
            console.log(`Added Basic auth header for user: ${connection.username}`);
          } else {
            console.warn('Basic auth selected but username or password is missing');
          }
          break;
        case 'token':
          if (connection.token) {
            headers['Authorization'] = `Bearer ${connection.token}`;
            console.log('Added Bearer token auth header');
          } else {
            console.warn('Token auth selected but token is missing');
          }
          break;
        case 'oauth2':
          if (connection.token) {
            headers['Authorization'] = `Bearer ${connection.token}`;
            console.log('Added OAuth2 Bearer token auth header');
          } else {
            console.warn('OAuth2 auth selected but token is missing');
          }
          break;
        case 'none':
          console.log('No authentication configured');
          break;
        default:
          console.warn(`Unknown auth type: ${connection.authType}`);
      }
    } catch (error) {
      console.error('Error building auth headers:', error);
      throw new Error('Failed to build authentication headers');
    }

    return headers;
  }
  
  /**
   * Extract FHIR version from CapabilityStatement
   */
  private extractFhirVersion(metadata: any): string | null {
    if (!metadata || metadata.resourceType !== 'CapabilityStatement') {
      return null;
    }
    
    return metadata.fhirVersion || null;
  }
  
  /**
   * Check if the FHIR version is compatible with this app
   */
  private isCompatibleFhirVersion(version: string): boolean {
    // Accept R4 (4.0.1) or R4B (4.3.0)
    return version.startsWith('4.0.') || version.startsWith('4.3.') || version === '4.0.1' || version === '4.3.0';
  }
  
  /**
   * Normalize URL by trimming whitespace and removing trailing slashes
   */
  private normalizeUrl(url: string): string {
    // Trim whitespace
    let normalizedUrl = url.trim();
    // Remove trailing slash if present
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    console.log(`URL normalized: "${url}" -> "${normalizedUrl}"`);
    return normalizedUrl;
  }
}

export const fhirService = new FhirService();
