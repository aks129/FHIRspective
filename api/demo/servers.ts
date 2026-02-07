import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Available public FHIR servers for demo
 */
export const PUBLIC_FHIR_SERVERS = {
  hapi_r4: {
    name: "HAPI FHIR R4 (Public)",
    url: "https://hapi.fhir.org/baseR4",
    description: "Public HAPI FHIR R4 test server with sample data"
  },
  medplum: {
    name: "Medplum (Requires Auth)",
    url: "https://api.medplum.com/fhir/R4",
    description: "Medplum FHIR server - requires OAuth2 credentials"
  },
  synthea: {
    name: "Synthea Sample",
    url: "https://syntheticmass.mitre.org/v1/fhir",
    description: "Synthea synthetic patient data"
  }
};

/**
 * List available demo servers
 * GET /api/demo/servers
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

  return res.status(200).json({
    servers: PUBLIC_FHIR_SERVERS,
    description: "Available public FHIR servers for demo"
  });
}
