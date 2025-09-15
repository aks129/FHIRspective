import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "healthy",
    storage: "in-memory",
    message: "System operational (using in-memory storage)",
    timestamp: new Date().toISOString()
  });
}