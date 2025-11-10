import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchFHIRResources, type FHIRServerConfig } from '../lib/fhir-client';
import { validateResource, calculateStatistics } from '../lib/validator';

/**
 * Validate FHIR resources endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, authType, username, password, token, timeout, resourceType, count } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    if (!resourceType) {
      return res.status(400).json({
        success: false,
        error: 'Resource type is required'
      });
    }

    // Build server config
    const config: FHIRServerConfig = {
      url,
      authType: authType || 'none',
      username,
      password,
      token,
      timeout: timeout || 30
    };

    // Fetch resources
    console.log(`Fetching ${count || 10} ${resourceType} resources from ${url}`);
    const resources = await fetchFHIRResources(config, resourceType, count || 10);
    console.log(`Fetched ${resources.length} resources`);

    // Validate each resource
    console.log(`Validating ${resources.length} resources`);
    const validationResults = resources.map(resource => validateResource(resource));
    console.log(`Validation complete`);

    // Calculate statistics
    const statistics = calculateStatistics(validationResults);

    return res.status(200).json({
      success: true,
      resourceType,
      resourceCount: resources.length,
      statistics,
      results: validationResults
    });
  } catch (error: any) {
    console.error('Error validating resources:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to validate resources',
      message: error.message
    });
  }
}
