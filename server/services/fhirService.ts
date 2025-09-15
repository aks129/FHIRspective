/**
 * Service for interacting with FHIR servers
 */

import { FhirServer } from "@shared/schema";

// Using FhirServer type as ServerConnection
type ServerConnection = FhirServer;

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
      console.log(`Attempting to fetch metadata from: ${metadataUrl}`);

      let response: Response;
      try {
        response = await fetch(metadataUrl, options);
        console.log(`Response status: ${response.status} ${response.statusText}`);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response body');
        console.error(`FHIR server error - Status: ${response.status}, Body: ${responseText}`);
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}. ${responseText ? 'Response: ' + responseText : ''}`
        };
      }
      
      // Parse the metadata
      const metadata = await response.json();
      
      // Check if this is a FHIR server by looking for FHIR version
      const fhirVersion = this.extractFhirVersion(metadata);
      
      if (!fhirVersion) {
        return {
          success: false,
          error: "The server does not appear to be a FHIR server"
        };
      }
      
      // Check if the FHIR version is compatible (R4B or R4)
      if (!this.isCompatibleFhirVersion(fhirVersion)) {
        return {
          success: false,
          error: `Incompatible FHIR version: ${fhirVersion}. This app requires R4B or R4.`
        };
      }
      
      return {
        success: true,
        metadata,
        message: `Successfully connected to FHIR server (${fhirVersion})`
      };
    } catch (error: any) {
      // Handle timeout specifically
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
  
  /**
   * Fetch FHIR resources of a specific type
   */
  async fetchResources(connection: ServerConnection, resourceType: string, count: number | 'all'): Promise<any[]> {
    try {
      console.log(`Starting fetch of ${resourceType} resources from ${connection.url}`);

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
      
      console.log(`Fetching from URL: ${url}`);
      let response: Response;
      try {
        response = await fetch(url, options);
        console.log(`Fetch response status: ${response.status} ${response.statusText}`);
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response body');
        const errorMsg = `Error fetching ${resourceType}: ${response.status} ${response.statusText}. ${responseText ? 'Response: ' + responseText : ''}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log(`Response received for ${resourceType}, parsing JSON...`);
      const bundle = await response.json();
      console.log(`JSON parsed for ${resourceType} bundle`);
      
      // Extract resources from bundle
      if (bundle.resourceType === 'Bundle' && Array.isArray(bundle.entry)) {
        console.log(`Found ${bundle.entry.length} ${resourceType} resources in bundle`);
        return bundle.entry.map((entry: any) => entry.resource);
      }
      
      console.log(`No resources found for ${resourceType} or invalid bundle format`);
      return [];
    } catch (error: any) {
      // Handle timeout specifically
      if (error.name === 'AbortError') {
        console.error(`Timeout fetching ${resourceType} resources after ${connection.timeout} seconds`);
      } else {
        console.error(`Error fetching ${resourceType} resources:`, error);
      }
      // Return empty array instead of throwing to prevent the entire assessment from failing
      return [];
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
    switch(connection.authType) {
      case 'basic':
        if (connection.username && connection.password) {
          const basicAuth = Buffer.from(`${connection.username}:${connection.password}`).toString('base64');
          headers['Authorization'] = `Basic ${basicAuth}`;
        }
        break;
      case 'token':
        if (connection.token) {
          headers['Authorization'] = `Bearer ${connection.token}`;
        }
        break;
      case 'oauth2':
        if (connection.token) {
          headers['Authorization'] = `Bearer ${connection.token}`;
        }
        break;
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
