import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFhirServerSchema, 
  insertAssessmentSchema,
  insertAssessmentResultSchema,
  insertAssessmentLogSchema,
  FhirServer
} from "@shared/schema";
import { fhirService } from "./services/fhirService";
import { validatorService } from "./services/validatorService";
import { assessmentService } from "./services/assessmentService";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

import { exportService } from './services/exportService';

export async function registerRoutes(app: Express): Promise<Server> {
  // FHIR Server API routes
  app.get("/api/fhir-servers", async (req: Request, res: Response) => {
    try {
      // For demo, use user ID 1
      const userId = 1;
      const servers = await storage.getFhirServersByUser(userId);
      res.json(servers);
    } catch (error) {
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
      
      // Create a complete server connection object with the right types
      const serverConnection: FhirServer = {
        id: 0, // Temp ID for test purposes
        url,
        authType,
        username: username || null,
        password: password || null,
        token: token || null,
        timeout: typeof timeout === 'number' ? timeout : parseInt(timeout) || 30,
        lastUsed: new Date(),
        userId: null
      };
      
      const connectionResult = await fhirService.testConnection(serverConnection);
      
      res.json(connectionResult);
    } catch (error) {
      res.status(500).json({ 
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

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
