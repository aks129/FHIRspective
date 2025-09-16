import type { VercelRequest, VercelResponse } from "@vercel/node";

// Simplified in-memory storage for Vercel (each function has its own instance)
interface Assessment {
  id: number;
  name: string;
  serverId: number;
  resources: string[];
  sampleSize: string;
  validationFramework: string;
  dimensions: any;
  purpose: any;
  remediationOptions: any;
  userId: number;
  status: 'created' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Shared storage across Vercel functions using global variables
declare global {
  var assessmentStorage: Map<number, any>;
  var progressStorage: Map<number, any>;
  var resultStorage: Map<number, any>;
  var demoAssessments: Assessment[];
  var nextAssessmentId: number;
}

// Initialize shared storage if not exists
if (!global.assessmentStorage) {
  global.assessmentStorage = new Map();
  global.progressStorage = new Map();
  global.resultStorage = new Map();
  global.demoAssessments = [];
  global.nextAssessmentId = 1;
}

const demoAssessments = global.demoAssessments;
const assessmentStorage = global.assessmentStorage;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Return all assessments for demo user
      res.status(200).json(demoAssessments);
    } else if (req.method === 'POST') {
      // Process the complex frontend structure into a simplified format
      const body = req.body;

      // Extract selected resources from the resources object
      const selectedResources = Object.entries(body.resources || {})
        .filter(([_, isSelected]) => isSelected)
        .map(([resourceType, _]) => resourceType);

      // Extract selected dimensions
      const selectedDimensions = Object.entries(body.dimensions || {})
        .filter(([_, isSelected]) => isSelected)
        .map(([dimension, _]) => dimension);

      // Extract selected purposes
      const selectedPurposes = Object.entries(body.purpose || {})
        .filter(([_, isSelected]) => isSelected)
        .map(([purpose, _]) => purpose);

      // Extract selected remediation options
      const selectedRemediationOptions = Object.entries(body.remediationOptions || {})
        .filter(([_, isSelected]) => isSelected)
        .map(([option, _]) => option);

      const assessmentData: Assessment = {
        id: global.nextAssessmentId++,
        name: body.name || "FHIR Assessment",
        serverId: body.serverId || 1,
        resources: selectedResources.length > 0 ? selectedResources : ["Patient"],
        sampleSize: String(body.sampleSize || "100"),
        validationFramework: body.validator || "inferno",
        dimensions: selectedDimensions.length > 0 ? selectedDimensions : ["completeness", "conformity"],
        purpose: selectedPurposes.length > 0 ? selectedPurposes : ["quality-assessment"],
        remediationOptions: selectedRemediationOptions.length > 0 ? selectedRemediationOptions : ["manual-review"],
        userId: 1, // Demo user ID
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      demoAssessments.push(assessmentData);
      assessmentStorage.set(assessmentData.id, assessmentData);
      console.log(`Created assessment ${assessmentData.id}:`, assessmentData);
      res.status(201).json(assessmentData);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error in assessments API:", error);
    res.status(500).json({
      error: "Failed to process assessment request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}