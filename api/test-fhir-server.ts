import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testFHIRConnection, type FHIRServerConfig } from '../lib/fhir-client';

/**
 * Test FHIR server connection endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, authType, username, password, token, timeout } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
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

    // Test connection
    const result = await testFHIRConnection(config);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error testing FHIR server:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
