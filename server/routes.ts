import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import {
  insertFhirServerSchema,
  insertAssessmentSchema,
  insertAssessmentResultSchema,
  insertAssessmentLogSchema,
  insertDatabricksConfigSchema,
  FhirServer
} from "@shared/schema";
import { fhirService } from "./services/fhirService.js";
import { validatorService } from "./services/validatorService.js";
import { assessmentService } from "./services/assessmentService.js";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

import { exportService } from './services/exportService.js';
import { createLogger } from "./utils/logger.js";
import { AppError, createErrorResponse, isOperationalError } from "./utils/errors.js";

// Create logger
const logger = createLogger('Routes');

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      storage: "in-memory",
      message: "System operational (using in-memory storage)"
    });
  });

  // FHIR Server API routes
  app.get("/api/fhir-servers", async (req: Request, res: Response) => {
    try {
      // For demo, use user ID 1
      const userId = 1;
      const servers = await storage.getFhirServersByUser(userId);
      res.json(servers);
    } catch (error) {
      console.error("Error fetching FHIR servers:", error);
      res.status(500).json({ error: "Failed to fetch FHIR servers" });
    }
  });

  app.post("/api/fhir-servers", async (req: Request, res: Response) => {
    try {
      // For demo, use user ID 1
      const userId = 1;
      const serverData = { ...req.body, userId };

      const validatedData = insertFhirServerSchema.parse(serverData);
      const server = await storage.createFhirServer(validatedData);
      res.status(201).json(server);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create FHIR server" });
      }
    }
  });

  app.post("/api/fhir-servers/test-connection", async (req: Request, res: Response) => {
    try {
      const { url, authType, username, password, token, timeout } = req.body;

      // Validate required fields
      if (!url) {
        return res.status(400).json({
          success: false,
          error: "URL is required"
        });
      }

      // Create a complete server connection object with the right types
      const serverConnection: FhirServer = {
        id: 0, // Temp ID for test purposes
        url: url.trim(),
        authType: authType || 'none',
        username: username || null,
        password: password || null,
        token: token || null,
        timeout: typeof timeout === 'number' ? timeout : (parseInt(timeout) || 30),
        lastUsed: new Date(),
        userId: null
      };
      
      console.log(`Testing connection to FHIR server: ${serverConnection.url}`);
      const connectionResult = await fhirService.testConnection(serverConnection);
      console.log(`Connection test result:`, connectionResult);

      res.json(connectionResult);
    } catch (error) {
      console.error("Error testing FHIR server connection:", error);
      res.status(500).json({
        success: false,
        error: "Failed to connect to FHIR server",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/fhir-servers/:id/last-used", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedServer = await storage.updateFhirServerLastUsed(id);
      
      if (!updatedServer) {
        return res.status(404).json({ error: "FHIR server not found" });
      }
      
      res.json(updatedServer);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FHIR server" });
    }
  });

  // Assessment API routes
  app.get("/api/assessments", async (req: Request, res: Response) => {
    try {
      // For demo, use user ID 1
      const userId = 1;
      const assessments = await storage.getAssessmentsByUser(userId);
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assessments" });
    }
  });

  app.get("/api/assessments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assessment" });
    }
  });

  app.post("/api/assessments", async (req: Request, res: Response) => {
    try {
      // For demo, use user ID 1
      const userId = 1;
      const assessmentData = { ...req.body, userId };
      
      const validatedData = insertAssessmentSchema.parse(assessmentData);
      const assessment = await storage.createAssessment(validatedData);
      
      // Add initial log entry
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: "Assessment created",
        level: "info"
      });
      
      res.status(201).json(assessment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to create assessment" });
      }
    }
  });

  app.post("/api/assessments/:id/start", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      // Update assessment status to "running"
      await storage.updateAssessmentStatus(id, "running");
      
      // Start the assessment process asynchronously
      assessmentService.startAssessment(assessment)
        .catch(error => console.error("Assessment failed:", error));
      
      res.json({ message: "Assessment started", assessmentId: id });
    } catch (error) {
      res.status(500).json({ error: "Failed to start assessment" });
    }
  });

  app.get("/api/assessments/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      const logs = await storage.getAssessmentLogsByAssessment(id);
      const results = await storage.getAssessmentResultsByAssessment(id);
      const progress = assessmentService.getProgress(id);
      
      // Format response to match AssessmentStatus interface expected by the client
      res.json({
        status: assessment.status,
        progress: progress,
        logs: logs,
        // Include summary if assessment is completed and we have results
        summary: assessment.status === 'completed' && results.length > 0 ? {
          totalResourcesEvaluated: results.reduce((sum, r) => sum + r.resourcesEvaluated, 0),
          totalIssuesIdentified: results.reduce((sum, r) => sum + r.issuesIdentified, 0),
          totalAutoFixed: results.reduce((sum, r) => sum + r.autoFixed, 0),
          overallQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
          resourceScores: results.map(r => ({
            resourceType: r.resourceType,
            overallScore: r.qualityScore,
            dimensionScores: {
              completeness: r.completenessScore,
              conformity: r.conformityScore,
              plausibility: r.plausibilityScore,
              timeliness: r.timelinessScore || undefined,
              calculability: r.calculabilityScore || undefined
            },
            issuesCount: r.issuesIdentified
          })),
          topIssues: results.flatMap(r => {
            try {
              // Parse the JSON string into an array of QualityIssue objects
              if (typeof r.issues === 'string') {
                return JSON.parse(r.issues) as any[];
              } else if (Array.isArray(r.issues)) {
                return r.issues;
              } else {
                console.error(`Invalid issues format for result ID ${r.id}`);
                return [];
              }
            } catch (e) {
              console.error(`Failed to parse issues JSON for result ID ${r.id}:`, e);
              return [];
            }
          }).slice(0, 10)
        } : undefined
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assessment status" });
    }
  });

  app.get("/api/assessments/:id/results", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      const results = await storage.getAssessmentResultsByAssessment(id);
      
      if (results.length === 0) {
        return res.status(404).json({ error: "No results found for this assessment" });
      }
      
      // Format response to match AssessmentSummary interface expected by the client
      const summary = {
        totalResourcesEvaluated: results.reduce((sum, r) => sum + r.resourcesEvaluated, 0),
        totalIssuesIdentified: results.reduce((sum, r) => sum + r.issuesIdentified, 0),
        totalAutoFixed: results.reduce((sum, r) => sum + r.autoFixed, 0),
        overallQualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
        resourceScores: results.map(r => ({
          resourceType: r.resourceType,
          overallScore: r.qualityScore,
          dimensionScores: {
            completeness: r.completenessScore,
            conformity: r.conformityScore,
            plausibility: r.plausibilityScore,
            timeliness: r.timelinessScore || undefined,
            calculability: r.calculabilityScore || undefined
          },
          issuesCount: r.issuesIdentified
        })),
        topIssues: results
          .flatMap(r => {
            try {
              // Parse the JSON string into an array of QualityIssue objects
              if (typeof r.issues === 'string') {
                return JSON.parse(r.issues) as any[];
              } else if (Array.isArray(r.issues)) {
                return r.issues;
              } else {
                console.error(`Invalid issues format for resource type ${r.resourceType}`);
                return [];
              }
            } catch (e) {
              console.error(`Failed to parse issues JSON for ${r.resourceType}:`, e);
              return [];
            }
          })
          .slice(0, 10)
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching assessment results:", error);
      res.status(500).json({ error: "Failed to fetch assessment results" });
    }
  });

  app.get("/api/assessments/:id/logs", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      const logs = await storage.getAssessmentLogsByAssessment(id);
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assessment logs" });
    }
  });
  
  // Export assessment results
  app.get("/api/assessments/:id/export", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const format = (req.query.format as string) || 'pdf';
      
      if (format !== 'pdf' && format !== 'csv') {
        return res.status(400).json({ error: "Format must be 'pdf' or 'csv'" });
      }
      
      const assessment = await storage.getAssessment(id);
      
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      if (assessment.status !== 'completed') {
        return res.status(400).json({ error: "Cannot export results for an assessment that is not completed" });
      }
      
      // Get the related FHIR server
      const server = await storage.getFhirServer(assessment.serverId);
      
      if (!server) {
        return res.status(404).json({ error: "FHIR server not found" });
      }
      
      // Get assessment results
      const results = await storage.getAssessmentResultsByAssessment(id);
      
      if (results.length === 0) {
        return res.status(404).json({ error: "No results found for this assessment" });
      }
      
      // Process results to get quality scores
      const qualityScores: Record<string, number> = {
        completeness: results.reduce((sum, r) => sum + r.completenessScore, 0) / results.length,
        conformity: results.reduce((sum, r) => sum + r.conformityScore, 0) / results.length,
        plausibility: results.reduce((sum, r) => sum + r.plausibilityScore, 0) / results.length
      };
      
      // Add optional scores if they exist
      const hasTimeliness = results.some(r => r.timelinessScore !== null);
      const hasCalculability = results.some(r => r.calculabilityScore !== null);
      
      if (hasTimeliness) {
        qualityScores.timeliness = results.reduce((sum, r) => sum + (r.timelinessScore || 0), 0) / 
          results.filter(r => r.timelinessScore !== null).length;
      }
      
      if (hasCalculability) {
        qualityScores.calculability = results.reduce((sum, r) => sum + (r.calculabilityScore || 0), 0) / 
          results.filter(r => r.calculabilityScore !== null).length;
      }
      
      // Export based on format
      if (format === 'pdf') {
        // Generate PDF
        const pdfBuffer = await exportService.exportToPdf(assessment, server, results, qualityScores);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="assessment-${id}-report.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF
        res.send(pdfBuffer);
      } else {
        // Generate CSV
        const csvContent = await exportService.exportToCsv(assessment, server, results, qualityScores);
        
        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="assessment-${id}-report.csv"`);
        
        // Send the CSV
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Error exporting assessment results:", error);
      res.status(500).json({ error: "Failed to export assessment results" });
    }
  });

  // Databricks API routes
  app.get("/api/databricks/config", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Demo user
      const config = await storage.getDatabricksConfig(userId);

      if (!config) {
        return res.status(404).json({ error: "Databricks configuration not found" });
      }

      // Don't expose the access token
      const { accessToken, ...safeConfig } = config;
      res.json({ ...safeConfig, hasToken: !!accessToken });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Databricks configuration" });
    }
  });

  app.post("/api/databricks/config", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Demo user
      const configData = { ...req.body, userId };

      const validatedData = insertDatabricksConfigSchema.parse(configData);
      const config = await storage.saveDatabricksConfig(validatedData);

      // Don't expose the access token
      const { accessToken, ...safeConfig } = config;
      res.status(201).json({ ...safeConfig, hasToken: !!accessToken });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: "Failed to save Databricks configuration" });
      }
    }
  });

  app.post("/api/databricks/test-connection", async (req: Request, res: Response) => {
    try {
      const { workspaceUrl, accessToken, clusterId } = req.body;

      if (!workspaceUrl || !accessToken) {
        return res.status(400).json({
          success: false,
          message: "Workspace URL and access token are required"
        });
      }

      // Dynamically import DatabricksService to avoid circular dependencies
      const { DatabricksService } = await import("./services/databricksService");
      const databricksService = new DatabricksService({
        workspaceUrl,
        accessToken,
        clusterId,
        userId: 1,
        id: 0,
        isActive: true,
        lastTestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await databricksService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Databricks connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to connect to Databricks",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/databricks/sync/:assessmentId", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Demo user
      const assessmentId = parseInt(req.params.assessmentId);

      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      const config = await storage.getDatabricksConfig(userId);
      if (!config) {
        return res.status(404).json({ error: "Databricks configuration not found. Please configure Databricks first." });
      }

      // Create sync job record
      const syncJob = await storage.createDatabricksSyncJob({
        assessmentId,
        userId
      });

      // Start sync in background
      (async () => {
        try {
          await storage.updateDatabricksSyncJobStatus(syncJob.id, "running");

          const { DatabricksService } = await import("./services/databricksService");
          const databricksService = new DatabricksService(config);

          const results = await storage.getAssessmentResultsByAssessment(assessmentId);

          const syncResult = await databricksService.syncAssessment(
            assessment,
            results,
            (status) => {
              storage.updateDatabricksSyncJobProgress(
                syncJob.id,
                status.progress,
                status.recordsSynced
              );
            }
          );

          if (syncResult.success) {
            await storage.updateDatabricksSyncJobStatus(
              syncJob.id,
              "completed",
              syncResult.recordsSynced
            );
          } else {
            await storage.updateDatabricksSyncJobStatus(
              syncJob.id,
              "failed",
              undefined,
              syncResult.message
            );
          }
        } catch (error) {
          await storage.updateDatabricksSyncJobStatus(
            syncJob.id,
            "failed",
            undefined,
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      })();

      res.json({
        message: "Sync started",
        syncJobId: syncJob.id
      });
    } catch (error) {
      console.error("Error starting Databricks sync:", error);
      res.status(500).json({ error: "Failed to start sync" });
    }
  });

  app.get("/api/databricks/sync-status/:syncJobId", async (req: Request, res: Response) => {
    try {
      const syncJobId = parseInt(req.params.syncJobId);
      const syncJob = await storage.getDatabricksSyncJob(syncJobId);

      if (!syncJob) {
        return res.status(404).json({ error: "Sync job not found" });
      }

      res.json(syncJob);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  app.get("/api/analytics/trends", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Demo user
      const days = parseInt(req.query.days as string) || 30;

      const config = await storage.getDatabricksConfig(userId);
      if (!config) {
        return res.status(404).json({ error: "Databricks not configured" });
      }

      const { DatabricksService } = await import("./services/databricksService");
      const databricksService = new DatabricksService(config);

      const trends = await databricksService.getQualityTrends(userId, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ error: "Failed to fetch quality trends" });
    }
  });

  app.get("/api/analytics/benchmarks", async (req: Request, res: Response) => {
    try {
      const userId = 1; // Demo user
      const resourceType = req.query.resourceType as string | undefined;

      const config = await storage.getDatabricksConfig(userId);
      if (!config) {
        return res.status(404).json({ error: "Databricks not configured" });
      }

      const { DatabricksService } = await import("./services/databricksService");
      const databricksService = new DatabricksService(config);

      const benchmarks = await databricksService.getBenchmarks(resourceType);
      res.json(benchmarks);
    } catch (error) {
      console.error("Error fetching benchmarks:", error);
      res.status(500).json({ error: "Failed to fetch benchmarks" });
    }
  });

  // Resource Cache API routes
  app.get("/api/assessments/:id/cached-resources", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const resourceType = req.query.resourceType as string | undefined;

      const assessment = await storage.getAssessment(id);

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Get cached resources
      const cachedResources = assessmentService.getCachedResources(id, resourceType);

      res.json({
        assessmentId: id,
        resourceType: resourceType || 'all',
        count: cachedResources.length,
        resources: cachedResources
      });
    } catch (error) {
      console.error("Error fetching cached resources:", error);
      res.status(500).json({ error: "Failed to fetch cached resources" });
    }
  });

  app.get("/api/assessments/:id/cache-stats", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const assessment = await storage.getAssessment(id);

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Get cache statistics
      const stats = assessmentService.getCacheStats(id);

      res.json({
        assessmentId: id,
        ...stats
      });
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache statistics" });
    }
  });

  // Global error handler (must be last)
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error('Unhandled error in request', err, {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body
    });

    // Check if error is operational
    if (err instanceof AppError) {
      const errorResponse = createErrorResponse(err);
      return res.status(err.statusCode).json(errorResponse);
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationError.details,
        timestamp: new Date().toISOString()
      });
    }

    // Generic error response for unexpected errors
    const errorResponse = createErrorResponse(err);
    const statusCode = (err as any).statusCode || 500;

    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production' && !isOperationalError(err)) {
      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    res.status(statusCode).json(errorResponse);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
