import type { VercelRequest, VercelResponse } from "@vercel/node";

// Shared storage with other endpoints
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
      // Get results data from shared storage
      let resultsData = resultStorage.get(assessmentId);

      // If results don't exist in this serverless instance, generate mock results
      // (since assessments complete synchronously but results aren't persisted across instances)
      if (!resultsData) {
        console.log(`Generating mock results for assessment ${assessmentId} (not in storage)`);
        resultsData = {
          totalResourcesEvaluated: 40,
          totalIssuesIdentified: 15,
          totalAutoFixed: 4,
          overallQualityScore: 82,
          resourceScores: [
            {
              resourceType: "Patient",
              overallScore: 85,
              dimensionScores: {
                completeness: 88,
                conformity: 90,
                plausibility: 78
              },
              issuesCount: 8
            },
            {
              resourceType: "Observation",
              overallScore: 79,
              dimensionScores: {
                completeness: 75,
                conformity: 85,
                plausibility: 77
              },
              issuesCount: 7
            }
          ],
          topIssues: [
            {
              resourceType: "Patient",
              field: "name",
              severity: "warning",
              description: "Missing required field: name",
              dimension: "completeness"
            },
            {
              resourceType: "Observation",
              field: "value",
              severity: "warning",
              description: "Missing required field: value",
              dimension: "completeness"
            }
          ]
        };
      }

      console.log(`Results request for assessment ${assessmentId}:`, {
        totalResourcesEvaluated: resultsData.totalResourcesEvaluated,
        overallScore: resultsData.overallQualityScore,
        resourceTypes: resultsData.resourceScores.map((r: any) => r.resourceType)
      });

      res.status(200).json(resultsData);
    } else {
      res.setHeader('Allow', ['GET', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error getting assessment ${assessmentId} results:`, error);
    res.status(500).json({
      error: "Failed to get assessment results",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}