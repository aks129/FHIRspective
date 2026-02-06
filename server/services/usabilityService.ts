/**
 * Healthcare Data Usability Scoring Service
 *
 * Implements best practices from:
 * - Sequoia Project Data Usability Workgroup
 * - Clinical Architecture PIQI Framework
 * - Kahn et al. Harmonized DQ Framework (Conformance, Completeness, Plausibility)
 * - ONC USCDI and TEFCA requirements
 *
 * Provides predictive usability scores for healthcare use cases:
 * - Quality Reporting and Measurement
 * - Population Health
 * - Prior Authorization
 * - Analytics Use Cases
 * - Drug Trials / Clinical Research
 * - Risk Adjustment
 */

import { ValidationResult, ValidationIssue } from "./validatorService.js";

// Healthcare use cases for usability scoring
export type UsabilityUseCase =
  | 'quality_reporting'
  | 'population_health'
  | 'prior_authorization'
  | 'analytics'
  | 'drug_trials'
  | 'risk_adjustment';

// Data quality dimensions based on Kahn et al. + extensions
export interface DataQualityDimensions {
  // Conformance: Does the data adhere to standards and formats?
  conformance: {
    value: number;      // Value conformance: data values match expected formats
    relational: number; // Relational conformance: references are valid
    computational: number; // Computational conformance: calculations are correct
  };
  // Completeness: Are required values present?
  completeness: {
    required: number;   // Required fields populated
    expected: number;   // Expected fields for use case
    enhanced: number;   // Enhanced data elements present
  };
  // Plausibility: Do values make sense?
  plausibility: {
    atemporal: number;  // Values within valid ranges
    temporal: number;   // Temporal consistency (dates make sense)
    uniqueness: number; // Uniqueness checks pass
  };
  // Timeliness: Is data current enough?
  timeliness: {
    currency: number;   // How recent is the data
    latency: number;    // Time from event to recording
  };
}

// Use case specific weights for scoring
export interface UseCaseWeights {
  conformance: number;
  completeness: number;
  plausibility: number;
  timeliness: number;
}

