/**
 * Service for managing assessment processes
 */

import { Assessment, FhirServer } from "@shared/schema";
import { storage } from "../storage";
import { fhirService } from "./fhirService";
import { validatorService, ValidationResult } from "./validatorService";

// Track assessment progress
interface AssessmentProgressMap {
  [assessmentId: number]: {
    overallProgress: number;
    resourceProgress: {
      [resource: string]: {
        completed: number;
        total: number;
        status: 'pending' | 'in-progress' | 'complete';
      };
    };
  };
}

class AssessmentService {
  private assessmentProgress: AssessmentProgressMap = {};

  /**
   * Start an assessment process
   */
  async startAssessment(assessment: Assessment): Promise<void> {
    try {
      // Initialize progress tracking
      this.initializeProgress(assessment);

      // Log assessment start
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: "Assessment started",
        level: "info"
      });

      // Get the FHIR server details
      const server = await storage.getFhirServer(assessment.serverId);
      if (!server) {
        throw new Error(`FHIR server with ID ${assessment.serverId} not found`);
      }

      // Get selected resources
      const resources = assessment.resources as { [key: string]: boolean };
      const selectedResources = Object.keys(resources).filter(key => resources[key]);

      // Sample size conversion
      const sampleSize = assessment.sampleSize === 'all' ? 'all' : parseInt(assessment.sampleSize);

      // Process each resource type
      for (const resourceType of selectedResources) {
        await this.processResourceType(
          assessment,
          server,
          resourceType,
          sampleSize,
          assessment.validator,
          assessment.implementationGuide
        );
      }

