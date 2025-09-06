import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app';

let cachedApp: any;

export const config = {
  runtime: 'nodejs20.x'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) cachedApp = await createApp();
  return cachedApp(req, res);
}