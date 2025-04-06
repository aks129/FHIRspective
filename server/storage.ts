import {
  users, type User, type InsertUser,
  fhirServers, type FhirServer, type InsertFhirServer,
  assessments, type Assessment, type InsertAssessment,
  assessmentResults, type AssessmentResult, type InsertAssessmentResult,
  assessmentLogs, type AssessmentLog, type InsertAssessmentLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // FHIR Server operations
  async getFhirServer(id: number): Promise<FhirServer | undefined> {
    const [server] = await db.select().from(fhirServers).where(eq(fhirServers.id, id));
    return server;
  }

  async getFhirServersByUser(userId: number): Promise<FhirServer[]> {
    return await db
      .select()
      .from(fhirServers)
      .where(eq(fhirServers.userId, userId))
      .orderBy(desc(fhirServers.lastUsed));
  }

  async createFhirServer(insertServer: InsertFhirServer): Promise<FhirServer> {
    const [server] = await db.insert(fhirServers).values({
      ...insertServer,
      lastUsed: new Date()
    }).returning();
    return server;
  }

  async updateFhirServerLastUsed(id: number): Promise<FhirServer | undefined> {
    const [server] = await db
      .update(fhirServers)
      .set({ lastUsed: new Date() })
      .where(eq(fhirServers.id, id))
      .returning();
    return server;
  }

  // Assessment operations
  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async getAssessmentsByUser(userId: number): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.createdAt));
  }

  async createAssessment(insertAssessment: InsertAssessment): Promise<Assessment> {
    const [assessment] = await db.insert(assessments).values(insertAssessment).returning();
    return assessment;
  }

  async updateAssessmentStatus(id: number, status: string): Promise<Assessment | undefined> {
    const [assessment] = await db
      .update(assessments)
      .set({ status })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async updateAssessmentCompletion(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db
      .update(assessments)
      .set({ 
        status: "completed",
        completedAt: new Date()
      })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  // Assessment Result operations
  async getAssessmentResult(id: number): Promise<AssessmentResult | undefined> {
    const [result] = await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.id, id));
    return result;
  }

  async getAssessmentResultsByAssessment(assessmentId: number): Promise<AssessmentResult[]> {
    return await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.assessmentId, assessmentId));
  }

  async createAssessmentResult(insertResult: InsertAssessmentResult): Promise<AssessmentResult> {
    const [result] = await db
      .insert(assessmentResults)
      .values(insertResult)
      .returning();
    return result;
  }

  // Assessment Log operations
  async getAssessmentLogsByAssessment(assessmentId: number): Promise<AssessmentLog[]> {
    return await db
      .select()
      .from(assessmentLogs)
      .where(eq(assessmentLogs.assessmentId, assessmentId))
      .orderBy(desc(assessmentLogs.timestamp));
  }

  async createAssessmentLog(insertLog: InsertAssessmentLog): Promise<AssessmentLog> {
    const [log] = await db
      .insert(assessmentLogs)
      .values(insertLog)
      .returning();
    return log;
  }
}

// Seed the database with initial data if needed
async function seedDatabase() {
  try {
    // Check if we already have users
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      // Create demo user
      await db.insert(users).values({
        username: "demo",
        password: "password"
      });
      
      // Get the user id
      const [demoUser] = await db.select().from(users).where(eq(users.username, "demo"));
      
      // Create sample FHIR servers
      await db.insert(fhirServers).values([
        {
          url: "https://hapi.fhir.org/baseR4",
          authType: "none",
          timeout: 30,
          userId: demoUser.id
        },
        {
          url: "https://smartfhir.sandboxcerner.com/r4/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca",
          authType: "none",
          timeout: 30,
          userId: demoUser.id
        }
      ]);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Initialize the database if needed
seedDatabase().catch(console.error);

// Export the storage instance
export const storage = new DatabaseStorage();