      // Mark assessment as complete
      await storage.updateAssessmentCompletion(assessment.id);
      
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: "Assessment completed",
        level: "info"
      });
      
      // Update progress to 100%
      this.updateOverallProgress(assessment.id);
    } catch (error) {
      console.error(`Assessment ${assessment.id} failed:`, error);
      
      // Log error
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: `Assessment failed: ${error instanceof Error ? error.message : String(error)}`,
        level: "error"
      });
      
      // Update assessment status to failed
      await storage.updateAssessmentStatus(assessment.id, "failed");
    }
  }

  /**
   * Get the current progress of an assessment
   */
  getProgress(assessmentId: number) {
    return this.assessmentProgress[assessmentId] || {
      overallProgress: 0,
      resourceProgress: {}
    };
  }

  /**
   * Initialize progress tracking for a new assessment
   */
  private initializeProgress(assessment: Assessment): void {
    const resources = assessment.resources as { [key: string]: boolean };
    const selectedResources = Object.keys(resources).filter(key => resources[key]);
    
    const resourceProgress: {
      [resource: string]: {
        completed: number;
        total: number;
        status: 'pending' | 'in-progress' | 'complete';
      };
    } = {};
    
    for (const resource of selectedResources) {
      resourceProgress[resource] = {
        completed: 0,
        total: parseInt(assessment.sampleSize) || 100, // Default to 100 if "all"
        status: 'pending'
      };
    }
    
    this.assessmentProgress[assessment.id] = {
      overallProgress: 0,
      resourceProgress
    };
  }

  /**
   * Process a single resource type
   */
  private async processResourceType(
    assessment: Assessment,
    server: FhirServer,
    resourceType: string,
    sampleSize: number | 'all',
    validator: string,
    implementationGuide: string
  ): Promise<void> {
    try {
      console.log(`Starting to process resource type: ${resourceType}`);
      // Update progress status to in-progress
      this.updateResourceStatus(assessment.id, resourceType, 'in-progress');
      
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: `Started validating ${resourceType} resources`,
        level: "info"
      });

      console.log(`Fetching ${resourceType} resources from server ${server.url}`);
      // Fetch resources from FHIR server
      const resources = await fhirService.fetchResources(server, resourceType, sampleSize);
      console.log(`Fetched ${resources.length} ${resourceType} resources`);
      
      // Handle case with no resources
      if (resources.length === 0) {
        console.log(`No ${resourceType} resources found or error occurred`);
        await storage.createAssessmentLog({
          assessmentId: assessment.id,
          message: `No ${resourceType} resources found or error fetching resources`,
          level: "warning"
        });
        
        // Mark this resource type as complete with 0 resources
        this.assessmentProgress[assessment.id].resourceProgress[resourceType].total = 0;
        this.updateResourceStatus(assessment.id, resourceType, 'complete');
        return;
      }
      
      // Update total count in progress tracking
      if (resources.length !== this.assessmentProgress[assessment.id].resourceProgress[resourceType].total) {
        this.assessmentProgress[assessment.id].resourceProgress[resourceType].total = resources.length;
      }

      // Process resources in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = Math.ceil(resources.length / batchSize);
      
      let validationResults: ValidationResult[] = [];
      let autoFixedCount = 0;
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, resources.length);
        const batch = resources.slice(start, end);
        
        // Validate batch
        const batchResults = await validatorService.validateResources(
          server,
          resourceType,
          batch,
          validator,
          implementationGuide
        );
        
        validationResults = validationResults.concat(batchResults);
        
        // Count auto-fixed issues
        for (const result of batchResults) {
          if (result.fixedIssues && result.fixedIssues.length > 0) {
            autoFixedCount += result.fixedIssues.length;
          }
        }
        
        // Update progress
        this.updateResourceProgress(
          assessment.id,
          resourceType,
          end
        );
        
        // Small delay to prevent overloading
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Count issues by dimension
      const issuesByDimension = this.countIssuesByDimension(validationResults);
      
      // Log validation results
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: `Completed validation of ${resources.length} ${resourceType} resources`,
        level: "info"
      });
      
      if (autoFixedCount > 0) {
        await storage.createAssessmentLog({
          assessmentId: assessment.id,
          message: `Auto-corrected ${autoFixedCount} ${resourceType} resources with fixable issues`,
          level: "info"
        });
      }
      
      // Calculate quality scores
      const {
        qualityScore,
        completenessScore,
        conformityScore,
        plausibilityScore,
        timelinessScore,
        calculabilityScore
      } = this.calculateQualityScores(validationResults, assessment);
      
      // Create assessment result
      await storage.createAssessmentResult({
        assessmentId: assessment.id,
        resourceType,
        resourcesEvaluated: resources.length,
        issuesIdentified: this.countIssues(validationResults),
        autoFixed: autoFixedCount,
        qualityScore,
        completenessScore,
        conformityScore,
        plausibilityScore,
        timelinessScore: timelinessScore || null,
        calculabilityScore: calculabilityScore || null,
        issues: this.summarizeIssues(validationResults, resourceType)
      });
      
      // Update progress status to complete
      this.updateResourceStatus(assessment.id, resourceType, 'complete');
      
      // Update overall progress
      this.updateOverallProgress(assessment.id);
    } catch (error) {
      console.error(`Error processing ${resourceType}:`, error);
      
      // Log error
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: `Error processing ${resourceType}: ${error instanceof Error ? error.message : String(error)}`,
        level: "error"
      });
      
      // Mark this resource as complete to allow other resources to continue
      this.updateResourceStatus(assessment.id, resourceType, 'complete');
      this.updateOverallProgress(assessment.id);
    }
  }

  /**
   * Update resource processing progress
   */
  private updateResourceProgress(
    assessmentId: number,
    resourceType: string,
    completedCount: number
  ): void {
    if (!this.assessmentProgress[assessmentId]) return;
    
    const resourceProgress = this.assessmentProgress[assessmentId].resourceProgress[resourceType];
    if (!resourceProgress) return;
    
    resourceProgress.completed = completedCount;
    
    // Update overall progress
    this.updateOverallProgress(assessmentId);
  }

  /**
   * Update resource processing status
   */
  private updateResourceStatus(
    assessmentId: number,
    resourceType: string,
    status: 'pending' | 'in-progress' | 'complete'
  ): void {
    if (!this.assessmentProgress[assessmentId]) return;
    
    const resourceProgress = this.assessmentProgress[assessmentId].resourceProgress[resourceType];
    if (!resourceProgress) return;
    
    resourceProgress.status = status;
    
    // If complete, ensure count is set to total
    if (status === 'complete') {
      resourceProgress.completed = resourceProgress.total;
    }
    
    // Update overall progress
    this.updateOverallProgress(assessmentId);
  }

  /**
   * Update overall progress percentage
   */
  private updateOverallProgress(assessmentId: number): void {
    if (!this.assessmentProgress[assessmentId]) return;
    
    const progress = this.assessmentProgress[assessmentId];
    const resourceTypes = Object.keys(progress.resourceProgress);
    
    if (resourceTypes.length === 0) {
      progress.overallProgress = 0;
      return;
    }
    
    let totalCompleted = 0;
    let totalResources = 0;
    
    for (const resourceType of resourceTypes) {
      totalCompleted += progress.resourceProgress[resourceType].completed;
      totalResources += progress.resourceProgress[resourceType].total;
    }
    
    progress.overallProgress = Math.round((totalCompleted / totalResources) * 100);
  }

  /**
   * Count total issues in validation results
   */
  private countIssues(results: ValidationResult[]): number {
    return results.reduce((count, result) => count + result.issues.length, 0);
  }

  /**
   * Count issues by dimension
   */
  private countIssuesByDimension(results: ValidationResult[]): { [dimension: string]: number } {
    const dimensions: { [dimension: string]: number } = {
      completeness: 0,
      conformity: 0,
      plausibility: 0,
      timeliness: 0,
      calculability: 0
    };
    
    for (const result of results) {
      for (const issue of result.issues) {
        if (issue.dimension && dimensions[issue.dimension] !== undefined) {
          dimensions[issue.dimension]++;
        }
      }
    }
    
    return dimensions;
  }

  /**
   * Calculate quality scores based on validation results
   */
  private calculateQualityScores(
    results: ValidationResult[],
    assessment: Assessment
  ): {
    qualityScore: number;
    completenessScore: number;
    conformityScore: number;
    plausibilityScore: number;
    timelinessScore?: number;
    calculabilityScore?: number;
  } {
    // Count issues by dimension
    const dimensions = this.countIssuesByDimension(results);
    
    // Get total resources
    const totalResources = results.length;
    
    if (totalResources === 0) {
      return {
        qualityScore: 100,
        completenessScore: 100,
        conformityScore: 100,
        plausibilityScore: 100
      };
    }
    
    // Calculate dimension weights based on selected dimensions in assessment
    const assessmentDimensions = assessment.dimensions as { [key: string]: boolean };
    
    const selectedDimensions = Object.keys(assessmentDimensions)
      .filter(dim => assessmentDimensions[dim]);
    
    const dimensionWeight = 1 / selectedDimensions.length;
    
    // Calculate scores for each dimension (100 - percentage of resources with issues)
    const completenessScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.completeness / totalResources * 100))));
    const conformityScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.conformity / totalResources * 100))));
    const plausibilityScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.plausibility / totalResources * 100))));
    
    // Optional dimensions
    const timelinessScore = assessmentDimensions.timeliness 
      ? Math.max(0, Math.min(100, Math.round(100 - (dimensions.timeliness / totalResources * 100))))
      : undefined;
    
    const calculabilityScore = assessmentDimensions.calculability
      ? Math.max(0, Math.min(100, Math.round(100 - (dimensions.calculability / totalResources * 100))))
      : undefined;
    
    // Calculate weighted overall score
    let qualityScore = 0;
    qualityScore += completenessScore * dimensionWeight;
    qualityScore += conformityScore * dimensionWeight;
    qualityScore += plausibilityScore * dimensionWeight;
    
    if (timelinessScore !== undefined) {
      qualityScore += timelinessScore * dimensionWeight;
    }
    
    if (calculabilityScore !== undefined) {
      qualityScore += calculabilityScore * dimensionWeight;
    }
    
    return {
      qualityScore: Math.round(qualityScore),
      completenessScore,
      conformityScore,
      plausibilityScore,
      timelinessScore,
      calculabilityScore
    };
  }

  /**
   * Summarize issues for storage
   */
  private summarizeIssues(results: ValidationResult[], resourceType: string): any[] {
    // Group similar issues
    const issueGroups: { [key: string]: any } = {};
    
    for (const result of results) {
      for (const issue of result.issues) {
        // Create a key for grouping similar issues
        const key = `${issue.severity}|${issue.code}|${issue.dimension}|${issue.diagnostics}`;
        
        if (!issueGroups[key]) {
          issueGroups[key] = {
            severity: issue.severity,
            code: issue.code,
            diagnostics: issue.diagnostics,
            dimension: issue.dimension,
            count: 0,
            examples: []
          };
        }
        
        issueGroups[key].count++;
        
        // Store a few examples
        if (issueGroups[key].examples.length < 5) {
          issueGroups[key].examples.push({
            resourceId: result.resourceId,
            location: issue.location || issue.expression
          });
        }
      }
    }
    
    // Convert to array and sort by count
    return Object.values(issueGroups)
      .sort((a, b) => b.count - a.count)
      .map((group, index) => ({
        id: index + 1,
        resourceType,
        severity: group.severity,
        code: group.code,
        description: group.diagnostics,
        dimension: group.dimension,
        count: group.count,
        examples: group.examples
      }));
  }
}

export const assessmentService = new AssessmentService();
