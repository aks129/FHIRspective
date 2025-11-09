import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app';

let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize Express app once and reuse across invocations
  if (!app) {
    app = await createApp();
  }

  // Let Express handle the request
  return new Promise((resolve, reject) => {
    app(req, res, (err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
