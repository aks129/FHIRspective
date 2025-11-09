import type { VercelRequest, VercelResponse } from "@vercel/node";

// Shared storage for Databricks config using global variables
declare global {
  var databricksConfigStorage: Map<number, any>;
}

// Initialize shared storage if not exists
if (!global.databricksConfigStorage) {
  global.databricksConfigStorage = new Map();
}

const databricksConfigStorage = global.databricksConfigStorage;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = 1; // Demo user ID

  try {
    if (req.method === 'GET') {
      // Get existing configuration for the user
      const config = databricksConfigStorage.get(userId);

      if (!config) {
        return res.status(404).json({ error: 'Databricks configuration not found' });
      }

      // Don't expose the access token
      const { accessToken, ...safeConfig } = config;
      res.status(200).json({ ...safeConfig, hasToken: !!accessToken });
    } else if (req.method === 'POST') {
      // Save new configuration
      const { workspaceUrl, accessToken, clusterId } = req.body;

      if (!workspaceUrl || !accessToken) {
        return res.status(400).json({
          error: 'Workspace URL and access token are required'
        });
      }

      const config = {
        id: userId, // Use userId as ID for simplicity
        userId,
        workspaceUrl,
        accessToken,
        clusterId: clusterId || null,
        isActive: true,
        lastTestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      databricksConfigStorage.set(userId, config);

      console.log(`Saved Databricks configuration for user ${userId}`);

      // Don't expose the access token
      const { accessToken: _, ...safeConfig } = config;
      res.status(201).json({ ...safeConfig, hasToken: true });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error("Error in Databricks config API:", error);
    res.status(500).json({
      error: "Failed to process Databricks configuration",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
