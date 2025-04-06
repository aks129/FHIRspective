import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFhirServerSchema, 
  insertAssessmentSchema,
  insertAssessmentResultSchema,
  insertAssessmentLogSchema
} from "@shared/schema";
import { fhirService } from "./services/fhirService";
import { validatorService } from "./services/validatorService";
import { assessmentService } from "./services/assessmentService";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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
      
      const connectionResult = await fhirService.testConnection({
        url,
        authType,
        username,
        password,
        token,
        timeout: timeout || 30
      });
      
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
      
      res.json({
        assessment,
        logs,
        results,
        progress: assessmentService.getProgress(id)
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
      
      res.json(results);
    } catch (error) {
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

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
