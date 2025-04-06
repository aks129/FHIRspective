import {
  users, type User, type InsertUser,
  fhirServers, type FhirServer, type InsertFhirServer,
  assessments, type Assessment, type InsertAssessment,
  assessmentResults, type AssessmentResult, type InsertAssessmentResult,
  assessmentLogs, type AssessmentLog, type InsertAssessmentLog
} from "@shared/schema";

// Storage interface defining all operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // FHIR Server operations
  getFhirServer(id: number): Promise<FhirServer | undefined>;
  getFhirServersByUser(userId: number): Promise<FhirServer[]>;
  createFhirServer(server: InsertFhirServer): Promise<FhirServer>;
  updateFhirServerLastUsed(id: number): Promise<FhirServer | undefined>;
  
  // Assessment operations
  getAssessment(id: number): Promise<Assessment | undefined>;
  getAssessmentsByUser(userId: number): Promise<Assessment[]>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessmentStatus(id: number, status: string): Promise<Assessment | undefined>;
  updateAssessmentCompletion(id: number): Promise<Assessment | undefined>;
  
  // Assessment Result operations
  getAssessmentResult(id: number): Promise<AssessmentResult | undefined>;
  getAssessmentResultsByAssessment(assessmentId: number): Promise<AssessmentResult[]>;
  createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult>;
  
  // Assessment Log operations
  getAssessmentLogsByAssessment(assessmentId: number): Promise<AssessmentLog[]>;
  createAssessmentLog(log: InsertAssessmentLog): Promise<AssessmentLog>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private fhirServers: Map<number, FhirServer>;
  private assessments: Map<number, Assessment>;
  private assessmentResults: Map<number, AssessmentResult>;
  private assessmentLogs: Map<number, AssessmentLog>;
  
  private currentUserId: number;
  private currentFhirServerId: number;
  private currentAssessmentId: number;
  private currentAssessmentResultId: number;
  private currentAssessmentLogId: number;

  constructor() {
    this.users = new Map();
    this.fhirServers = new Map();
    this.assessments = new Map();
    this.assessmentResults = new Map();
    this.assessmentLogs = new Map();
    
    this.currentUserId = 1;
    this.currentFhirServerId = 1;
    this.currentAssessmentId = 1;
    this.currentAssessmentResultId = 1;
    this.currentAssessmentLogId = 1;
    
    // Add some initial data for development
    this.createUser({ username: "demo", password: "password" });
    
    this.createFhirServer({
      url: "https://hapi.fhir.org/baseR4",
      authType: "none",
      timeout: 30,
      userId: 1
    });
    
    this.createFhirServer({
      url: "https://smartfhir.sandboxcerner.com/r4/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca",
      authType: "none",
      timeout: 30,
      userId: 1
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // FHIR Server operations
  async getFhirServer(id: number): Promise<FhirServer | undefined> {
    return this.fhirServers.get(id);
  }

  async getFhirServersByUser(userId: number): Promise<FhirServer[]> {
    return Array.from(this.fhirServers.values())
      .filter(server => server.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.lastUsed).getTime();
        const dateB = new Date(b.lastUsed).getTime();
        return dateB - dateA; // Sort by most recent first
      });
  }

  async createFhirServer(insertServer: InsertFhirServer): Promise<FhirServer> {
    const id = this.currentFhirServerId++;
    const now = new Date();
    const server: FhirServer = { 
      ...insertServer, 
      id, 
      lastUsed: now
    };
    this.fhirServers.set(id, server);
    return server;
  }

  async updateFhirServerLastUsed(id: number): Promise<FhirServer | undefined> {
    const server = this.fhirServers.get(id);
    if (!server) return undefined;
    
    const updatedServer = {
      ...server,
      lastUsed: new Date()
    };
    this.fhirServers.set(id, updatedServer);
    return updatedServer;
  }

  // Assessment operations
  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.get(id);
  }

  async getAssessmentsByUser(userId: number): Promise<Assessment[]> {
    return Array.from(this.assessments.values())
      .filter(assessment => assessment.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Sort by most recent first
      });
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const id = this.currentAssessmentId++;
    const now = new Date();
    const assessment: Assessment = {
      ...insertAssessment,
      id,
      createdAt: now,
      completedAt: null,
      status: "pending"
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  async updateAssessmentStatus(id: number, status: string): Promise<Assessment | undefined> {
    const assessment = this.assessments.get(id);
    if (!assessment) return undefined;
    
    const updatedAssessment = {
      ...assessment,
      status
    };
    this.assessments.set(id, updatedAssessment);
    return updatedAssessment;
  }

  async updateAssessmentCompletion(id: number): Promise<Assessment | undefined> {
    const assessment = this.assessments.get(id);
    if (!assessment) return undefined;
    
    const updatedAssessment = {
      ...assessment,
      completedAt: new Date(),
      status: "completed"
    };
    this.assessments.set(id, updatedAssessment);
    return updatedAssessment;
  }

  // Assessment Result operations
  async getAssessmentResult(id: number): Promise<AssessmentResult | undefined> {
    return this.assessmentResults.get(id);
  }

  async getAssessmentResultsByAssessment(assessmentId: number): Promise<AssessmentResult[]> {
    return Array.from(this.assessmentResults.values())
      .filter(result => result.assessmentId === assessmentId);
  }

  async createAssessmentResult(insertResult: InsertAssessmentResult): Promise<AssessmentResult> {
    const id = this.currentAssessmentResultId++;
    const now = new Date();
    const result: AssessmentResult = {
      ...insertResult,
      id,
      createdAt: now
    };
    this.assessmentResults.set(id, result);
    return result;
  }

  // Assessment Log operations
  async getAssessmentLogsByAssessment(assessmentId: number): Promise<AssessmentLog[]> {
    return Array.from(this.assessmentLogs.values())
      .filter(log => log.assessmentId === assessmentId)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Sort by most recent first
      });
  }

  async createAssessmentLog(insertLog: InsertAssessmentLog): Promise<AssessmentLog> {
    const id = this.currentAssessmentLogId++;
    const now = new Date();
    const log: AssessmentLog = {
      ...insertLog,
      id,
      timestamp: now
    };
    this.assessmentLogs.set(id, log);
    return log;
  }
}

// Export the storage instance
export const storage = new MemStorage();
