import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/app";

let cachedApp: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set VERCEL environment variable to skip Vite setup
  process.env.VERCEL = '1';

  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!cachedApp) {
      console.log("Creating new Express app instance");
      cachedApp = await createApp();
    }
    return cachedApp(req, res);
  } catch (error) {
    console.error("Error in Vercel handler:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
}