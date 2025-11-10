/**
 * Simple development server that runs the API endpoints locally
 * Run with: tsx dev-server.ts
 */

import express from 'express';
import cors from 'cors';

// Import API handlers
import healthHandler from './api/health.js';
import testFhirServerHandler from './api/test-fhir-server.js';
import validateResourcesHandler from './api/validate-resources.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Convert Vercel handlers to Express middleware
function wrapVercelHandler(handler: any) {
  return async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Handler error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

// API routes
app.get('/api/health', wrapVercelHandler(healthHandler));
app.post('/api/test-fhir-server', wrapVercelHandler(testFhirServerHandler));
app.post('/api/validate-resources', wrapVercelHandler(validateResourcesHandler));

// Start server
app.listen(PORT, () => {
  console.log(`Development API server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/test-fhir-server');
  console.log('  POST /api/validate-resources');
});