// Resource usability score result
export interface UsabilityScore {
  resourceType: string;
  resourceId: string;
  overallScore: number;           // 0-100 overall usability
  useCaseScores: Map<UsabilityUseCase, number>; // Per-use-case scores
  dimensions: DataQualityDimensions;
  recommendations: UsabilityRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Recommendation for improving usability
export interface UsabilityRecommendation {
  dimension: string;
  useCase: UsabilityUseCase;
  issue: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impactedUseCases: UsabilityUseCase[];
}

// Aggregate usability report
export interface UsabilityReport {
  assessmentId?: number;
  resourceType: string;
  resourceCount: number;
  averageOverallScore: number;
  useCaseReadiness: Map<UsabilityUseCase, UseCaseReadiness>;
  dimensionBreakdown: DimensionBreakdown;
  topIssues: UsabilityRecommendation[];
  preventionInsights: PreventionInsight[];
}

export interface UseCaseReadiness {
  useCase: UsabilityUseCase;
  readinessScore: number;         // 0-100
  readinessLevel: 'not_ready' | 'needs_improvement' | 'acceptable' | 'good' | 'excellent';
  blockers: string[];
  warnings: string[];
}

export interface DimensionBreakdown {
  conformance: { score: number; issues: number };
  completeness: { score: number; issues: number };
  plausibility: { score: number; issues: number };
  timeliness: { score: number; issues: number };
}

export interface PreventionInsight {
  pattern: string;
  frequency: number;
  affectedUseCases: UsabilityUseCase[];
  preventionAction: string;
  estimatedImpact: number;
}

// Use case weight configurations based on industry best practices
const USE_CASE_WEIGHTS: Record<UsabilityUseCase, UseCaseWeights> = {
  quality_reporting: {
    conformance: 0.30,    // High importance for measure calculation
    completeness: 0.35,   // Critical for numerator/denominator
    plausibility: 0.25,   // Must be clinically valid
    timeliness: 0.10     // Reporting periods matter
  },
  population_health: {
    conformance: 0.20,    // Moderate - aggregation tolerant
    completeness: 0.40,   // High - need comprehensive data
    plausibility: 0.25,   // Important for trends
    timeliness: 0.15     // Need recent data for interventions
  },
  prior_authorization: {
    conformance: 0.35,    // High - payer systems are strict
    completeness: 0.35,   // Critical for approval decisions
    plausibility: 0.20,   // Clinical validity important
    timeliness: 0.10     // Current status matters
  },
  analytics: {
    conformance: 0.25,    // Important for data pipelines
    completeness: 0.30,   // Need consistent fields
    plausibility: 0.30,   // Quality in, quality out
    timeliness: 0.15     // Depends on use case
  },
  drug_trials: {
    conformance: 0.35,    // FDA requirements are strict
    completeness: 0.30,   // Protocol compliance
    plausibility: 0.25,   // Data integrity critical
    timeliness: 0.10     // Visit windows matter
  },
  risk_adjustment: {
    conformance: 0.30,    // HCC coding accuracy
    completeness: 0.40,   // Diagnosis capture critical
    plausibility: 0.20,   // Clinical validity for RAF
    timeliness: 0.10     // Annual capture important
  }
};

// Resource-specific field requirements by use case
const RESOURCE_USE_CASE_REQUIREMENTS: Record<string, Record<UsabilityUseCase, string[]>> = {
  Patient: {
    quality_reporting: ['identifier', 'birthDate', 'gender', 'name', 'address'],
    population_health: ['identifier', 'birthDate', 'gender', 'address', 'telecom'],
    prior_authorization: ['identifier', 'name', 'birthDate', 'gender', 'insurance'],
    analytics: ['identifier', 'birthDate', 'gender', 'address'],
    drug_trials: ['identifier', 'birthDate', 'gender', 'name', 'contact', 'generalPractitioner'],
    risk_adjustment: ['identifier', 'birthDate', 'gender', 'name']
  },
  Condition: {
    quality_reporting: ['code', 'subject', 'clinicalStatus', 'onsetDateTime', 'category'],
    population_health: ['code', 'subject', 'clinicalStatus', 'category'],
    prior_authorization: ['code', 'subject', 'clinicalStatus', 'onsetDateTime', 'evidence'],
    analytics: ['code', 'subject', 'clinicalStatus', 'recordedDate'],
    drug_trials: ['code', 'subject', 'clinicalStatus', 'verificationStatus', 'onsetDateTime', 'abatementDateTime'],
    risk_adjustment: ['code', 'subject', 'clinicalStatus', 'verificationStatus', 'recordedDate']
  },
  Observation: {
    quality_reporting: ['code', 'subject', 'status', 'effectiveDateTime', 'valueQuantity'],
    population_health: ['code', 'subject', 'status', 'effectiveDateTime', 'valueQuantity'],
    prior_authorization: ['code', 'subject', 'status', 'effectiveDateTime', 'valueQuantity'],
    analytics: ['code', 'subject', 'status', 'effectiveDateTime'],
    drug_trials: ['code', 'subject', 'status', 'effectiveDateTime', 'valueQuantity', 'performer', 'referenceRange'],
    risk_adjustment: ['code', 'subject', 'status', 'effectiveDateTime']
  },
  MedicationRequest: {
    quality_reporting: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn', 'dosageInstruction'],
    population_health: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn'],
    prior_authorization: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn', 'dosageInstruction', 'requester', 'reasonCode'],
    analytics: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn'],
    drug_trials: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn', 'dosageInstruction', 'dispenseRequest'],
    risk_adjustment: ['medicationCodeableConcept', 'subject', 'status', 'authoredOn']
  },
  Encounter: {
    quality_reporting: ['subject', 'status', 'class', 'type', 'period', 'diagnosis'],
    population_health: ['subject', 'status', 'class', 'type', 'period', 'serviceProvider'],
    prior_authorization: ['subject', 'status', 'class', 'type', 'period', 'diagnosis', 'hospitalization'],
    analytics: ['subject', 'status', 'class', 'type', 'period'],
    drug_trials: ['subject', 'status', 'class', 'type', 'period', 'participant'],
    risk_adjustment: ['subject', 'status', 'class', 'type', 'period', 'diagnosis']
  },
  Procedure: {
    quality_reporting: ['code', 'subject', 'status', 'performedDateTime', 'encounter'],
    population_health: ['code', 'subject', 'status', 'performedDateTime'],
    prior_authorization: ['code', 'subject', 'status', 'performedDateTime', 'reasonCode', 'bodySite'],
    analytics: ['code', 'subject', 'status', 'performedDateTime'],
    drug_trials: ['code', 'subject', 'status', 'performedDateTime', 'performer', 'outcome'],
    risk_adjustment: ['code', 'subject', 'status', 'performedDateTime']
  },
  DiagnosticReport: {
    quality_reporting: ['code', 'subject', 'status', 'effectiveDateTime', 'result'],
    population_health: ['code', 'subject', 'status', 'effectiveDateTime', 'result'],
    prior_authorization: ['code', 'subject', 'status', 'effectiveDateTime', 'result', 'conclusion'],
    analytics: ['code', 'subject', 'status', 'effectiveDateTime'],
    drug_trials: ['code', 'subject', 'status', 'effectiveDateTime', 'result', 'performer', 'issued'],
    risk_adjustment: ['code', 'subject', 'status', 'effectiveDateTime', 'result']
  },
  Immunization: {
    quality_reporting: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime'],
    population_health: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime', 'lotNumber'],
    prior_authorization: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime'],
    analytics: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime'],
    drug_trials: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime', 'lotNumber', 'expirationDate', 'manufacturer'],
    risk_adjustment: ['vaccineCode', 'patient', 'status', 'occurrenceDateTime']
  },
  AllergyIntolerance: {
    quality_reporting: ['code', 'patient', 'clinicalStatus'],
    population_health: ['code', 'patient', 'clinicalStatus', 'category'],
    prior_authorization: ['code', 'patient', 'clinicalStatus', 'criticality', 'reaction'],
    analytics: ['code', 'patient', 'clinicalStatus'],
    drug_trials: ['code', 'patient', 'clinicalStatus', 'verificationStatus', 'reaction', 'criticality'],
    risk_adjustment: ['code', 'patient', 'clinicalStatus']
  },
  CarePlan: {
    quality_reporting: ['status', 'intent', 'subject', 'category', 'activity'],
    population_health: ['status', 'intent', 'subject', 'category', 'goal'],
    prior_authorization: ['status', 'intent', 'subject', 'category', 'activity', 'period'],
    analytics: ['status', 'intent', 'subject', 'category'],
    drug_trials: ['status', 'intent', 'subject', 'category', 'activity', 'careTeam'],
    risk_adjustment: ['status', 'intent', 'subject', 'category']
  },
  Goal: {
    quality_reporting: ['lifecycleStatus', 'subject', 'description', 'target'],
    population_health: ['lifecycleStatus', 'subject', 'description', 'category'],
    prior_authorization: ['lifecycleStatus', 'subject', 'description', 'target'],
    analytics: ['lifecycleStatus', 'subject', 'description'],
    drug_trials: ['lifecycleStatus', 'subject', 'description', 'target', 'achievementStatus'],
    risk_adjustment: ['lifecycleStatus', 'subject', 'description']
  }
};

class UsabilityService {
  /**
   * Calculate usability score for a single resource
   */
  calculateResourceUsability(
    resource: any,
    validationResult: ValidationResult
  ): UsabilityScore {
    const resourceType = resource.resourceType;
    const resourceId = resource.id || 'unknown';

    // Calculate dimension scores
    const dimensions = this.calculateDimensions(resource, validationResult);

    // Calculate per-use-case scores
    const useCaseScores = new Map<UsabilityUseCase, number>();
    const useCases: UsabilityUseCase[] = [
      'quality_reporting', 'population_health', 'prior_authorization',
      'analytics', 'drug_trials', 'risk_adjustment'
    ];

    for (const useCase of useCases) {
      const score = this.calculateUseCaseScore(resource, dimensions, useCase);
      useCaseScores.set(useCase, score);
    }

    // Calculate overall score (average across use cases)
    const overallScore = Array.from(useCaseScores.values()).reduce((a, b) => a + b, 0) / useCaseScores.size;

    // Generate recommendations
    const recommendations = this.generateRecommendations(resource, dimensions, validationResult);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(overallScore, recommendations);

    return {
      resourceType,
      resourceId,
      overallScore: Math.round(overallScore * 100) / 100,
      useCaseScores,
      dimensions,
      recommendations,
      riskLevel
    };
  }

