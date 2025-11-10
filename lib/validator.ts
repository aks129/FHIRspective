/**
 * Simple FHIR Resource Validator
 * Validates basic FHIR structure and required fields
 */

import type { FHIRResource } from './fhir-client';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  resourceId: string;
  resourceType: string;
  valid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
}

/**
 * Validate a FHIR resource
 */
export function validateResource(resource: FHIRResource): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Basic structure validation
  if (!resource.resourceType) {
    issues.push({
      severity: 'error',
      code: 'missing-resource-type',
      message: 'Resource must have a resourceType'
    });
  }

  // Resource-specific validation
  switch (resource.resourceType) {
    case 'Patient':
      validatePatient(resource, issues);
      break;
    case 'Observation':
      validateObservation(resource, issues);
      break;
    case 'Condition':
      validateCondition(resource, issues);
      break;
    case 'Encounter':
      validateEncounter(resource, issues);
      break;
    case 'MedicationRequest':
      validateMedicationRequest(resource, issues);
      break;
    default:
      // Basic validation for any resource
      validateBasicResource(resource, issues);
  }

  // Calculate score: start at 100, deduct points for issues
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 10) - (warningCount * 5));

  return {
    resourceId: resource.id || 'unknown',
    resourceType: resource.resourceType || 'Unknown',
    valid: errorCount === 0,
    issues,
    score
  };
}

/**
 * Validate Patient resource
 */
function validatePatient(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for identifier
  if (!resource.identifier || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
    issues.push({
      severity: 'error',
      code: 'patient-missing-identifier',
      message: 'Patient must have at least one identifier',
      path: 'Patient.identifier'
    });
  }

  // Check for name
  if (!resource.name || !Array.isArray(resource.name) || resource.name.length === 0) {
    issues.push({
      severity: 'error',
      code: 'patient-missing-name',
      message: 'Patient must have at least one name',
      path: 'Patient.name'
    });
  }

  // Check for gender
  if (!resource.gender) {
    issues.push({
      severity: 'warning',
      code: 'patient-missing-gender',
      message: 'Patient should have a gender specified',
      path: 'Patient.gender'
    });
  } else if (!['male', 'female', 'other', 'unknown'].includes(resource.gender)) {
    issues.push({
      severity: 'error',
      code: 'patient-invalid-gender',
      message: `Invalid gender value: ${resource.gender}`,
      path: 'Patient.gender'
    });
  }

  // Check birth date plausibility
  if (resource.birthDate) {
    const birthDate = new Date(resource.birthDate);
    const today = new Date();

    if (birthDate > today) {
      issues.push({
        severity: 'error',
        code: 'patient-future-birthdate',
        message: 'Birth date cannot be in the future',
        path: 'Patient.birthDate'
      });
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    if (age > 130) {
      issues.push({
        severity: 'warning',
        code: 'patient-implausible-age',
        message: `Implausible age: ${age} years`,
        path: 'Patient.birthDate'
      });
    }
  }
}

/**
 * Validate Observation resource
 */
function validateObservation(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for status
  if (!resource.status) {
    issues.push({
      severity: 'error',
      code: 'observation-missing-status',
      message: 'Observation must have a status',
      path: 'Observation.status'
    });
  }

  // Check for code
  if (!resource.code) {
    issues.push({
      severity: 'error',
      code: 'observation-missing-code',
      message: 'Observation must have a code',
      path: 'Observation.code'
    });
  }

  // Check for subject
  if (!resource.subject || !resource.subject.reference) {
    issues.push({
      severity: 'error',
      code: 'observation-missing-subject',
      message: 'Observation must have a subject reference',
      path: 'Observation.subject'
    });
  }

  // Check for value or dataAbsentReason
  const hasValue = resource.valueQuantity || resource.valueCodeableConcept ||
                   resource.valueString || resource.valueBoolean ||
                   resource.component;

  if (!hasValue && !resource.dataAbsentReason) {
    issues.push({
      severity: 'error',
      code: 'observation-missing-value',
      message: 'Observation must have a value or dataAbsentReason',
      path: 'Observation.value[x]'
    });
  }
}

/**
 * Validate Condition resource
 */
function validateCondition(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for code
  if (!resource.code) {
    issues.push({
      severity: 'error',
      code: 'condition-missing-code',
      message: 'Condition must have a code',
      path: 'Condition.code'
    });
  }

  // Check for subject
  if (!resource.subject || !resource.subject.reference) {
    issues.push({
      severity: 'error',
      code: 'condition-missing-subject',
      message: 'Condition must have a subject reference',
      path: 'Condition.subject'
    });
  }

  // Check clinical status if provided
  if (resource.clinicalStatus && !resource.clinicalStatus.coding) {
    issues.push({
      severity: 'warning',
      code: 'condition-invalid-clinical-status',
      message: 'Condition.clinicalStatus should have coding',
      path: 'Condition.clinicalStatus.coding'
    });
  }
}

/**
 * Validate Encounter resource
 */
function validateEncounter(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for status
  if (!resource.status) {
    issues.push({
      severity: 'error',
      code: 'encounter-missing-status',
      message: 'Encounter must have a status',
      path: 'Encounter.status'
    });
  }

  // Check for class
  if (!resource.class) {
    issues.push({
      severity: 'error',
      code: 'encounter-missing-class',
      message: 'Encounter must have a class',
      path: 'Encounter.class'
    });
  }

  // Check for subject
  if (!resource.subject || !resource.subject.reference) {
    issues.push({
      severity: 'error',
      code: 'encounter-missing-subject',
      message: 'Encounter must have a subject reference',
      path: 'Encounter.subject'
    });
  }
}

/**
 * Validate MedicationRequest resource
 */
function validateMedicationRequest(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for status
  if (!resource.status) {
    issues.push({
      severity: 'error',
      code: 'medication-request-missing-status',
      message: 'MedicationRequest must have a status',
      path: 'MedicationRequest.status'
    });
  }

  // Check for intent
  if (!resource.intent) {
    issues.push({
      severity: 'error',
      code: 'medication-request-missing-intent',
      message: 'MedicationRequest must have an intent',
      path: 'MedicationRequest.intent'
    });
  }

  // Check for medication
  if (!resource.medicationCodeableConcept && !resource.medicationReference) {
    issues.push({
      severity: 'error',
      code: 'medication-request-missing-medication',
      message: 'MedicationRequest must have a medication',
      path: 'MedicationRequest.medication[x]'
    });
  }

  // Check for subject
  if (!resource.subject || !resource.subject.reference) {
    issues.push({
      severity: 'error',
      code: 'medication-request-missing-subject',
      message: 'MedicationRequest must have a subject reference',
      path: 'MedicationRequest.subject'
    });
  }
}

/**
 * Basic validation for any resource
 */
function validateBasicResource(resource: FHIRResource, issues: ValidationIssue[]): void {
  // Check for id
  if (!resource.id) {
    issues.push({
      severity: 'warning',
      code: 'resource-missing-id',
      message: 'Resource should have an id',
      path: `${resource.resourceType}.id`
    });
  }
}

/**
 * Calculate aggregate statistics from multiple validation results
 */
export function calculateStatistics(results: ValidationResult[]) {
  const totalResources = results.length;
  const validResources = results.filter(r => r.valid).length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalResources;

  const issuesByType = results.reduce((acc, r) => {
    r.issues.forEach(issue => {
      acc[issue.code] = (acc[issue.code] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  return {
    totalResources,
    validResources,
    invalidResources: totalResources - validResources,
    totalIssues,
    averageScore: Math.round(averageScore),
    issuesByType
  };
}
