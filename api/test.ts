import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "API test successful",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url
  });
}