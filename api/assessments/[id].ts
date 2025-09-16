import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock assessment data for Vercel function
const mockAssessments = [
  {
    id: 1,
    name: "Demo Assessment",
    serverId: 1,
    resources: ["Patient", "Observation"],
    sampleSize: "100",
    validationFramework: "US Core",
    dimensions: ["completeness", "conformity"],
    purpose: "quality-assessment",
    remediationOptions: ["manual-review"],
    userId: 1,
    status: 'created' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const assessmentId = parseInt(id as string);

  if (isNaN(assessmentId)) {
    return res.status(400).json({ error: 'Invalid assessment ID' });
  }

  try {
    if (req.method === 'GET') {
      // Find assessment by ID
      const assessment = mockAssessments.find(a => a.id === assessmentId);

      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      res.status(200).json(assessment);
    } else {
      res.setHeader('Allow', ['GET', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error in assessment ${assessmentId} API:`, error);
    res.status(500).json({
      error: "Failed to process assessment request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}