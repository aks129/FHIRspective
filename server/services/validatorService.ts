/**
 * Service for validating FHIR resources against standards
 */

import { fhirService } from "./fhirService.js";
import { FhirServer } from "@shared/schema";

// Using FhirServer type as ServerConnection
type ServerConnection = FhirServer;

export interface ValidationResult {
  resourceType: string;
  resourceId: string;
  valid: boolean;
  issues: ValidationIssue[];
  fixedIssues?: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'information';
  code: string;
  diagnostics: string;
  location?: string[];
  expression?: string[];
  dimension: string;
  fixable: boolean;
  fixed?: boolean;
}

class ValidatorService {
  /**
   * Validate resources using the specified validator
   */
  async validateResources(
    connection: ServerConnection,
    resourceType: string,
    resources: any[],
    validator: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    console.log(`Starting validation of ${resources.length} ${resourceType} resources using ${validator} validator`);
    
    try {
      // Choose the appropriate validation method based on the validator type
      let results: ValidationResult[];
      
      switch (validator) {
        case 'inferno':
          results = await this.validateWithInferno(connection, resources, resourceType, implementationGuide);
          break;
        case 'hapi':
          results = await this.validateWithHapi(connection, resources, resourceType, implementationGuide);
          break;
        case 'custom':
          results = await this.validateWithCustomRules(resources, resourceType, implementationGuide);
          break;
        default:
          console.error(`Unsupported validator: ${validator}, using custom rules instead`);
          results = await this.validateWithCustomRules(resources, resourceType, implementationGuide);
      }
      
      console.log(`Completed validation of ${results.length} ${resourceType} resources`);
      return results;
    } catch (error) {
      console.error(`Error during validation of ${resourceType} resources:`, error);
      // Return empty results to prevent the entire assessment from failing
      return resources.map(resource => ({
        resourceType: resource.resourceType || resourceType,
        resourceId: resource.id || 'unknown',
        valid: false,
        issues: [{
          severity: 'error',
          code: 'processing-error',
          diagnostics: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          dimension: 'conformity',
          fixable: false
        }]
      }));
    }
  }

  /**
   * Validate resources using Inferno validator
   * Uses server-side $validate if available, falls back to local validation
   */
  private async validateWithInferno(
    connection: ServerConnection,
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    console.log(`Attempting Inferno/server-side validation for ${resources.length} ${resourceType} resources`);
    const results: ValidationResult[] = [];

    for (const resource of resources) {
      try {
        // Try server-side validation first (Inferno-compatible servers support $validate)
        const serverResult = await fhirService.validateResource(connection, resource);

        if (serverResult.issues.length > 0) {
          // Server returned validation issues
          const issues: ValidationIssue[] = serverResult.issues.map((issue: any) => ({
            severity: issue.severity || 'error',
            code: issue.code || 'unknown',
            diagnostics: issue.diagnostics || 'Unknown issue',
            location: issue.location,
            expression: issue.expression,
            dimension: issue.dimension || 'conformity',
            fixable: false
          }));

          results.push({
            resourceType: resource.resourceType || resourceType,
            resourceId: resource.id || 'unknown',
            valid: serverResult.success,
            issues
          });
        } else {
          // Server validation passed or not supported, enhance with local validation
          const localResults = await this.performLocalValidation([resource], resourceType, implementationGuide);
          results.push(...localResults);
        }
      } catch (error) {
        console.log(`Server validation failed for ${resource.id}, falling back to local validation`);
        // Fall back to local validation on error
        const localResults = await this.performLocalValidation([resource], resourceType, implementationGuide);
        results.push(...localResults);
      }
    }

    return results;
  }

  /**
   * Validate resources using server-side $validate operation
   * Falls back to local validation if server doesn't support it
   */
  private async validateWithHapi(
    connection: ServerConnection,
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    console.log(`Attempting server-side validation for ${resources.length} ${resourceType} resources`);
    const results: ValidationResult[] = [];

    for (const resource of resources) {
      try {
        // Try server-side validation first
        const serverResult = await fhirService.validateResource(connection, resource);

        if (serverResult.issues.length > 0) {
          // Server returned validation issues
          const issues: ValidationIssue[] = serverResult.issues.map((issue: any) => ({
            severity: issue.severity || 'error',
            code: issue.code || 'unknown',
            diagnostics: issue.diagnostics || 'Unknown issue',
            location: issue.location,
            expression: issue.expression,
            dimension: issue.dimension || 'conformity',
            fixable: false
          }));

          results.push({
            resourceType: resource.resourceType || resourceType,
            resourceId: resource.id || 'unknown',
            valid: serverResult.success,
            issues
          });
        } else {
          // Server validation passed or not supported, fall back to local
          const localResults = await this.performLocalValidation([resource], resourceType, implementationGuide);
          results.push(...localResults);
        }
      } catch (error) {
        console.log(`Server validation failed for ${resource.id}, falling back to local validation`);
        // Fall back to local validation on error
        const localResults = await this.performLocalValidation([resource], resourceType, implementationGuide);
        results.push(...localResults);
      }
    }

    return results;
  }

  /**
   * Validate resources using custom validation rules
   */
  private async validateWithCustomRules(
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    return this.performLocalValidation(resources, resourceType, implementationGuide);
  }

