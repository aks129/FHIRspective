import {
  type User, type InsertUser,
  type FhirServer, type InsertFhirServer,
  type Assessment, type InsertAssessment,
  type AssessmentResult, type InsertAssessmentResult,
  type AssessmentLog, type InsertAssessmentLog
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
  private users: User[] = [];
  private fhirServers: FhirServer[] = [];
  private assessments: Assessment[] = [];
  private assessmentResults: AssessmentResult[] = [];
  private assessmentLogs: AssessmentLog[] = [];
  
  private nextIds = {
    user: 1,
    fhirServer: 1,
    assessment: 1,
    assessmentResult: 1,
    assessmentLog: 1
  };
  
  constructor() {
    // Add initial demo user
    this.createUser({
      username: "demo",
      password: "password"
    }).then(user => {
      // Add sample FHIR servers
      this.createFhirServer({
        url: "https://hapi.fhir.org/baseR4",
        authType: "none",
        timeout: 30,
        userId: user.id
      });

      this.createFhirServer({
        url: "https://server.fire.ly",
        authType: "none",
        timeout: 30,
        userId: user.id
      });

      this.createFhirServer({
        url: "https://r4.test.pyrohealth.net",
        authType: "none",
        timeout: 30,
        userId: user.id
      });
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextIds.user++,
      ...insertUser
    };
    this.users.push(user);
    return user;
  }

  // FHIR Server operations
  async getFhirServer(id: number): Promise<FhirServer | undefined> {
    return this.fhirServers.find(server => server.id === id);
  }

  async getFhirServersByUser(userId: number): Promise<FhirServer[]> {
    return this.fhirServers
      .filter(server => server.userId === userId)
      .sort((a, b) => {
        // Sort by lastUsed in descending order
        return (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0);
      });
  }

  async createFhirServer(insertServer: InsertFhirServer): Promise<FhirServer> {
    const server: FhirServer = {
      id: this.nextIds.fhirServer++,
      ...insertServer,
      lastUsed: new Date()
    };
    this.fhirServers.push(server);
    return server;
  }

  async updateFhirServerLastUsed(id: number): Promise<FhirServer | undefined> {
    const server = this.fhirServers.find(s => s.id === id);
    if (server) {
      server.lastUsed = new Date();
    }
    return server;
  }

  // Assessment operations
  async getAssessment(id: number): Promise<Assessment | undefined> {
    return this.assessments.find(assessment => assessment.id === id);
  }

  async getAssessmentsByUser(userId: number): Promise<Assessment[]> {
    return this.assessments
      .filter(assessment => assessment.userId === userId)
      .sort((a, b) => {
        // Sort by createdAt in descending order
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const assessment: Assessment = {
      id: this.nextIds.assessment++,
      ...insertAssessment,
      status: insertAssessment.status || "pending",
      createdAt: new Date(),
      completedAt: null
    };
    this.assessments.push(assessment);
    return assessment;
  }

  async updateAssessmentStatus(id: number, status: string): Promise<Assessment | undefined> {
    const assessment = this.assessments.find(a => a.id === id);
    if (assessment) {
      assessment.status = status;
    }
    return assessment;
  }

  async updateAssessmentCompletion(id: number): Promise<Assessment | undefined> {
    const assessment = this.assessments.find(a => a.id === id);
    if (assessment) {
      assessment.status = "completed";
      assessment.completedAt = new Date();
    }
    return assessment;
  }

  // Assessment Result operations
  async getAssessmentResult(id: number): Promise<AssessmentResult | undefined> {
    return this.assessmentResults.find(result => result.id === id);
  }

  async getAssessmentResultsByAssessment(assessmentId: number): Promise<AssessmentResult[]> {
    return this.assessmentResults.filter(result => result.assessmentId === assessmentId);
  }

  async createAssessmentResult(insertResult: InsertAssessmentResult): Promise<AssessmentResult> {
    const result: AssessmentResult = {
      id: this.nextIds.assessmentResult++,
      ...insertResult,
      createdAt: new Date()
    };
    this.assessmentResults.push(result);
    return result;
  }

  // Assessment Log operations
  async getAssessmentLogsByAssessment(assessmentId: number): Promise<AssessmentLog[]> {
    return this.assessmentLogs
      .filter(log => log.assessmentId === assessmentId)
      .sort((a, b) => {
        // Sort by timestamp in descending order
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  async createAssessmentLog(insertLog: InsertAssessmentLog): Promise<AssessmentLog> {
    const log: AssessmentLog = {
      id: this.nextIds.assessmentLog++,
      ...insertLog,
      timestamp: insertLog.timestamp || new Date()
    };
    this.assessmentLogs.push(log);
    return log;
  }
}

// Export the storage instance
export const storage = new MemStorage();
