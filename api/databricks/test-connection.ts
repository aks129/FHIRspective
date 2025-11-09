import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceUrl, accessToken, clusterId } = req.body;

    if (!workspaceUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Workspace URL and access token are required"
      });
    }

    // Normalize workspace URL
    const normalizedUrl = workspaceUrl.replace(/\/$/, '');

    // Test connection by listing clusters
    const testUrl = `${normalizedUrl}/api/2.0/clusters/list`;

    console.log(`Testing Databricks connection to: ${normalizedUrl}`);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();

      // Check if specified cluster exists and is running
      if (clusterId) {
        const cluster = data.clusters?.find((c: any) => c.cluster_id === clusterId);
        if (!cluster) {
          return res.status(200).json({
            success: false,
            message: `Cluster ${clusterId} not found in workspace`
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Successfully connected to Databricks workspace',
          clusterState: cluster.state
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully connected to Databricks workspace',
        clustersCount: data.clusters?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.error(`Databricks connection failed: ${response.status} ${errorText}`);

      return res.status(200).json({
        success: false,
        message: response.status === 401
          ? 'Invalid access token or unauthorized'
          : response.status === 403
          ? 'Access forbidden - check token permissions'
          : `Failed to connect: ${response.statusText}`
      });
    }
  } catch (error) {
    console.error("Error testing Databricks connection:", error);
    res.status(500).json({
      success: false,
      message: "Connection error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
