import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/app';

let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize Express app once and reuse across invocations
    if (!app) {
      console.log('Initializing Express app...');
      app = await createApp();
      console.log('Express app initialized successfully');
    }

    // Let Express handle the request
    return new Promise((resolve, reject) => {
      app(req, res, (err: Error) => {
        if (err) {
          console.error('Express error:', err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('Fatal error in serverless function:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}
