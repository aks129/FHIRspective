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
          results = await this.validateWithInferno(resources, resourceType, implementationGuide);
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
   * This is a simplified version for demo purposes
   */
  private async validateWithInferno(
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    // In a real implementation, this would call the Inferno API
    return this.performLocalValidation(resources, resourceType, implementationGuide);
  }

  /**
   * Validate resources using HAPI FHIR Validator
   * This is a simplified version for demo purposes
   */
  private async validateWithHapi(
    connection: ServerConnection,
    resources: any[],
    resourceType: string,
    implementationGuide: string
  ): Promise<ValidationResult[]> {
    // In a real implementation, this would call the HAPI FHIR Validator API
    return this.performLocalValidation(resources, resourceType, implementationGuide);
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
        // Additional resource types can be added here
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