  /**
   * Calculate data quality dimensions for a resource
   */
  private calculateDimensions(resource: any, validationResult: ValidationResult): DataQualityDimensions {
    const issues = validationResult.issues;

    // Conformance scoring
    const conformanceIssues = issues.filter(i => i.dimension === 'conformity');
    const conformanceScore = this.calculateDimensionScore(conformanceIssues);

    // Completeness scoring
    const completenessIssues = issues.filter(i => i.dimension === 'completeness');
    const completenessScore = this.calculateDimensionScore(completenessIssues);

    // Plausibility scoring
    const plausibilityIssues = issues.filter(i => i.dimension === 'plausibility');
    const plausibilityScore = this.calculateDimensionScore(plausibilityIssues);

    // Timeliness scoring
    const timelinessIssues = issues.filter(i => i.dimension === 'timeliness');
    const timelinessScore = this.calculateTimelinessScore(resource, timelinessIssues);

    return {
      conformance: {
        value: this.calculateValueConformance(resource, conformanceIssues),
        relational: this.calculateRelationalConformance(resource),
        computational: conformanceScore
      },
      completeness: {
        required: this.calculateRequiredCompleteness(resource),
        expected: this.calculateExpectedCompleteness(resource),
        enhanced: this.calculateEnhancedCompleteness(resource)
      },
      plausibility: {
        atemporal: this.calculateAtemporalPlausibility(resource, plausibilityIssues),
        temporal: this.calculateTemporalPlausibility(resource),
        uniqueness: this.calculateUniqueness(resource)
      },
      timeliness: {
        currency: timelinessScore,
        latency: this.calculateLatency(resource)
      }
    };
  }

  /**
   * Calculate use case specific score
   */
  private calculateUseCaseScore(
    resource: any,
    dimensions: DataQualityDimensions,
    useCase: UsabilityUseCase
  ): number {
    const weights = USE_CASE_WEIGHTS[useCase];
    const resourceType = resource.resourceType;

    // Calculate weighted dimension scores
    const conformanceScore = (dimensions.conformance.value + dimensions.conformance.relational + dimensions.conformance.computational) / 3;
    const completenessScore = (dimensions.completeness.required + dimensions.completeness.expected + dimensions.completeness.enhanced) / 3;
    const plausibilityScore = (dimensions.plausibility.atemporal + dimensions.plausibility.temporal + dimensions.plausibility.uniqueness) / 3;
    const timelinessScore = (dimensions.timeliness.currency + dimensions.timeliness.latency) / 2;

    let baseScore = (
      conformanceScore * weights.conformance +
      completenessScore * weights.completeness +
      plausibilityScore * weights.plausibility +
      timelinessScore * weights.timeliness
    );

    // Apply use case specific adjustments
    const useCaseAdjustment = this.calculateUseCaseAdjustment(resource, useCase);
    baseScore = baseScore * useCaseAdjustment;

    // Check use case specific field requirements
    const requirements = RESOURCE_USE_CASE_REQUIREMENTS[resourceType]?.[useCase] || [];
    const requiredFieldScore = this.calculateRequiredFieldScore(resource, requirements);

    // Blend base score with required field score
    return (baseScore * 0.7) + (requiredFieldScore * 30);
  }

