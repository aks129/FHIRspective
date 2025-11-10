/**
 * Service for managing assessment processes
 */

import { Assessment, FhirServer } from "@shared/schema";
import { storage } from "../storage";
import { fhirService } from "./fhirService";
import { validatorService, ValidationResult } from "./validatorService";
import { resourceCacheService } from "./resourceCacheService";
import { createLogger } from "../utils/logger";
import { AssessmentError, FhirError, ErrorCode } from "../utils/errors";

// Create logger for this service
const logger = createLogger('AssessmentService');

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
      const selectedResources = assessment.resources as string[];
      console.log('Assessment resources:', assessment.resources);
      console.log('Selected resources:', selectedResources);

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
   * Get cached resources for an assessment
   */
  getCachedResources(assessmentId: number, resourceType?: string) {
    return resourceCacheService.getResources(assessmentId, resourceType);
  }

  /**
   * Get cache statistics for an assessment
   */
  getCacheStats(assessmentId: number) {
    return resourceCacheService.getCacheStats(assessmentId);
  }

  /**
   * Initialize progress tracking for a new assessment
   */
  private initializeProgress(assessment: Assessment): void {
    const selectedResources = assessment.resources as string[];
    
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

      logger.info(`Fetching ${resourceType} resources`, {
        assessmentId: assessment.id,
        serverUrl: server.url,
        sampleSize
      });

      let resources: any[];
      try {
        // Fetch resources from FHIR server
        resources = await fhirService.fetchResources(server, resourceType, sampleSize);
        logger.info(`Successfully fetched ${resources.length} ${resourceType} resources`, {
          assessmentId: assessment.id,
          resourceType,
          count: resources.length
        });

        // Cache the fetched resources for later access
        if (resources.length > 0) {
          resourceCacheService.storeResources(assessment.id, resourceType, resources);
        }

        // Handle case with no resources
        if (resources.length === 0) {
          logger.warn(`No ${resourceType} resources found`, {
            assessmentId: assessment.id,
            resourceType
          });

          await storage.createAssessmentLog({
            assessmentId: assessment.id,
            message: `No ${resourceType} resources found on the FHIR server`,
            level: "warning"
          });

          // Mark this resource type as complete with 0 resources
          this.assessmentProgress[assessment.id].resourceProgress[resourceType].total = 0;
          this.updateResourceStatus(assessment.id, resourceType, 'complete');
          return;
        }
      } catch (error) {
        // Handle FHIR errors specifically
        if (error instanceof FhirError) {
          logger.error(`FHIR error fetching ${resourceType}`, error, {
            assessmentId: assessment.id,
            resourceType,
            errorCode: error.code
          });

          await storage.createAssessmentLog({
            assessmentId: assessment.id,
            message: `Failed to fetch ${resourceType}: ${error.message}`,
            level: "error"
          });

          // Mark this resource type as complete with error
          this.assessmentProgress[assessment.id].resourceProgress[resourceType].total = 0;
          this.updateResourceStatus(assessment.id, resourceType, 'complete');

          // Don't fail the entire assessment, just skip this resource type
          return;
        }

        // Re-throw unexpected errors
        throw error;
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
      
      console.log(`Processing assessment results for ${resourceType} resources`);
      
      // Count issues
      const issuesCount = this.countIssues(validationResults);
      console.log(`Identified ${issuesCount} issues in ${resources.length} ${resourceType} resources`);
      
      // Summarize issues for storage
      console.log(`Summarizing issues for ${resourceType} resources`);
      const summarizedIssues = this.summarizeIssues(validationResults, resourceType);
      console.log(`Summarized ${summarizedIssues.length} issue groups for ${resourceType} resources`);
      
      // Create assessment result
      console.log(`Creating assessment result for ${resourceType} in database`);
      try {
        await storage.createAssessmentResult({
          assessmentId: assessment.id,
          resourceType,
          resourcesEvaluated: resources.length,
          issuesIdentified: issuesCount,
          autoFixed: autoFixedCount,
          qualityScore,
          completenessScore,
          conformityScore,
          plausibilityScore,
          timelinessScore: timelinessScore || null,
          calculabilityScore: calculabilityScore || null,
          issues: summarizedIssues
        });
        console.log(`Successfully created assessment result for ${resourceType} in database`);
      } catch (dbError) {
        console.error(`Error creating assessment result in database: ${dbError}`);
        // Continue without failing the whole assessment
      }
      
      // Update progress status to complete
      this.updateResourceStatus(assessment.id, resourceType, 'complete');
      
      // Update overall progress
      this.updateOverallProgress(assessment.id);
    } catch (error) {
      logger.error(`Fatal error processing ${resourceType}`, error instanceof Error ? error : undefined, {
        assessmentId: assessment.id,
        resourceType,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      // Log error to assessment logs
      await storage.createAssessmentLog({
        assessmentId: assessment.id,
        message: `Fatal error processing ${resourceType}: ${error instanceof Error ? error.message : String(error)}`,
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
    console.log(`Updating status of ${resourceType} for assessment ${assessmentId} to ${status}`);
    
    // Ensure assessment progress object exists
    if (!this.assessmentProgress[assessmentId]) {
      console.log(`Assessment progress object doesn't exist for assessment ${assessmentId}, creating it`);
      this.assessmentProgress[assessmentId] = {
        overallProgress: 0,
        resourceProgress: {}
      };
    }
    
    // Ensure resource progress object exists
    if (!this.assessmentProgress[assessmentId].resourceProgress[resourceType]) {
      console.log(`Resource progress object doesn't exist for ${resourceType}, creating it`);
      this.assessmentProgress[assessmentId].resourceProgress[resourceType] = {
        completed: 0,
        total: 100, // Default
        status: 'pending'
      };
    }
    
    // Update the status
    this.assessmentProgress[assessmentId].resourceProgress[resourceType].status = status;
    
    // If complete, ensure count is set to total
    if (status === 'complete') {
      const total = this.assessmentProgress[assessmentId].resourceProgress[resourceType].total;
      this.assessmentProgress[assessmentId].resourceProgress[resourceType].completed = total;
      console.log(`Marking ${resourceType} as complete (${total}/${total})`);
    }
    
    // Update overall progress
    this.updateOverallProgress(assessmentId);
    console.log(`Updated overall progress for assessment ${assessmentId} to ${this.assessmentProgress[assessmentId].overallProgress}%`);

    // Log the full progress object for debugging
    console.log(`Current assessment progress: ${JSON.stringify(this.assessmentProgress[assessmentId])}`);
  }

  /**
   * Update overall progress percentage
   */
  private updateOverallProgress(assessmentId: number): void {
    // Ensure assessment progress object exists
    if (!this.assessmentProgress[assessmentId]) {
      console.log(`Assessment progress object doesn't exist for assessment ${assessmentId} in updateOverallProgress`);
      return;
    }
    
    const progress = this.assessmentProgress[assessmentId];
    const resourceTypes = Object.keys(progress.resourceProgress || {});
    
    if (resourceTypes.length === 0) {
      progress.overallProgress = 0;
      console.log(`No resource types found for assessment ${assessmentId}, setting progress to 0%`);
      return;
    }
    
    let totalCompleted = 0;
    let totalResources = 0;
    
    // Log resource types being processed
    console.log(`Calculating progress for ${resourceTypes.length} resource types: ${resourceTypes.join(', ')}`);
    
    for (const resourceType of resourceTypes) {
      try {
        const resourceProgress = progress.resourceProgress[resourceType];
        
        if (resourceProgress) {
          // Ensure values are valid numbers
          const completed = typeof resourceProgress.completed === 'number' ? resourceProgress.completed : 0;
          const total = typeof resourceProgress.total === 'number' ? resourceProgress.total : 0;
          
          totalCompleted += completed;
          totalResources += total;
          
          console.log(`Resource ${resourceType}: ${completed}/${total} (${resourceProgress.status})`);
        }
      } catch (error) {
        console.error(`Error processing progress for ${resourceType}:`, error);
      }
    }
    
    if (totalResources === 0) {
      progress.overallProgress = 0;
    } else {
      progress.overallProgress = Math.round((totalCompleted / totalResources) * 100);
    }
    
    console.log(`Assessment ${assessmentId} overall progress: ${totalCompleted}/${totalResources} = ${progress.overallProgress}%`);
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
    try {
      console.log(`Calculating quality scores for ${results?.length || 0} validation results`);
      
      // Safety check for null/undefined results
      if (!results || !Array.isArray(results)) {
        console.log(`Invalid results object, returning default scores`);
        return {
          qualityScore: 100,
          completenessScore: 100,
          conformityScore: 100,
          plausibilityScore: 100
        };
      }
      
      // Count issues by dimension
      const dimensions = this.countIssuesByDimension(results);
      console.log(`Issues by dimension: ${JSON.stringify(dimensions)}`);
      
      // Get total resources
      const totalResources = results.length;
      
      if (totalResources === 0) {
        console.log(`No resources to calculate scores, returning perfect scores`);
        return {
          qualityScore: 100,
          completenessScore: 100,
          conformityScore: 100,
          plausibilityScore: 100
        };
      }
      
      // Calculate dimension weights based on selected dimensions in assessment
      // Safety check for null/undefined dimensions
      let assessmentDimensions: { [key: string]: boolean } = {};
      try {
        assessmentDimensions = assessment.dimensions as { [key: string]: boolean } || {};
      } catch (error) {
        console.error(`Error accessing assessment dimensions:`, error);
        assessmentDimensions = {
          completeness: true,
          conformity: true,
          plausibility: true
        };
      }
      
      const selectedDimensions = Object.keys(assessmentDimensions)
        .filter(dim => assessmentDimensions[dim]);
      
      console.log(`Selected dimensions for scoring: ${selectedDimensions.join(', ')}`);
      
      // Handle case with no selected dimensions
      if (selectedDimensions.length === 0) {
        console.log(`No dimensions selected, using default dimensions`);
        selectedDimensions.push('completeness', 'conformity', 'plausibility');
      }
      
      const dimensionWeight = 1 / selectedDimensions.length;
      console.log(`Dimension weight: ${dimensionWeight}`);
      
      // Calculate scores for each dimension (100 - percentage of resources with issues)
      const completenessScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.completeness / totalResources * 100))));
      const conformityScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.conformity / totalResources * 100))));
      const plausibilityScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.plausibility / totalResources * 100))));
      
      console.log(`Base scores - Completeness: ${completenessScore}, Conformity: ${conformityScore}, Plausibility: ${plausibilityScore}`);
      
      // Optional dimensions
      let timelinessScore: number | undefined = undefined;
      let calculabilityScore: number | undefined = undefined;
      
      if (assessmentDimensions.timeliness) {
        timelinessScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.timeliness / totalResources * 100))));
        console.log(`Optional score - Timeliness: ${timelinessScore}`);
      }
      
      if (assessmentDimensions.calculability) {
        calculabilityScore = Math.max(0, Math.min(100, Math.round(100 - (dimensions.calculability / totalResources * 100))));
        console.log(`Optional score - Calculability: ${calculabilityScore}`);
      }
      
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
      
      const finalQualityScore = Math.round(qualityScore);
      console.log(`Final quality score: ${finalQualityScore}`);
      
      return {
        qualityScore: finalQualityScore,
        completenessScore,
        conformityScore,
        plausibilityScore,
        timelinessScore,
        calculabilityScore
      };
    } catch (error) {
      console.error(`Error calculating quality scores:`, error);
      // Return default scores in case of error
      return {
        qualityScore: 70, // Default moderate score
        completenessScore: 70,
        conformityScore: 70,
        plausibilityScore: 70
      };
    }
  }

  /**
   * Summarize issues for storage
   */
  private summarizeIssues(results: ValidationResult[], resourceType: string): any[] {
    try {
      console.log(`Starting to summarize issues for ${results.length} ${resourceType} validation results`);
      
      // Safety check for empty results
      if (!results || results.length === 0) {
        console.log(`No results to summarize for ${resourceType}`);
        return [];
      }
      
      // Group similar issues
      const issueGroups: { [key: string]: any } = {};
      let issueCount = 0;
      
      for (const result of results) {
        // Skip invalid results
        if (!result || !Array.isArray(result.issues)) {
          console.log(`Skipping invalid result for ${resourceType}`);
          continue;
        }
        
        for (const issue of result.issues) {
          // Skip invalid issues
          if (!issue || !issue.severity || !issue.code) {
            console.log(`Skipping invalid issue in ${resourceType}`);
            continue;
          }
          
          // Create a key for grouping similar issues
          const key = `${issue.severity}|${issue.code}|${issue.dimension || 'unknown'}|${issue.diagnostics || 'No description'}`;
          
          if (!issueGroups[key]) {
            issueGroups[key] = {
              severity: issue.severity,
              code: issue.code,
              diagnostics: issue.diagnostics || 'No description',
              dimension: issue.dimension || 'unknown',
              count: 0,
              examples: []
            };
          }
          
          issueGroups[key].count++;
          issueCount++;
          
          // Store a few examples
          if (issueGroups[key].examples.length < 5) {
            issueGroups[key].examples.push({
              resourceId: result.resourceId || 'unknown',
              location: issue.location || issue.expression || ['unknown']
            });
          }
        }
      }
      
      console.log(`Found ${issueCount} total issues grouped into ${Object.keys(issueGroups).length} categories for ${resourceType}`);
      
      // Convert to array and sort by count
      const summarized = Object.values(issueGroups)
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
      
      console.log(`Successfully summarized ${summarized.length} issue groups for ${resourceType}`);
      return summarized;
    } catch (error) {
      console.error(`Error summarizing issues for ${resourceType}:`, error);
      // Return empty array instead of failing
      return [{
        id: 1,
        resourceType,
        severity: 'error',
        code: 'processing-error',
        description: `Error summarizing issues: ${error instanceof Error ? error.message : String(error)}`,
        dimension: 'unknown',
        count: 1,
        examples: []
      }];
    }
  }
}

export const assessmentService = new AssessmentService();
