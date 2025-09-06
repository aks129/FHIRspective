import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/app";

let cachedApp: any;

export const config = {
  runtime: "nodejs20.x",
  maxDuration: 60,
  memory: 1024
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) cachedApp = await createApp();
  return cachedApp(req, res);
}