  /**
   * Calculate dimension score from issues
   */
  private calculateDimensionScore(issues: ValidationIssue[]): number {
    if (issues.length === 0) return 100;

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'information').length;

    // Weight: errors = -20, warnings = -10, info = -5
    const penalty = (errorCount * 20) + (warningCount * 10) + (infoCount * 5);
    return Math.max(0, 100 - penalty);
  }

  /**
   * Calculate value conformance score
   */
  private calculateValueConformance(resource: any, issues: ValidationIssue[]): number {
    const valueIssues = issues.filter(i => i.code === 'value');
    return this.calculateDimensionScore(valueIssues);
  }

  /**
   * Calculate relational conformance (reference validity)
   */
  private calculateRelationalConformance(resource: any): number {
    let score = 100;
    const refs = this.extractReferences(resource);

    for (const ref of refs) {
      if (!ref.reference) {
        score -= 10;
      } else if (!ref.reference.includes('/')) {
        score -= 5; // Local reference without type
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate required completeness score
   */
  private calculateRequiredCompleteness(resource: any): number {
    const resourceType = resource.resourceType;
    const requiredFields = this.getRequiredFields(resourceType);

    if (requiredFields.length === 0) return 100;

    let presentCount = 0;
    for (const field of requiredFields) {
      if (this.hasField(resource, field)) {
        presentCount++;
      }
    }

    return (presentCount / requiredFields.length) * 100;
  }

  /**
   * Calculate expected completeness score
   */
  private calculateExpectedCompleteness(resource: any): number {
    const resourceType = resource.resourceType;
    const expectedFields = this.getExpectedFields(resourceType);

    if (expectedFields.length === 0) return 100;

    let presentCount = 0;
    for (const field of expectedFields) {
      if (this.hasField(resource, field)) {
        presentCount++;
      }
    }

    return (presentCount / expectedFields.length) * 100;
  }

  /**
   * Calculate enhanced completeness score
   */
  private calculateEnhancedCompleteness(resource: any): number {
    const resourceType = resource.resourceType;
    const enhancedFields = this.getEnhancedFields(resourceType);

    if (enhancedFields.length === 0) return 100;

    let presentCount = 0;
    for (const field of enhancedFields) {
      if (this.hasField(resource, field)) {
        presentCount++;
      }
    }

    return (presentCount / enhancedFields.length) * 100;
  }

  /**
   * Calculate atemporal plausibility score
   */
  private calculateAtemporalPlausibility(resource: any, issues: ValidationIssue[]): number {
    const plausibilityIssues = issues.filter(i =>
      !i.expression?.some(e => e.toLowerCase().includes('date') || e.toLowerCase().includes('time'))
    );
    return this.calculateDimensionScore(plausibilityIssues);
  }

  /**
   * Calculate temporal plausibility score
   */
  private calculateTemporalPlausibility(resource: any): number {
    let score = 100;
    const now = new Date();

    // Check various date fields for plausibility
    const dateFields = ['effectiveDateTime', 'authoredOn', 'recordedDate', 'onsetDateTime',
                        'occurrenceDateTime', 'performedDateTime', 'issued'];

    for (const field of dateFields) {
      if (resource[field]) {
        const date = new Date(resource[field]);

        // Future dates reduce score
        if (date > now) {
          score -= 15;
        }

        // Very old dates reduce score (before 1900)
        if (date.getFullYear() < 1900) {
          score -= 10;
        }
      }
    }

    // Check period consistency
    if (resource.period) {
      if (resource.period.start && resource.period.end) {
        const start = new Date(resource.period.start);
        const end = new Date(resource.period.end);
        if (end < start) {
          score -= 20;
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate uniqueness score
   */
  private calculateUniqueness(resource: any): number {
    let score = 100;

    // Check for identifier presence and uniqueness indicators
    if (!resource.identifier || resource.identifier.length === 0) {
      score -= 20;
    } else {
      // Check for system identifiers
      const hasSystemId = resource.identifier.some((id: any) => id.system && id.value);
      if (!hasSystemId) {
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate timeliness score
   */
  private calculateTimelinessScore(resource: any, issues: ValidationIssue[]): number {
    let score = this.calculateDimensionScore(issues);

    // Check for data currency
    const recordedDate = resource.recordedDate || resource.authoredOn || resource.issued || resource.meta?.lastUpdated;
    if (recordedDate) {
      const date = new Date(recordedDate);
      const now = new Date();
      const daysSinceRecord = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      // Reduce score for old data
      if (daysSinceRecord > 365) {
        score -= 20;
      } else if (daysSinceRecord > 180) {
        score -= 10;
      } else if (daysSinceRecord > 90) {
        score -= 5;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate latency score
   */
  private calculateLatency(resource: any): number {
    let score = 100;

    // Check effective date vs recorded date
    const effectiveDate = resource.effectiveDateTime || resource.performedDateTime || resource.occurrenceDateTime;
    const recordedDate = resource.recordedDate || resource.issued || resource.meta?.lastUpdated;

    if (effectiveDate && recordedDate) {
      const effective = new Date(effectiveDate);
      const recorded = new Date(recordedDate);
      const daysDiff = (recorded.getTime() - effective.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 30) {
        score -= 20;
      } else if (daysDiff > 14) {
        score -= 10;
      } else if (daysDiff > 7) {
        score -= 5;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate use case specific adjustment
   */
  private calculateUseCaseAdjustment(resource: any, useCase: UsabilityUseCase): number {
    let adjustment = 1.0;

    switch (useCase) {
      case 'quality_reporting':
        // Require specific coding systems for quality measures
        if (this.hasStandardCoding(resource)) {
          adjustment += 0.05;
        }
        break;

      case 'risk_adjustment':
        // HCC coding requires specific ICD-10 codes
        if (resource.resourceType === 'Condition' && this.hasICD10Coding(resource)) {
          adjustment += 0.10;
        }
        break;

      case 'prior_authorization':
        // Prior auth needs supporting documentation
        if (resource.evidence || resource.supportingInfo || resource.reasonCode) {
          adjustment += 0.05;
        }
        break;

      case 'drug_trials':
        // Clinical trials need detailed provenance
        if (resource.meta?.source || resource.meta?.profile) {
          adjustment += 0.05;
        }
        break;

      case 'population_health':
        // Population health benefits from structured demographics
        if (resource.resourceType === 'Patient' && resource.address && resource.telecom) {
          adjustment += 0.05;
        }
        break;
    }

    return adjustment;
  }

  /**
   * Calculate required field score for use case
   */
  private calculateRequiredFieldScore(resource: any, requirements: string[]): number {
    if (requirements.length === 0) return 100;

    let presentCount = 0;
    for (const field of requirements) {
      if (this.hasField(resource, field)) {
        presentCount++;
      }
    }

    return (presentCount / requirements.length) * 100;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    resource: any,
    dimensions: DataQualityDimensions,
    validationResult: ValidationResult
  ): UsabilityRecommendation[] {
    const recommendations: UsabilityRecommendation[] = [];
    const resourceType = resource.resourceType;

    // Conformance recommendations
    if (dimensions.conformance.value < 80) {
      recommendations.push({
        dimension: 'conformance.value',
        useCase: 'quality_reporting',
        issue: 'Invalid or non-standard values detected',
        recommendation: 'Review and correct data values to conform to FHIR value sets and code systems',
        priority: dimensions.conformance.value < 60 ? 'high' : 'medium',
        impactedUseCases: ['quality_reporting', 'prior_authorization', 'risk_adjustment']
      });
    }

    if (dimensions.conformance.relational < 80) {
      recommendations.push({
        dimension: 'conformance.relational',
        useCase: 'analytics',
        issue: 'Missing or invalid resource references',
        recommendation: 'Ensure all references include proper resource type and valid identifiers',
        priority: 'medium',
        impactedUseCases: ['analytics', 'population_health']
      });
    }

    // Completeness recommendations
    if (dimensions.completeness.required < 90) {
      recommendations.push({
        dimension: 'completeness.required',
        useCase: 'quality_reporting',
        issue: 'Required fields are missing',
        recommendation: 'Populate all required FHIR elements to ensure resource validity',
        priority: 'critical',
        impactedUseCases: ['quality_reporting', 'prior_authorization', 'drug_trials', 'risk_adjustment']
      });
    }

    // Plausibility recommendations
    if (dimensions.plausibility.temporal < 80) {
      recommendations.push({
        dimension: 'plausibility.temporal',
        useCase: 'drug_trials',
        issue: 'Date/time values may be inconsistent or implausible',
        recommendation: 'Review and correct date fields to ensure temporal consistency',
        priority: 'high',
        impactedUseCases: ['drug_trials', 'quality_reporting', 'analytics']
      });
    }

    // Timeliness recommendations
    if (dimensions.timeliness.currency < 70) {
      recommendations.push({
        dimension: 'timeliness.currency',
        useCase: 'population_health',
        issue: 'Data may be outdated',
        recommendation: 'Refresh data to ensure currency for population health interventions',
        priority: 'medium',
        impactedUseCases: ['population_health', 'prior_authorization']
      });
    }

    if (dimensions.timeliness.latency < 70) {
      recommendations.push({
        dimension: 'timeliness.latency',
        useCase: 'quality_reporting',
        issue: 'Significant delay between clinical event and data recording',
        recommendation: 'Improve data capture workflows to reduce recording latency',
        priority: 'medium',
        impactedUseCases: ['quality_reporting', 'drug_trials']
      });
    }

    // Use case specific recommendations
    if (resourceType === 'Patient') {
      const hasRaceExt = resource.extension?.some((e: any) =>
        e.url?.includes('us-core-race')
      );
      const hasEthnicityExt = resource.extension?.some((e: any) =>
        e.url?.includes('us-core-ethnicity')
      );

      if (!hasRaceExt || !hasEthnicityExt) {
        recommendations.push({
          dimension: 'completeness.enhanced',
          useCase: 'population_health',
          issue: 'Missing US Core demographic extensions',
          recommendation: 'Add race and ethnicity extensions to support health equity analysis',
          priority: 'medium',
          impactedUseCases: ['population_health', 'quality_reporting', 'analytics']
        });
      }
    }

    if (resourceType === 'Condition') {
      if (!this.hasICD10Coding(resource)) {
        recommendations.push({
          dimension: 'conformance.value',
          useCase: 'risk_adjustment',
          issue: 'Missing ICD-10 coding for condition',
          recommendation: 'Add ICD-10-CM coding to enable HCC risk adjustment calculations',
          priority: 'high',
          impactedUseCases: ['risk_adjustment', 'prior_authorization']
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate risk level from score and recommendations
   */
  private calculateRiskLevel(score: number, recommendations: UsabilityRecommendation[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const highCount = recommendations.filter(r => r.priority === 'high').length;

    if (criticalCount > 0 || score < 40) return 'critical';
    if (highCount > 2 || score < 60) return 'high';
    if (highCount > 0 || score < 80) return 'medium';
    return 'low';
  }

  /**
   * Generate aggregate usability report for resource set
   */
  generateUsabilityReport(
    resources: any[],
    validationResults: ValidationResult[],
    assessmentId?: number
  ): UsabilityReport {
    if (resources.length === 0) {
      return this.createEmptyReport(assessmentId);
    }

    const resourceType = resources[0].resourceType;
    const scores: UsabilityScore[] = [];

    // Calculate individual scores
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const validation = validationResults.find(v => v.resourceId === resource.id) || {
        resourceType: resource.resourceType,
        resourceId: resource.id,
        valid: true,
        issues: []
      };
      scores.push(this.calculateResourceUsability(resource, validation));
    }

    // Calculate averages
    const averageOverallScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;

    // Calculate use case readiness
    const useCaseReadiness = new Map<UsabilityUseCase, UseCaseReadiness>();
    const useCases: UsabilityUseCase[] = [
      'quality_reporting', 'population_health', 'prior_authorization',
      'analytics', 'drug_trials', 'risk_adjustment'
    ];

    for (const useCase of useCases) {
      const useCaseScores = scores.map(s => s.useCaseScores.get(useCase) || 0);
      const avgScore = useCaseScores.reduce((a, b) => a + b, 0) / useCaseScores.length;

      useCaseReadiness.set(useCase, {
        useCase,
        readinessScore: Math.round(avgScore * 100) / 100,
        readinessLevel: this.getReadinessLevel(avgScore),
        blockers: this.getBlockers(scores, useCase),
        warnings: this.getWarnings(scores, useCase)
      });
    }

    // Calculate dimension breakdown
    const dimensionBreakdown = this.calculateDimensionBreakdown(scores);

    // Get top issues across all resources
    const allRecommendations = scores.flatMap(s => s.recommendations);
    const topIssues = this.aggregateRecommendations(allRecommendations);

    // Generate prevention insights
    const preventionInsights = this.generatePreventionInsights(scores, validationResults);

    return {
      assessmentId,
      resourceType,
      resourceCount: resources.length,
      averageOverallScore: Math.round(averageOverallScore * 100) / 100,
      useCaseReadiness,
      dimensionBreakdown,
      topIssues,
      preventionInsights
    };
  }

  /**
   * Get readiness level from score
   */
  private getReadinessLevel(score: number): 'not_ready' | 'needs_improvement' | 'acceptable' | 'good' | 'excellent' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'acceptable';
    if (score >= 50) return 'needs_improvement';
    return 'not_ready';
  }

  /**
   * Get blockers for use case
   */
  private getBlockers(scores: UsabilityScore[], useCase: UsabilityUseCase): string[] {
    const blockers: Set<string> = new Set();

    for (const score of scores) {
      for (const rec of score.recommendations) {
        if (rec.priority === 'critical' && rec.impactedUseCases.includes(useCase)) {
          blockers.add(rec.issue);
        }
      }
    }

    return Array.from(blockers).slice(0, 5);
  }

  /**
   * Get warnings for use case
   */
  private getWarnings(scores: UsabilityScore[], useCase: UsabilityUseCase): string[] {
    const warnings: Set<string> = new Set();

    for (const score of scores) {
      for (const rec of score.recommendations) {
        if (rec.priority === 'high' && rec.impactedUseCases.includes(useCase)) {
          warnings.add(rec.issue);
        }
      }
    }

    return Array.from(warnings).slice(0, 5);
  }

  /**
   * Calculate dimension breakdown
   */
  private calculateDimensionBreakdown(scores: UsabilityScore[]): DimensionBreakdown {
    const conformanceScores = scores.map(s =>
      (s.dimensions.conformance.value + s.dimensions.conformance.relational + s.dimensions.conformance.computational) / 3
    );
    const completenessScores = scores.map(s =>
      (s.dimensions.completeness.required + s.dimensions.completeness.expected + s.dimensions.completeness.enhanced) / 3
    );
    const plausibilityScores = scores.map(s =>
      (s.dimensions.plausibility.atemporal + s.dimensions.plausibility.temporal + s.dimensions.plausibility.uniqueness) / 3
    );
    const timelinessScores = scores.map(s =>
      (s.dimensions.timeliness.currency + s.dimensions.timeliness.latency) / 2
    );

    return {
      conformance: {
        score: conformanceScores.reduce((a, b) => a + b, 0) / conformanceScores.length,
        issues: scores.flatMap(s => s.recommendations.filter(r => r.dimension.startsWith('conformance'))).length
      },
      completeness: {
        score: completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length,
        issues: scores.flatMap(s => s.recommendations.filter(r => r.dimension.startsWith('completeness'))).length
      },
      plausibility: {
        score: plausibilityScores.reduce((a, b) => a + b, 0) / plausibilityScores.length,
        issues: scores.flatMap(s => s.recommendations.filter(r => r.dimension.startsWith('plausibility'))).length
      },
      timeliness: {
        score: timelinessScores.reduce((a, b) => a + b, 0) / timelinessScores.length,
        issues: scores.flatMap(s => s.recommendations.filter(r => r.dimension.startsWith('timeliness'))).length
      }
    };
  }

  /**
   * Aggregate recommendations to find patterns
   */
  private aggregateRecommendations(recommendations: UsabilityRecommendation[]): UsabilityRecommendation[] {
    const grouped = new Map<string, { count: number; rec: UsabilityRecommendation }>();

    for (const rec of recommendations) {
      const key = `${rec.dimension}:${rec.issue}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count++;
      } else {
        grouped.set(key, { count: 1, rec });
      }
    }

    // Sort by count and priority
    const sorted = Array.from(grouped.values())
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.rec.priority] - priorityOrder[b.rec.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.count - a.count;
      });

    return sorted.slice(0, 10).map(s => s.rec);
  }

  /**
   * Generate prevention insights from patterns
   */
  private generatePreventionInsights(
    scores: UsabilityScore[],
    validationResults: ValidationResult[]
  ): PreventionInsight[] {
    const insights: PreventionInsight[] = [];
    const issuePatterns = new Map<string, { count: number; useCases: Set<UsabilityUseCase> }>();

    // Analyze validation issues
    for (const result of validationResults) {
      for (const issue of result.issues) {
        const key = `${issue.dimension}:${issue.code}`;
        const existing = issuePatterns.get(key);
        if (existing) {
          existing.count++;
        } else {
          issuePatterns.set(key, { count: 1, useCases: new Set() });
        }
      }
    }

    // Analyze recommendation patterns
    for (const score of scores) {
      for (const rec of score.recommendations) {
        const key = `${rec.dimension}:${rec.issue}`;
        const existing = issuePatterns.get(key);
        if (existing) {
          rec.impactedUseCases.forEach(uc => existing.useCases.add(uc));
        }
      }
    }

    // Generate prevention insights
    const sortedPatterns = Array.from(issuePatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    for (const [pattern, data] of sortedPatterns) {
      const [dimension, code] = pattern.split(':');
      insights.push({
        pattern: this.getPatternDescription(dimension, code),
        frequency: data.count,
        affectedUseCases: Array.from(data.useCases),
        preventionAction: this.getPreventionAction(dimension, code),
        estimatedImpact: Math.min(100, data.count * 10)
      });
    }

    return insights;
  }

  /**
   * Get pattern description for prevention insight
   */
  private getPatternDescription(dimension: string, code: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      conformity: {
        value: 'Invalid or non-standard data values',
        'invalid-resource-type': 'Mismatched resource types',
        default: 'Data format conformance issues'
      },
      completeness: {
        required: 'Missing required fields',
        default: 'Incomplete data elements'
      },
      plausibility: {
        value: 'Implausible clinical values',
        default: 'Data plausibility concerns'
      },
      timeliness: {
        default: 'Data currency issues'
      }
    };

    return descriptions[dimension]?.[code] || descriptions[dimension]?.default || 'Data quality issue detected';
  }

  /**
   * Get prevention action for pattern
   */
  private getPreventionAction(dimension: string, code: string): string {
    const actions: Record<string, Record<string, string>> = {
      conformity: {
        value: 'Implement value set validation at data entry points',
        'invalid-resource-type': 'Add resource type validation to data pipelines',
        default: 'Enforce FHIR conformance checks during data ingestion'
      },
      completeness: {
        required: 'Configure required field validation in source systems',
        default: 'Implement completeness rules at data capture'
      },
      plausibility: {
        value: 'Add clinical range validation rules',
        default: 'Implement plausibility checks with clinical rules engine'
      },
      timeliness: {
        default: 'Establish data freshness SLAs and monitoring'
      }
    };

    return actions[dimension]?.[code] || actions[dimension]?.default || 'Review and address data quality controls';
  }

  /**
   * Create empty report
   */
  private createEmptyReport(assessmentId?: number): UsabilityReport {
    return {
      assessmentId,
      resourceType: 'Unknown',
      resourceCount: 0,
      averageOverallScore: 0,
      useCaseReadiness: new Map(),
      dimensionBreakdown: {
        conformance: { score: 0, issues: 0 },
        completeness: { score: 0, issues: 0 },
        plausibility: { score: 0, issues: 0 },
        timeliness: { score: 0, issues: 0 }
      },
      topIssues: [],
      preventionInsights: []
    };
  }

  // Helper methods
  private extractReferences(resource: any): any[] {
    const refs: any[] = [];
    const refFields = ['subject', 'patient', 'encounter', 'performer', 'author',
                       'requester', 'asserter', 'recorder', 'informationSource'];

    for (const field of refFields) {
      if (resource[field]) {
        if (Array.isArray(resource[field])) {
          refs.push(...resource[field]);
        } else {
          refs.push(resource[field]);
        }
      }
    }

    return refs;
  }

  private hasField(resource: any, field: string): boolean {
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = resource;
      for (const part of parts) {
        if (current === null || current === undefined) return false;
        current = current[part];
      }
      return current !== null && current !== undefined;
    }

    // Handle choice types (e.g., medication[x])
    if (field.endsWith('[x]')) {
      const baseName = field.slice(0, -3);
      const variants = ['CodeableConcept', 'Reference', 'String', 'Boolean',
                        'Integer', 'DateTime', 'Period', 'Quantity'];
      return variants.some(v => resource[baseName + v] !== undefined);
    }

    return resource[field] !== null && resource[field] !== undefined;
  }

  private getRequiredFields(resourceType: string): string[] {
    const requiredFields: Record<string, string[]> = {
      Patient: ['identifier', 'name'],
      Condition: ['code', 'subject'],
      Observation: ['status', 'code', 'subject'],
      MedicationRequest: ['status', 'intent', 'subject'],
      Encounter: ['status', 'class', 'subject'],
      Procedure: ['status', 'code', 'subject'],
      DiagnosticReport: ['status', 'code'],
      Immunization: ['status', 'vaccineCode', 'patient'],
      AllergyIntolerance: ['patient'],
      CarePlan: ['status', 'intent', 'subject'],
      Goal: ['lifecycleStatus', 'description', 'subject']
    };

    return requiredFields[resourceType] || [];
  }

  private getExpectedFields(resourceType: string): string[] {
    const expectedFields: Record<string, string[]> = {
      Patient: ['gender', 'birthDate', 'address', 'telecom'],
      Condition: ['clinicalStatus', 'verificationStatus', 'category'],
      Observation: ['effectiveDateTime', 'valueQuantity', 'category'],
      MedicationRequest: ['authoredOn', 'dosageInstruction'],
      Encounter: ['type', 'period'],
      Procedure: ['performedDateTime', 'performer'],
      DiagnosticReport: ['effectiveDateTime', 'result', 'subject'],
      Immunization: ['occurrenceDateTime', 'primarySource'],
      AllergyIntolerance: ['code', 'clinicalStatus'],
      CarePlan: ['category', 'period'],
      Goal: ['target', 'category']
    };

    return expectedFields[resourceType] || [];
  }

  private getEnhancedFields(resourceType: string): string[] {
    const enhancedFields: Record<string, string[]> = {
      Patient: ['maritalStatus', 'communication', 'generalPractitioner', 'extension'],
      Condition: ['evidence', 'note', 'bodySite', 'stage'],
      Observation: ['referenceRange', 'interpretation', 'method', 'performer'],
      MedicationRequest: ['reasonCode', 'substitution', 'dispenseRequest'],
      Encounter: ['diagnosis', 'hospitalization', 'serviceProvider'],
      Procedure: ['outcome', 'complication', 'followUp', 'note'],
      DiagnosticReport: ['conclusion', 'conclusionCode', 'presentedForm'],
      Immunization: ['lotNumber', 'expirationDate', 'site', 'route'],
      AllergyIntolerance: ['reaction', 'note', 'recordedDate'],
      CarePlan: ['activity', 'goal', 'careTeam'],
      Goal: ['achievementStatus', 'note', 'outcomeReference']
    };

    return enhancedFields[resourceType] || [];
  }

  private hasStandardCoding(resource: any): boolean {
    const codeFields = ['code', 'vaccineCode', 'medicationCodeableConcept'];
    const standardSystems = [
      'http://loinc.org',
      'http://snomed.info/sct',
      'http://www.nlm.nih.gov/research/umls/rxnorm',
      'http://hl7.org/fhir/sid/cvx',
      'http://hl7.org/fhir/sid/icd-10-cm'
    ];

    for (const field of codeFields) {
      if (resource[field]?.coding) {
        const hasStandard = resource[field].coding.some((c: any) =>
          standardSystems.includes(c.system)
        );
        if (hasStandard) return true;
      }
    }

    return false;
  }

  private hasICD10Coding(resource: any): boolean {
    if (resource.code?.coding) {
      return resource.code.coding.some((c: any) =>
        c.system === 'http://hl7.org/fhir/sid/icd-10-cm' ||
        c.system === 'http://hl7.org/fhir/sid/icd-10'
      );
    }
    return false;
  }
}

export const usabilityService = new UsabilityService();
