import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sampleFhirData, getSampleResourcesByType, getAllSampleResources } from '../../server/demo/sampleFhirData';

/**
 * Sample data endpoint - returns sample FHIR resources
 * GET /api/demo/sample-data
 * GET /api/demo/sample-data?resourceType=Patient
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resourceType = req.query.resourceType as string | undefined;

    if (resourceType) {
      const resources = getSampleResourcesByType(resourceType);
      return res.status(200).json({
        resourceType,
        count: resources.length,
        resources
      });
    } else {
      return res.status(200).json({
        summary: {
          patients: sampleFhirData.patients.length,
          conditions: sampleFhirData.conditions.length,
          observations: sampleFhirData.observations.length,
          medicationRequests: sampleFhirData.medicationRequests.length,
          encounters: sampleFhirData.encounters.length,
          immunizations: sampleFhirData.immunizations.length,
          total: getAllSampleResources().length
        },
        data: sampleFhirData
      });
    }
  } catch (error) {
    console.error('Error fetching sample data:', error);
    return res.status(500).json({
      error: 'Failed to fetch sample data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