  /**
   * Perform local validation on resources
   * This implements basic validation logic for common issues in FHIR resources
   */
  private async performLocalValidation(
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    console.log(`Performing local validation on ${resources.length} ${resourceType} resources`);
    const results: ValidationResult[] = [];

    try {
      for (let i = 0; i < resources.length; i++) {
        try {
          const resource = resources[i];
          console.log(`Validating ${resourceType} resource ${i+1}/${resources.length}, id: ${resource.id || 'unknown'}`);
          
          const issues: ValidationIssue[] = [];
          const fixedIssues: ValidationIssue[] = [];

          // Validate resource type
          if (resource.resourceType !== resourceType) {
            issues.push({
              severity: 'error',
              code: 'invalid-resource-type',
              diagnostics: `Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`,
              dimension: 'conformity',
              fixable: false
            });
          }

      // Check for required fields based on resource type
      switch (resourceType) {
        case 'Patient':
          this.validatePatientResource(resource, issues, fixedIssues);
          break;
        case 'Encounter':
          this.validateEncounterResource(resource, issues, fixedIssues);
          break;
        case 'Observation':
          this.validateObservationResource(resource, issues, fixedIssues);
          break;
        case 'Condition':
          this.validateConditionResource(resource, issues, fixedIssues);
          break;
        case 'MedicationRequest':
          this.validateMedicationRequestResource(resource, issues, fixedIssues);
          break;
        case 'Procedure':
          this.validateProcedureResource(resource, issues, fixedIssues);
          break;
        case 'AllergyIntolerance':
          this.validateAllergyIntoleranceResource(resource, issues, fixedIssues);
          break;
        case 'Immunization':
          this.validateImmunizationResource(resource, issues, fixedIssues);
          break;
        case 'DiagnosticReport':
          this.validateDiagnosticReportResource(resource, issues, fixedIssues);
          break;
        case 'CarePlan':
          this.validateCarePlanResource(resource, issues, fixedIssues);
          break;
        case 'Goal':
          this.validateGoalResource(resource, issues, fixedIssues);
          break;
      }

      // Add implementation guide specific validation
      if (implementationGuide !== 'none') {
        this.validateAgainstImplementationGuide(resource, resourceType, implementationGuide, issues, fixedIssues);
      }

      results.push({
        resourceType: resource.resourceType,
        resourceId: resource.id || 'unknown',
        valid: issues.length === 0,
        issues,
        fixedIssues: fixedIssues.length > 0 ? fixedIssues : undefined
      });
        } catch (resourceError) {
          console.error(`Error validating individual resource:`, resourceError);
          // Add the resource with an error
          results.push({
            resourceType: resourceType,
            resourceId: resources[i]?.id || 'unknown',
            valid: false,
            issues: [{
              severity: 'error',
              code: 'processing-error',
              diagnostics: `Resource validation failed: ${resourceError instanceof Error ? resourceError.message : String(resourceError)}`,
              dimension: 'conformity',
              fixable: false
            }]
          });
        }
      }
      
      console.log(`Completed local validation of ${results.length} ${resourceType} resources`);
      return results;
    } catch (error) {
      console.error(`Fatal error during local validation of ${resourceType} resources:`, error);
      // Return basic results to prevent the entire assessment from failing
      return [{
        resourceType: resourceType,
        resourceId: 'unknown',
        valid: false,
        issues: [{
          severity: 'error',
          code: 'processing-error',
          diagnostics: `Validation process failed: ${error instanceof Error ? error.message : String(error)}`,
          dimension: 'conformity',
          fixable: false
        }]
      }];
    }
  }

