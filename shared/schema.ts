import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User authentication table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// FHIR Server Connection table
export const fhirServers = pgTable("fhir_servers", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  authType: text("auth_type").notNull().default("none"),
  username: text("username"),
  password: text("password"),
  token: text("token"),
  timeout: integer("timeout").notNull().default(30),
  lastUsed: timestamp("last_used").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertFhirServerSchema = createInsertSchema(fhirServers).pick({
  url: true,
  authType: true,
  username: true,
  password: true,
  token: true,
  timeout: true,
  userId: true,
});

// Assessment Configuration table
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").references(() => fhirServers.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull().default("FHIR Assessment"),
  resources: jsonb("resources").notNull(),
  sampleSize: text("sample_size").notNull().default("100"),
  validator: text("validator").notNull().default("inferno"),
  implementationGuide: text("implementation_guide").notNull().default("uscore"),
  qualityFramework: text("quality_framework").notNull().default("kahn"),
  dimensions: jsonb("dimensions").notNull(),
  purpose: jsonb("purpose").notNull(),
  remediationOptions: jsonb("remediation_options").notNull(),
  exportFormat: text("export_format").notNull().default("json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("pending"),
});

export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  serverId: true,
  userId: true,
  name: true,
  resources: true,
  sampleSize: true,
  validator: true,
  implementationGuide: true,
  qualityFramework: true,
  dimensions: true,
  purpose: true,
  remediationOptions: true,
  exportFormat: true,
});

// Assessment Results table
export const assessmentResults = pgTable("assessment_results", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id).notNull(),
  resourceType: text("resource_type").notNull(),
  resourcesEvaluated: integer("resources_evaluated").notNull(),
  issuesIdentified: integer("issues_identified").notNull(),
  autoFixed: integer("auto_fixed").notNull(),
  qualityScore: integer("quality_score").notNull(),
  completenessScore: integer("completeness_score").notNull(),
  conformityScore: integer("conformity_score").notNull(),
  plausibilityScore: integer("plausibility_score").notNull(),
  timelinessScore: integer("timeliness_score"),
  calculabilityScore: integer("calculability_score"),
  issues: jsonb("issues").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssessmentResultSchema = createInsertSchema(assessmentResults).pick({
  assessmentId: true,
  resourceType: true,
  resourcesEvaluated: true,
  issuesIdentified: true,
  autoFixed: true,
  qualityScore: true,
  completenessScore: true,
  conformityScore: true,
  plausibilityScore: true,
  timelinessScore: true,
  calculabilityScore: true,
  issues: true,
});

export const assessmentLogs = pgTable("assessment_logs", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => assessments.id).notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull().default("info"),
});

export const insertAssessmentLogSchema = createInsertSchema(assessmentLogs).pick({
  assessmentId: true,
  message: true,
  level: true,
});

// Export types for use in the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FhirServer = typeof fhirServers.$inferSelect;
export type InsertFhirServer = z.infer<typeof insertFhirServerSchema>;

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;

export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;

export type AssessmentLog = typeof assessmentLogs.$inferSelect;
export type InsertAssessmentLog = z.infer<typeof insertAssessmentLogSchema>;
