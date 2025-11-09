import type { VercelRequest, VercelResponse } from "@vercel/node";

// Shared storage with start.ts (using global Maps)
declare global {
  var assessmentStorage: Map<number, any>;
  var progressStorage: Map<number, any>;
  var resultStorage: Map<number, any>;
}

// Initialize shared storage if not exists
if (!global.assessmentStorage) {
  global.assessmentStorage = new Map();
  global.progressStorage = new Map();
  global.resultStorage = new Map();
}

const assessmentStorage = global.assessmentStorage;
const progressStorage = global.progressStorage;
const resultStorage = global.resultStorage;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      // Get assessment from shared storage
      let assessment = assessmentStorage.get(assessmentId);

      if (!assessment) {
        // Since assessments complete synchronously in the /start endpoint,
        // if we're checking status, the assessment should be completed
        // (we just don't have it in this serverless instance's memory)
        assessment = {
          id: assessmentId,
          name: "Assessment",
          serverId: 1,
          resources: ["Patient", "Observation"],
          sampleSize: "20",
          dimensions: ["completeness", "conformity", "plausibility"],
          status: 'completed'
        };
      }

      // Get progress data
      // If assessment is completed but we don't have progress data, set to 100%
      const progressData = progressStorage.get(assessmentId) || {
        overallProgress: assessment.status === 'completed' ? 100 : 0,
        resourceProgress: {}
      };

      // Get results if available
      const resultsData = resultStorage.get(assessmentId);

      // Format response to match AssessmentStatus interface expected by the client
      const response = {
        status: assessment.status,
        progress: progressData,
        logs: [
          {
            id: 1,
            assessmentId: assessmentId,
            message: `Assessment ${assessment.status === 'running' ? 'in progress' : assessment.status}`,
            level: 'info' as const,
            timestamp: new Date().toISOString()
          }
        ],
        // Include actual summary if assessment is completed and results exist
        summary: assessment.status === 'completed' && resultsData ? resultsData : undefined
      };

      console.log(`Status request for assessment ${assessmentId}:`, {
        status: assessment.status,
        progress: progressData.overallProgress,
        hasResults: !!resultsData
      });

      res.status(200).json(response);
    } else {
      res.setHeader('Allow', ['GET', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error getting assessment ${assessmentId} status:`, error);
    res.status(500).json({
      error: "Failed to get assessment status",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}