  /**
   * Validate Patient resources
   */
  private validatePatientResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for required identifier
    if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Patient resource must have at least one identifier',
        expression: ['Patient.identifier'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for name
    if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Patient resource must have at least one name',
        expression: ['Patient.name'],
        dimension: 'completeness',
        fixable: false
      });
    } else {
      // Check for name components
      const hasValidName = resource.name.some((name: any) => 
        (name.given && Array.isArray(name.given) && name.given.length > 0) || 
        (name.family && typeof name.family === 'string' && name.family.trim() !== '')
      );

      if (!hasValidName) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'Patient name should have at least one given name or family name',
          expression: ['Patient.name.given', 'Patient.name.family'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // Check for gender
    if (!resource.gender) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Patient resource should have a gender specified',
        expression: ['Patient.gender'],
        dimension: 'completeness',
        fixable: false
      });
    } else if (!['male', 'female', 'other', 'unknown'].includes(resource.gender)) {
      issues.push({
        severity: 'error',
        code: 'value',
        diagnostics: `Invalid gender value: ${resource.gender}. Must be one of: male, female, other, unknown`,
        expression: ['Patient.gender'],
        dimension: 'conformity',
        fixable: true,
        fixed: false
      });

      // Add to fixed issues with a default value
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: `Fixed invalid gender value: ${resource.gender} → unknown`,
        expression: ['Patient.gender'],
        dimension: 'conformity',
        fixable: true,
        fixed: true
      });
    }

    // Check birth date for plausibility
    if (resource.birthDate) {
      const birthDate = new Date(resource.birthDate);
      const today = new Date();
      
      // Check for future dates
      if (birthDate > today) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: 'Birth date cannot be in the future',
          expression: ['Patient.birthDate'],
          dimension: 'plausibility',
          fixable: false
        });
      }
      
      // Check for very old dates
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 130) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: `Implausible age: ${age} years old`,
          expression: ['Patient.birthDate'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }
  }

  /**
   * Validate Encounter resources
   */
  private validateEncounterResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Validate status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Encounter resource must have a status',
        expression: ['Encounter.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });

      // Add to fixed issues with a default value
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['Encounter.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      // Validate status value
      const validStatuses = ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'entered-in-error', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['Encounter.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });

        // Add to fixed issues with a default value
        fixedIssues.push({
          severity: 'information',
          code: 'fixed',
          diagnostics: `Fixed invalid status value: ${resource.status} → unknown`,
          expression: ['Encounter.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: true
        });
      }
    }

    // Validate class - required field
    if (!resource.class) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Encounter resource must have a class',
        expression: ['Encounter.class'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Encounter resource must have a subject reference',
        expression: ['Encounter.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check dates for plausibility
    if (resource.period) {
      const today = new Date();
      
      // Check start date
      if (resource.period.start) {
        const startDate = new Date(resource.period.start);
        
        // Future start date (allow for planned encounters)
        if (startDate > today && resource.status !== 'planned') {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'Start date is in the future but encounter is not planned',
            expression: ['Encounter.period.start'],
            dimension: 'plausibility',
            fixable: false
          });
        }
      }
      
      // Check end date
      if (resource.period.end) {
        const endDate = new Date(resource.period.end);
        
        // Future end date
        if (endDate > today && ['finished', 'cancelled', 'entered-in-error'].includes(resource.status)) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'End date is in the future but encounter is marked as complete',
            expression: ['Encounter.period.end'],
            dimension: 'plausibility',
            fixable: false
          });
        }
        
        // End date before start date
        if (resource.period.start && new Date(resource.period.start) > endDate) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'End date is before start date',
            expression: ['Encounter.period'],
            dimension: 'plausibility',
            fixable: false
          });
        }
      }
    }
  }

  /**
   * Validate Observation resources
   */
  private validateObservationResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Validate status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Observation resource must have a status',
        expression: ['Observation.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });

      // Add to fixed issues with a default value
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['Observation.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      // Validate status value
      const validStatuses = ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['Observation.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });

        // Add to fixed issues with a default value
        fixedIssues.push({
          severity: 'information',
          code: 'fixed',
          diagnostics: `Fixed invalid status value: ${resource.status} → unknown`,
          expression: ['Observation.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: true
        });
      }
    }

    // Check for code
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Observation resource must have a code',
        expression: ['Observation.code'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Observation resource must have a subject reference',
        expression: ['Observation.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for value or component or dataAbsentReason
    if (!resource.valueQuantity && !resource.valueCodeableConcept && !resource.valueString && 
        !resource.valueBoolean && !resource.valueInteger && !resource.valueRange && 
        !resource.valueRatio && !resource.valueSampledData && !resource.valueTime && 
        !resource.valueDateTime && !resource.valuePeriod && !resource.component && 
        !resource.dataAbsentReason) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Observation must have a value, component, or dataAbsentReason',
        expression: ['Observation'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check effective date for plausibility
    if (resource.effectiveDateTime) {
      const effectiveDate = new Date(resource.effectiveDateTime);
      const today = new Date();
      
      // Check for future dates
      if (effectiveDate > today) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: 'Effective date is in the future',
          expression: ['Observation.effectiveDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }

    // Check value quantity for plausibility if present
    if (resource.valueQuantity && resource.valueQuantity.value !== undefined) {
      const value = resource.valueQuantity.value;
      
      // Check if the value makes sense based on common units
      if (resource.valueQuantity.unit) {
        const unit = resource.valueQuantity.unit.toLowerCase();
        
        // Blood pressure (systolic)
        if ((unit === 'mmhg' || unit === 'mm[hg]') && resource.code && 
            this.isBloodPressureSystolicCode(resource.code)) {
          if (value < 40 || value > 300) {
            issues.push({
              severity: 'warning',
              code: 'value',
              diagnostics: `Implausible systolic blood pressure value: ${value} ${unit}`,
              expression: ['Observation.valueQuantity'],
              dimension: 'plausibility',
              fixable: false
            });
          }
        }
        
        // Body temperature
        if ((unit === 'c' || unit === 'cel' || unit === '°c' || unit.includes('celsius')) && 
            resource.code && this.isTemperatureCode(resource.code)) {
          if (value < 30 || value > 45) {
            issues.push({
              severity: 'warning',
              code: 'value',
              diagnostics: `Implausible body temperature value: ${value} ${unit}`,
              expression: ['Observation.valueQuantity'],
              dimension: 'plausibility',
              fixable: false
            });
          }
        }
      }
    }
  }

  /**
   * Validate Condition resources
   */
  private validateConditionResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for code
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Condition resource must have a code',
        expression: ['Condition.code'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Condition resource must have a subject reference',
        expression: ['Condition.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check clinical status if provided
    if (resource.clinicalStatus) {
      // Validate clinical status coding
      if (!resource.clinicalStatus.coding || !Array.isArray(resource.clinicalStatus.coding) || 
          resource.clinicalStatus.coding.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'Condition.clinicalStatus must have at least one coding',
          expression: ['Condition.clinicalStatus.coding'],
          dimension: 'completeness',
          fixable: false
        });
      } else {
        // Check coding values
        const hasValidCoding = resource.clinicalStatus.coding.some((coding: any) => 
          coding.system === 'http://terminology.hl7.org/CodeSystem/condition-clinical' && 
          ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'].includes(coding.code)
        );

        if (!hasValidCoding) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'Condition.clinicalStatus must contain a valid code from the condition-clinical code system',
            expression: ['Condition.clinicalStatus.coding'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    } else {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Condition should have a clinicalStatus',
        expression: ['Condition.clinicalStatus'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check verification status if provided
    if (resource.verificationStatus) {
      // Validate verification status coding
      if (!resource.verificationStatus.coding || !Array.isArray(resource.verificationStatus.coding) || 
          resource.verificationStatus.coding.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'Condition.verificationStatus must have at least one coding',
          expression: ['Condition.verificationStatus.coding'],
          dimension: 'completeness',
          fixable: false
        });
      } else {
        // Check coding values
        const hasValidCoding = resource.verificationStatus.coding.some((coding: any) => 
          coding.system === 'http://terminology.hl7.org/CodeSystem/condition-ver-status' && 
          ['unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered-in-error'].includes(coding.code)
        );

        if (!hasValidCoding) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'Condition.verificationStatus must contain a valid code from the condition-ver-status code system',
            expression: ['Condition.verificationStatus.coding'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // Check onset date for plausibility if provided
    if (resource.onsetDateTime) {
      const onsetDate = new Date(resource.onsetDateTime);
      const today = new Date();
      
      // Check for future dates
      if (onsetDate > today) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: 'Onset date is in the future',
          expression: ['Condition.onsetDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }
  }

  /**
   * Validate MedicationRequest resources
   */
  private validateMedicationRequestResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for status
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'MedicationRequest resource must have a status',
        expression: ['MedicationRequest.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });

      // Add to fixed issues with a default value
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['MedicationRequest.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      // Validate status value
      const validStatuses = ['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['MedicationRequest.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });

        // Add to fixed issues with a default value
        fixedIssues.push({
          severity: 'information',
          code: 'fixed',
          diagnostics: `Fixed invalid status value: ${resource.status} → unknown`,
          expression: ['MedicationRequest.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: true
        });
      }
    }

    // Check for intent
    if (!resource.intent) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'MedicationRequest resource must have an intent',
        expression: ['MedicationRequest.intent'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });

      // Add to fixed issues with a default value
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default intent: order',
        expression: ['MedicationRequest.intent'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      // Validate intent value
      const validIntents = ['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option'];
      if (!validIntents.includes(resource.intent)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid intent value: ${resource.intent}. Must be one of: ${validIntents.join(', ')}`,
          expression: ['MedicationRequest.intent'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });

        // Add to fixed issues with a default value
        fixedIssues.push({
          severity: 'information',
          code: 'fixed',
          diagnostics: `Fixed invalid intent value: ${resource.intent} → order`,
          expression: ['MedicationRequest.intent'],
          dimension: 'conformity',
          fixable: true,
          fixed: true
        });
      }
    }

    // Check for medication
    if (!resource.medicationCodeableConcept && !resource.medicationReference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'MedicationRequest resource must have a medication (CodeableConcept or Reference)',
        expression: ['MedicationRequest.medication[x]'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'MedicationRequest resource must have a subject reference',
        expression: ['MedicationRequest.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for authoredOn date plausibility if provided
    if (resource.authoredOn) {
      const authoredDate = new Date(resource.authoredOn);
      const today = new Date();
      
      // Check for future dates
      if (authoredDate > today) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: 'Authored date is in the future',
          expression: ['MedicationRequest.authoredOn'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }

    // Check dosage instructions if present
    if (resource.dosageInstruction && Array.isArray(resource.dosageInstruction)) {
      for (let i = 0; i < resource.dosageInstruction.length; i++) {
        const dosage = resource.dosageInstruction[i];
        
        // Check for dose
        if (dosage.doseAndRate && Array.isArray(dosage.doseAndRate)) {
          for (let j = 0; j < dosage.doseAndRate.length; j++) {
            const doseRate = dosage.doseAndRate[j];
            
            // Check dose quantity
            if (doseRate.doseQuantity && typeof doseRate.doseQuantity.value === 'number') {
              if (doseRate.doseQuantity.value <= 0) {
                issues.push({
                  severity: 'error',
                  code: 'value',
                  diagnostics: 'Dose quantity must be positive',
                  expression: [`MedicationRequest.dosageInstruction[${i}].doseAndRate[${j}].doseQuantity.value`],
                  dimension: 'plausibility',
                  fixable: false
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Validate Procedure resources
   */
  private validateProcedureResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Procedure resource must have a status',
        expression: ['Procedure.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['Procedure.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validStatuses = ['preparation', 'in-progress', 'not-done', 'on-hold', 'stopped', 'completed', 'entered-in-error', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['Procedure.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for code - required field
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Procedure resource must have a code',
        expression: ['Procedure.code'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference - required field
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Procedure resource must have a subject reference',
        expression: ['Procedure.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check performed date for plausibility
    if (resource.performedDateTime) {
      const performedDate = new Date(resource.performedDateTime);
      const today = new Date();

      if (performedDate > today && resource.status === 'completed') {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: 'Performed date is in the future but procedure is marked as completed',
          expression: ['Procedure.performedDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }

    // Check for performer if status is completed
    if (resource.status === 'completed' && (!resource.performer || resource.performer.length === 0)) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Completed procedure should have a performer',
        expression: ['Procedure.performer'],
        dimension: 'completeness',
        fixable: false
      });
    }
  }

  /**
   * Validate AllergyIntolerance resources
   */
  private validateAllergyIntoleranceResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for clinicalStatus
    if (resource.clinicalStatus) {
      if (!resource.clinicalStatus.coding || !Array.isArray(resource.clinicalStatus.coding) || resource.clinicalStatus.coding.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'AllergyIntolerance.clinicalStatus must have at least one coding',
          expression: ['AllergyIntolerance.clinicalStatus.coding'],
          dimension: 'completeness',
          fixable: false
        });
      } else {
        const validCodes = ['active', 'inactive', 'resolved'];
        const hasValidCode = resource.clinicalStatus.coding.some((coding: any) =>
          coding.system === 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical' &&
          validCodes.includes(coding.code)
        );
        if (!hasValidCode) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'AllergyIntolerance.clinicalStatus must contain a valid code',
            expression: ['AllergyIntolerance.clinicalStatus.coding'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // Check for verificationStatus
    if (resource.verificationStatus) {
      const validCodes = ['unconfirmed', 'confirmed', 'refuted', 'entered-in-error'];
      if (resource.verificationStatus.coding) {
        const hasValidCode = resource.verificationStatus.coding.some((coding: any) =>
          coding.system === 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification' &&
          validCodes.includes(coding.code)
        );
        if (!hasValidCode) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'AllergyIntolerance.verificationStatus must contain a valid code',
            expression: ['AllergyIntolerance.verificationStatus.coding'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // Check for code (allergen)
    if (!resource.code) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'AllergyIntolerance should have a code identifying the allergen',
        expression: ['AllergyIntolerance.code'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for patient reference - required field
    if (!resource.patient || !resource.patient.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'AllergyIntolerance resource must have a patient reference',
        expression: ['AllergyIntolerance.patient'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check category is valid if present
    if (resource.category && Array.isArray(resource.category)) {
      const validCategories = ['food', 'medication', 'environment', 'biologic'];
      for (const cat of resource.category) {
        if (!validCategories.includes(cat)) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: `Invalid category value: ${cat}. Must be one of: ${validCategories.join(', ')}`,
            expression: ['AllergyIntolerance.category'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // Check criticality is valid if present
    if (resource.criticality) {
      const validCriticality = ['low', 'high', 'unable-to-assess'];
      if (!validCriticality.includes(resource.criticality)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid criticality value: ${resource.criticality}. Must be one of: ${validCriticality.join(', ')}`,
          expression: ['AllergyIntolerance.criticality'],
          dimension: 'conformity',
          fixable: false
        });
      }
    }

    // Check onset date plausibility
    if (resource.onsetDateTime) {
      const onsetDate = new Date(resource.onsetDateTime);
      const today = new Date();
      if (onsetDate > today) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: 'Onset date is in the future',
          expression: ['AllergyIntolerance.onsetDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }
  }

  /**
   * Validate Immunization resources
   */
  private validateImmunizationResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Immunization resource must have a status',
        expression: ['Immunization.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: completed',
        expression: ['Immunization.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validStatuses = ['completed', 'entered-in-error', 'not-done'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['Immunization.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for vaccineCode - required field
    if (!resource.vaccineCode) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Immunization resource must have a vaccineCode',
        expression: ['Immunization.vaccineCode'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for patient reference - required field
    if (!resource.patient || !resource.patient.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Immunization resource must have a patient reference',
        expression: ['Immunization.patient'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for occurrenceDateTime or occurrenceString - required field
    if (!resource.occurrenceDateTime && !resource.occurrenceString) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Immunization resource must have an occurrence date/time',
        expression: ['Immunization.occurrence[x]'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check occurrence date plausibility
    if (resource.occurrenceDateTime) {
      const occurrenceDate = new Date(resource.occurrenceDateTime);
      const today = new Date();

      if (occurrenceDate > today && resource.status === 'completed') {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: 'Occurrence date is in the future but immunization is marked as completed',
          expression: ['Immunization.occurrenceDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }

      // Check for implausibly old dates (before 1900)
      if (occurrenceDate.getFullYear() < 1900) {
        issues.push({
          severity: 'warning',
          code: 'value',
          diagnostics: 'Occurrence date is implausibly old',
          expression: ['Immunization.occurrenceDateTime'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }

    // Check for statusReason if status is not-done
    if (resource.status === 'not-done' && !resource.statusReason) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Immunization with status not-done should have a statusReason',
        expression: ['Immunization.statusReason'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for lotNumber for completed immunizations
    if (resource.status === 'completed' && !resource.lotNumber) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Completed immunization should have a lot number',
        expression: ['Immunization.lotNumber'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for expirationDate plausibility
    if (resource.expirationDate) {
      const expirationDate = new Date(resource.expirationDate);
      if (resource.occurrenceDateTime) {
        const occurrenceDate = new Date(resource.occurrenceDateTime);
        if (expirationDate < occurrenceDate) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'Vaccine expiration date is before the occurrence date',
            expression: ['Immunization.expirationDate'],
            dimension: 'plausibility',
            fixable: false
          });
        }
      }
    }
  }

  /**
   * Validate DiagnosticReport resources
   */
  private validateDiagnosticReportResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'DiagnosticReport resource must have a status',
        expression: ['DiagnosticReport.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['DiagnosticReport.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validStatuses = ['registered', 'partial', 'preliminary', 'final', 'amended', 'corrected', 'appended', 'cancelled', 'entered-in-error', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['DiagnosticReport.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for code - required field
    if (!resource.code) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'DiagnosticReport resource must have a code',
        expression: ['DiagnosticReport.code'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'DiagnosticReport should have a subject reference',
        expression: ['DiagnosticReport.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for issued date - timeliness validation
    if (resource.issued) {
      const issuedDate = new Date(resource.issued);
      const today = new Date();

      if (issuedDate > today) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: 'Issued date is in the future',
          expression: ['DiagnosticReport.issued'],
          dimension: 'timeliness',
          fixable: false
        });
      }

      // Check if report is too old (more than 30 days from effective date)
      if (resource.effectiveDateTime) {
        const effectiveDate = new Date(resource.effectiveDateTime);
        const daysDiff = (issuedDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'Report issued more than 30 days after effective date',
            expression: ['DiagnosticReport.issued'],
            dimension: 'timeliness',
            fixable: false
          });
        }
      }
    }

    // Check for results reference if status is final
    if ((resource.status === 'final' || resource.status === 'amended' || resource.status === 'corrected') &&
        (!resource.result || resource.result.length === 0) &&
        (!resource.presentedForm || resource.presentedForm.length === 0) &&
        !resource.conclusion) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Final DiagnosticReport should have results, presented form, or conclusion',
        expression: ['DiagnosticReport.result'],
        dimension: 'completeness',
        fixable: false
      });
    }
  }

  /**
   * Validate CarePlan resources
   */
  private validateCarePlanResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for status - required field
    if (!resource.status) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'CarePlan resource must have a status',
        expression: ['CarePlan.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default status: unknown',
        expression: ['CarePlan.status'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validStatuses = ['draft', 'active', 'on-hold', 'revoked', 'completed', 'entered-in-error', 'unknown'];
      if (!validStatuses.includes(resource.status)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid status value: ${resource.status}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['CarePlan.status'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for intent - required field
    if (!resource.intent) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'CarePlan resource must have an intent',
        expression: ['CarePlan.intent'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default intent: plan',
        expression: ['CarePlan.intent'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validIntents = ['proposal', 'plan', 'order', 'option'];
      if (!validIntents.includes(resource.intent)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid intent value: ${resource.intent}. Must be one of: ${validIntents.join(', ')}`,
          expression: ['CarePlan.intent'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for subject reference - required field
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'CarePlan resource must have a subject reference',
        expression: ['CarePlan.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check period dates for plausibility
    if (resource.period) {
      const today = new Date();

      if (resource.period.start) {
        const startDate = new Date(resource.period.start);
        if (resource.status === 'completed' && startDate > today) {
          issues.push({
            severity: 'error',
            code: 'value',
            diagnostics: 'Completed CarePlan has a future start date',
            expression: ['CarePlan.period.start'],
            dimension: 'plausibility',
            fixable: false
          });
        }
      }

      if (resource.period.end) {
        const endDate = new Date(resource.period.end);
        if (resource.status === 'active' && endDate < today) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'Active CarePlan has an end date in the past',
            expression: ['CarePlan.period.end'],
            dimension: 'timeliness',
            fixable: false
          });
        }
      }
    }

    // Check for category - recommended
    if (!resource.category || resource.category.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'CarePlan should have at least one category',
        expression: ['CarePlan.category'],
        dimension: 'completeness',
        fixable: false
      });
    }
  }

  /**
   * Validate Goal resources
   */
  private validateGoalResource(resource: any, issues: ValidationIssue[], fixedIssues: ValidationIssue[]): void {
    // Check for lifecycleStatus - required field
    if (!resource.lifecycleStatus) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Goal resource must have a lifecycleStatus',
        expression: ['Goal.lifecycleStatus'],
        dimension: 'completeness',
        fixable: true,
        fixed: false
      });
      fixedIssues.push({
        severity: 'information',
        code: 'fixed',
        diagnostics: 'Added default lifecycleStatus: active',
        expression: ['Goal.lifecycleStatus'],
        dimension: 'completeness',
        fixable: true,
        fixed: true
      });
    } else {
      const validStatuses = ['proposed', 'planned', 'accepted', 'active', 'on-hold', 'completed', 'cancelled', 'entered-in-error', 'rejected'];
      if (!validStatuses.includes(resource.lifecycleStatus)) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: `Invalid lifecycleStatus value: ${resource.lifecycleStatus}. Must be one of: ${validStatuses.join(', ')}`,
          expression: ['Goal.lifecycleStatus'],
          dimension: 'conformity',
          fixable: true,
          fixed: false
        });
      }
    }

    // Check for description - required field
    if (!resource.description) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Goal resource must have a description',
        expression: ['Goal.description'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check for subject reference - required field
    if (!resource.subject || !resource.subject.reference) {
      issues.push({
        severity: 'error',
        code: 'required',
        diagnostics: 'Goal resource must have a subject reference',
        expression: ['Goal.subject'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check achievement status if status is completed
    if (resource.lifecycleStatus === 'completed' && !resource.achievementStatus) {
      issues.push({
        severity: 'warning',
        code: 'required',
        diagnostics: 'Completed Goal should have an achievementStatus',
        expression: ['Goal.achievementStatus'],
        dimension: 'completeness',
        fixable: false
      });
    }

    // Check target date plausibility
    if (resource.target && Array.isArray(resource.target)) {
      const today = new Date();
      for (let i = 0; i < resource.target.length; i++) {
        const target = resource.target[i];
        if (target.dueDate) {
          const dueDate = new Date(target.dueDate);
          if (resource.lifecycleStatus === 'completed' && dueDate > today) {
            issues.push({
              severity: 'warning',
              code: 'value',
              diagnostics: 'Completed Goal has a future target due date',
              expression: [`Goal.target[${i}].dueDate`],
              dimension: 'plausibility',
              fixable: false
            });
          }
        }
      }
    }

    // Check start date plausibility
    if (resource.startDate) {
      const startDate = new Date(resource.startDate);
      const today = new Date();

      if (resource.lifecycleStatus === 'completed' && startDate > today) {
        issues.push({
          severity: 'error',
          code: 'value',
          diagnostics: 'Completed Goal has a future start date',
          expression: ['Goal.startDate'],
          dimension: 'plausibility',
          fixable: false
        });
      }
    }
  }

  /**
   * Apply validation rules specific to the selected Implementation Guide
   */
  private validateAgainstImplementationGuide(
    resource: any,
    resourceType: string,
    implementationGuide: string,
    issues: ValidationIssue[],
    fixedIssues: ValidationIssue[]
  ): void {
    switch (implementationGuide) {
      case 'uscore':
        this.validateAgainstUSCore(resource, resourceType, issues, fixedIssues);
        break;
      case 'carinbb':
        this.validateAgainstCARINBB(resource, resourceType, issues, fixedIssues);
        break;
      case 'davinci':
        this.validateAgainstDaVinci(resource, resourceType, issues, fixedIssues);
        break;
    }
  }

  /**
   * Validate against US Core Implementation Guide
   */
  private validateAgainstUSCore(
    resource: any, 
    resourceType: string, 
    issues: ValidationIssue[],
    fixedIssues: ValidationIssue[]
  ): void {
    // US Core Patient specific validation
    if (resourceType === 'Patient') {
      // US Core requires race, ethnicity, and birthsex extensions
      const hasRaceExt = this.hasExtension(resource, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race');
      const hasEthnicityExt = this.hasExtension(resource, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity');
      const hasBirthSexExt = this.hasExtension(resource, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex');
      
      if (!hasRaceExt) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Patient should have race extension',
          expression: ['Patient.extension'],
          dimension: 'completeness',
          fixable: false
        });
      }
      
      if (!hasEthnicityExt) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Patient should have ethnicity extension',
          expression: ['Patient.extension'],
          dimension: 'completeness',
          fixable: false
        });
      }
      
      if (!hasBirthSexExt) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Patient should have birthsex extension',
          expression: ['Patient.extension'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }
    
    // US Core Observation specific validation
    if (resourceType === 'Observation') {
      // Check for category
      if (!resource.category || !Array.isArray(resource.category) || resource.category.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Observation should have a category',
          expression: ['Observation.category'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core Condition specific validation
    if (resourceType === 'Condition') {
      // US Core requires category
      if (!resource.category || !Array.isArray(resource.category) || resource.category.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Condition should have a category',
          expression: ['Condition.category'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // US Core requires code
      if (!resource.code || !resource.code.coding || resource.code.coding.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'US Core Condition must have a code with at least one coding',
          expression: ['Condition.code'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core Procedure specific validation
    if (resourceType === 'Procedure') {
      // US Core requires code from specific value sets
      if (resource.code && resource.code.coding) {
        const hasUSCoreCode = resource.code.coding.some((coding: any) =>
          coding.system === 'http://www.ama-assn.org/go/cpt' ||
          coding.system === 'http://snomed.info/sct' ||
          coding.system === 'http://www.cms.gov/Medicare/Coding/ICD10' ||
          coding.system === 'http://hl7.org/fhir/sid/icd-10-cm'
        );
        if (!hasUSCoreCode) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'US Core Procedure code should be from CPT, SNOMED CT, or ICD-10',
            expression: ['Procedure.code'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // US Core MedicationRequest specific validation
    if (resourceType === 'MedicationRequest') {
      // Check for reportedBoolean or reportedReference
      if (resource.reportedBoolean === undefined && !resource.reportedReference) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core MedicationRequest should indicate if it was reported',
          expression: ['MedicationRequest.reported[x]'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for encounter reference (preferred)
      if (!resource.encounter) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core MedicationRequest should have an encounter reference',
          expression: ['MedicationRequest.encounter'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for requester
      if (!resource.requester) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core MedicationRequest should have a requester',
          expression: ['MedicationRequest.requester'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core Immunization specific validation
    if (resourceType === 'Immunization') {
      // Check for CVX vaccine code
      if (resource.vaccineCode && resource.vaccineCode.coding) {
        const hasCVXCode = resource.vaccineCode.coding.some((coding: any) =>
          coding.system === 'http://hl7.org/fhir/sid/cvx'
        );
        if (!hasCVXCode) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'US Core Immunization vaccineCode should include a CVX code',
            expression: ['Immunization.vaccineCode'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }

      // Check for primarySource
      if (resource.primarySource === undefined) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Immunization should indicate primarySource',
          expression: ['Immunization.primarySource'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core AllergyIntolerance specific validation
    if (resourceType === 'AllergyIntolerance') {
      // Check for code from required binding
      if (resource.code && resource.code.coding) {
        const hasValidCode = resource.code.coding.some((coding: any) =>
          coding.system === 'http://snomed.info/sct' ||
          coding.system === 'http://www.nlm.nih.gov/research/umls/rxnorm' ||
          coding.system === 'http://fdasis.nlm.nih.gov'
        );
        if (!hasValidCode) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'US Core AllergyIntolerance code should be from SNOMED CT, RxNorm, or UNII',
            expression: ['AllergyIntolerance.code'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }

      // Reaction must have manifestation
      if (resource.reaction && Array.isArray(resource.reaction)) {
        for (let i = 0; i < resource.reaction.length; i++) {
          const reaction = resource.reaction[i];
          if (!reaction.manifestation || reaction.manifestation.length === 0) {
            issues.push({
              severity: 'error',
              code: 'required',
              diagnostics: 'US Core AllergyIntolerance reaction must have manifestation',
              expression: [`AllergyIntolerance.reaction[${i}].manifestation`],
              dimension: 'completeness',
              fixable: false
            });
          }
        }
      }
    }

    // US Core Encounter specific validation
    if (resourceType === 'Encounter') {
      // Check for type
      if (!resource.type || !Array.isArray(resource.type) || resource.type.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Encounter should have a type',
          expression: ['Encounter.type'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for location
      if (!resource.location || resource.location.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Encounter should have at least one location',
          expression: ['Encounter.location'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core DiagnosticReport specific validation
    if (resourceType === 'DiagnosticReport') {
      // Check for category
      if (!resource.category || !Array.isArray(resource.category) || resource.category.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core DiagnosticReport should have a category',
          expression: ['DiagnosticReport.category'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for performer
      if (!resource.performer || resource.performer.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core DiagnosticReport should have a performer',
          expression: ['DiagnosticReport.performer'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for effective date/period
      if (!resource.effectiveDateTime && !resource.effectivePeriod) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core DiagnosticReport should have an effective date or period',
          expression: ['DiagnosticReport.effective[x]'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }

    // US Core CarePlan specific validation
    if (resourceType === 'CarePlan') {
      // Check for text narrative
      if (!resource.text || !resource.text.div) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core CarePlan should have a text narrative',
          expression: ['CarePlan.text'],
          dimension: 'completeness',
          fixable: false
        });
      }

      // Check for category (assessment-and-plan)
      if (resource.category && Array.isArray(resource.category)) {
        const hasUSCoreCategory = resource.category.some((cat: any) =>
          cat.coding && cat.coding.some((coding: any) =>
            coding.system === 'http://hl7.org/fhir/us/core/CodeSystem/careplan-category' &&
            coding.code === 'assess-plan'
          )
        );
        if (!hasUSCoreCategory) {
          issues.push({
            severity: 'warning',
            code: 'value',
            diagnostics: 'US Core CarePlan should have category assess-plan',
            expression: ['CarePlan.category'],
            dimension: 'conformity',
            fixable: false
          });
        }
      }
    }

    // US Core Goal specific validation
    if (resourceType === 'Goal') {
      // Check for target
      if (!resource.target || resource.target.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'US Core Goal should have at least one target',
          expression: ['Goal.target'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }
  }

  /**
   * Validate against CARIN Blue Button Implementation Guide
   */
  private validateAgainstCARINBB(
    resource: any, 
    resourceType: string, 
    issues: ValidationIssue[],
    fixedIssues: ValidationIssue[]
  ): void {
    // CARIN BB EOB specific validation
    if (resourceType === 'ExplanationOfBenefit') {
      // Check for required elements in CARIN BB
      if (!resource.provider || !resource.provider.reference) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'CARIN BB ExplanationOfBenefit must have a provider reference',
          expression: ['ExplanationOfBenefit.provider'],
          dimension: 'completeness',
          fixable: false
        });
      }
      
      if (!resource.insurance || !Array.isArray(resource.insurance) || resource.insurance.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'CARIN BB ExplanationOfBenefit must have insurance',
          expression: ['ExplanationOfBenefit.insurance'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }
    
    // CARIN BB Coverage specific validation  
    if (resourceType === 'Coverage') {
      // Check for required elements in CARIN BB
      if (!resource.type || !resource.type.coding || !Array.isArray(resource.type.coding) || resource.type.coding.length === 0) {
        issues.push({
          severity: 'error',
          code: 'required',
          diagnostics: 'CARIN BB Coverage must have a type with coding',
          expression: ['Coverage.type'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }
  }

  /**
   * Validate against Da Vinci Implementation Guide
   */
  private validateAgainstDaVinci(
    resource: any, 
    resourceType: string, 
    issues: ValidationIssue[],
    fixedIssues: ValidationIssue[]
  ): void {
    // Da Vinci specific validation
    // This would implement specific Da Vinci IG requirements
    // For demonstration, we'll add a basic check
    
    if (resourceType === 'ClaimResponse' || resourceType === 'Claim') {
      const hasPayerExt = this.hasExtension(resource, 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-priorAuthorizationNumber');
      
      if (!hasPayerExt) {
        issues.push({
          severity: 'warning',
          code: 'required',
          diagnostics: 'Da Vinci resources should have prior authorization number extension',
          expression: ['ClaimResponse.extension', 'Claim.extension'],
          dimension: 'completeness',
          fixable: false
        });
      }
    }
  }

  /**
   * Helper method to check if resource has a specific extension
   */
  private hasExtension(resource: any, url: string): boolean {
    if (!resource.extension || !Array.isArray(resource.extension)) {
      return false;
    }
    
    return resource.extension.some((ext: any) => ext.url === url);
  }

  /**
   * Helper method to check if a code is for blood pressure systolic
   */
  private isBloodPressureSystolicCode(code: any): boolean {
    if (!code.coding || !Array.isArray(code.coding)) {
      return false;
    }
    
    // LOINC code for systolic blood pressure
    return code.coding.some((coding: any) => 
      (coding.system === 'http://loinc.org' && coding.code === '8480-6') ||
      (coding.system === 'http://snomed.info/sct' && coding.code === '271649006')
    );
  }

  /**
   * Helper method to check if a code is for body temperature
   */
  private isTemperatureCode(code: any): boolean {
    if (!code.coding || !Array.isArray(code.coding)) {
      return false;
    }
    
    // LOINC code for body temperature
    return code.coding.some((coding: any) => 
      (coding.system === 'http://loinc.org' && coding.code === '8310-5') ||
      (coding.system === 'http://snomed.info/sct' && coding.code === '386725007')
    );
  }
}

export const validatorService = new ValidatorService();
