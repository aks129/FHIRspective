import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Quick demo endpoint - runs assessment with sample FHIR data
 * GET /api/demo/quick
 *
 * Self-contained endpoint that doesn't rely on server-side imports
 */

// Sample FHIR data with varying quality levels
const samplePatients = [
  {
    resourceType: "Patient",
    id: "demo-patient-001",
    meta: { lastUpdated: new Date().toISOString() },
    identifier: [{ system: "http://hospital.example.org/patients", value: "PAT001" }],
    active: true,
    name: [{ use: "official", family: "Johnson", given: ["Sarah", "Marie"] }],
    telecom: [{ system: "phone", value: "555-123-4567", use: "home" }],
    gender: "female",
    birthDate: "1985-03-15",
    address: [{ use: "home", city: "Boston", state: "MA", postalCode: "02101" }]
  },
  {
    resourceType: "Patient",
    id: "demo-patient-002",
    meta: { lastUpdated: new Date().toISOString() },
    identifier: [{ system: "http://hospital.example.org/patients", value: "PAT002" }],
    name: [{ family: "Smith", given: ["John"] }],
    gender: "male",
    birthDate: "1978-07-22"
  },
  {
    resourceType: "Patient",
    id: "demo-patient-003",
    meta: { lastUpdated: new Date().toISOString() },
    name: [{ text: "Jane Doe" }],
    birthDate: "2030-01-01" // Future date - quality issue
  }
];

const sampleConditions = [
  {
    resourceType: "Condition",
    id: "demo-condition-001",
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
    code: {
      coding: [
        { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9", display: "Type 2 diabetes mellitus" },
        { system: "http://snomed.info/sct", code: "44054006", display: "Diabetes mellitus type 2" }
      ],
      text: "Type 2 Diabetes"
    },
    subject: { reference: "Patient/demo-patient-001" },
    onsetDateTime: "2020-03-15"
  },
  {
    resourceType: "Condition",
    id: "demo-condition-002",
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    code: { coding: [{ system: "http://snomed.info/sct", code: "38341003", display: "Hypertensive disorder" }] },
    subject: { reference: "Patient/demo-patient-002" }
  },
  {
    resourceType: "Condition",
    id: "demo-condition-003",
    code: { text: "Some condition" }, // Missing proper coding
    subject: { reference: "Patient/demo-patient-003" }
  }
];

const sampleObservations = [
  {
    resourceType: "Observation",
    id: "demo-observation-001",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
    subject: { reference: "Patient/demo-patient-001" },
    effectiveDateTime: new Date(Date.now() - 86400000).toISOString(),
    valueQuantity: { value: 120, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
  },
  {
    resourceType: "Observation",
    id: "demo-observation-002",
    status: "final",
    code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
    subject: { reference: "Patient/demo-patient-002" },
    effectiveDateTime: new Date(Date.now() - 172800000).toISOString(),
    valueQuantity: { value: 37.2, unit: "C" }
  },
  {
    resourceType: "Observation",
    id: "demo-observation-003",
    status: "final",
    code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
    subject: { reference: "Patient/demo-patient-003" },
    effectiveDateTime: new Date(Date.now() + 86400000).toISOString(), // Future date
    valueQuantity: { value: 350, unit: "mmHg" } // Implausible value
  }
];

// Validation logic
function validateResources(resources: any[], resourceType: string) {
  const results = [];

  for (const resource of resources) {
    const issues: any[] = [];

    // Check common required fields
    if (!resource.id) {
      issues.push({ severity: 'error', code: 'required', dimension: 'completeness', diagnostics: 'Missing id' });
    }

    // Resource-specific validation
    if (resourceType === 'Patient') {
      if (!resource.identifier || resource.identifier.length === 0) {
        issues.push({ severity: 'warning', code: 'missing-identifier', dimension: 'completeness', diagnostics: 'Missing identifier' });
      }
      if (!resource.gender) {
        issues.push({ severity: 'warning', code: 'missing-gender', dimension: 'completeness', diagnostics: 'Missing gender' });
      }
      if (!resource.name?.[0]?.family) {
        issues.push({ severity: 'warning', code: 'missing-family-name', dimension: 'completeness', diagnostics: 'Missing family name' });
      }
      if (resource.birthDate) {
        const birthDate = new Date(resource.birthDate);
        if (birthDate > new Date()) {
          issues.push({ severity: 'error', code: 'future-date', dimension: 'plausibility', diagnostics: 'Birth date is in the future' });
        }
      }
    }

    if (resourceType === 'Condition') {
      if (!resource.code?.coding || resource.code.coding.length === 0) {
        issues.push({ severity: 'warning', code: 'missing-coding', dimension: 'conformity', diagnostics: 'Missing standardized coding' });
      }
      if (!resource.clinicalStatus) {
        issues.push({ severity: 'warning', code: 'missing-status', dimension: 'completeness', diagnostics: 'Missing clinical status' });
      }
      if (!resource.verificationStatus) {
        issues.push({ severity: 'information', code: 'missing-verification', dimension: 'completeness', diagnostics: 'Missing verification status' });
      }
      // Check for ICD-10 coding
      const hasIcd10 = resource.code?.coding?.some((c: any) => c.system?.includes('icd-10'));
      if (!hasIcd10) {
        issues.push({ severity: 'warning', code: 'missing-icd10', dimension: 'conformity', diagnostics: 'Missing ICD-10 coding for risk adjustment' });
      }
    }

    if (resourceType === 'Observation') {
      if (!resource.status) {
        issues.push({ severity: 'error', code: 'missing-status', dimension: 'completeness', diagnostics: 'Missing status' });
      }
      if (!resource.category) {
        issues.push({ severity: 'warning', code: 'missing-category', dimension: 'completeness', diagnostics: 'Missing category' });
      }
      if (resource.effectiveDateTime) {
        const effectiveDate = new Date(resource.effectiveDateTime);
        if (effectiveDate > new Date()) {
          issues.push({ severity: 'error', code: 'future-date', dimension: 'plausibility', diagnostics: 'Effective date is in the future' });
        }
      }
      if (resource.valueQuantity?.value) {
        if (resource.code?.coding?.[0]?.code === '8480-6' && resource.valueQuantity.value > 300) {
          issues.push({ severity: 'error', code: 'implausible-value', dimension: 'plausibility', diagnostics: 'Blood pressure value is implausible (>300 mmHg)' });
        }
      }
    }

    results.push({
      resourceType,
      resourceId: resource.id,
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    });
  }

  return results;
}

// Usability scoring
function calculateUsabilityScore(resources: any[], validationResults: any[], resourceType: string) {
  const useCases = ['quality_reporting', 'population_health', 'prior_authorization', 'analytics', 'drug_trials', 'risk_adjustment'];

  const weights: Record<string, Record<string, number>> = {
    quality_reporting: { conformance: 0.30, completeness: 0.35, plausibility: 0.25, timeliness: 0.10 },
    population_health: { conformance: 0.20, completeness: 0.40, plausibility: 0.25, timeliness: 0.15 },
    prior_authorization: { conformance: 0.35, completeness: 0.35, plausibility: 0.20, timeliness: 0.10 },
    analytics: { conformance: 0.25, completeness: 0.30, plausibility: 0.30, timeliness: 0.15 },
    drug_trials: { conformance: 0.35, completeness: 0.30, plausibility: 0.25, timeliness: 0.10 },
    risk_adjustment: { conformance: 0.30, completeness: 0.40, plausibility: 0.20, timeliness: 0.10 }
  };

  // Count issues by dimension
  const dimensionIssues: Record<string, number> = { conformity: 0, completeness: 0, plausibility: 0, timeliness: 0 };
  for (const result of validationResults) {
    for (const issue of result.issues) {
      if (issue.dimension && dimensionIssues[issue.dimension] !== undefined) {
        dimensionIssues[issue.dimension]++;
      }
    }
  }

  const totalResources = resources.length;
  const dimensionScores = {
    conformance: Math.max(0, 100 - (dimensionIssues.conformity / totalResources) * 50),
    completeness: Math.max(0, 100 - (dimensionIssues.completeness / totalResources) * 30),
    plausibility: Math.max(0, 100 - (dimensionIssues.plausibility / totalResources) * 40),
    timeliness: 95 // Default high score for timeliness
  };

  const useCaseReadiness: Record<string, any> = {};
  let totalScore = 0;

  for (const useCase of useCases) {
    const w = weights[useCase];
    const score =
      dimensionScores.conformance * w.conformance +
      dimensionScores.completeness * w.completeness +
      dimensionScores.plausibility * w.plausibility +
      dimensionScores.timeliness * w.timeliness;

    totalScore += score;
    useCaseReadiness[useCase] = {
      readinessScore: Math.round(score * 100) / 100,
      readinessLevel: score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'acceptable' : score >= 50 ? 'needs_improvement' : 'not_ready',
      blockers: score < 70 ? ['Data quality issues detected'] : [],
      warnings: score < 85 ? ['Some fields missing for optimal use'] : []
    };
  }

  return {
    resourceType,
    resourceCount: resources.length,
    averageOverallScore: Math.round((totalScore / useCases.length) * 100) / 100,
    useCaseReadiness,
    dimensionBreakdown: {
      conformance: { score: dimensionScores.conformance, issues: dimensionIssues.conformity },
      completeness: { score: dimensionScores.completeness, issues: dimensionIssues.completeness },
      plausibility: { score: dimensionScores.plausibility, issues: dimensionIssues.plausibility },
      timeliness: { score: dimensionScores.timeliness, issues: dimensionIssues.timeliness }
    },
    topIssues: [],
    preventionInsights: []
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();

    const resourceData: Record<string, any[]> = {
      Patient: samplePatients,
      Condition: sampleConditions,
      Observation: sampleObservations
    };

    const result: any = {
      config: {
        mode: 'sample',
        resourceTypes: Object.keys(resourceData),
        validator: 'custom',
        implementationGuide: 'uscore'
      },
      executionTime: 0,
      connection: { success: true, serverInfo: { mode: 'sample', fhirVersion: 'R4' } },
      resourceSummary: {},
      validationResults: {},
      usabilityReports: {},
      aggregatedUsability: {
        averageOverallScore: 0,
        useCaseReadiness: {},
        dimensionBreakdown: {
          conformance: { score: 0, issues: 0 },
          completeness: { score: 0, issues: 0 },
          plausibility: { score: 0, issues: 0 },
          timeliness: { score: 0, issues: 0 }
        }
      },
      preventionInsights: [],
      topIssues: []
    };

    const allUsabilityReports: any[] = [];

    // Process each resource type
    for (const [resourceType, resources] of Object.entries(resourceData)) {
      // Validate
      const validationResults = validateResources(resources, resourceType);
      result.validationResults[resourceType] = validationResults;

      // Summary
      const issueCount = validationResults.reduce((sum, r) => sum + r.issues.length, 0);
      const validCount = validationResults.filter(r => r.valid).length;
      result.resourceSummary[resourceType] = { count: resources.length, validCount, issueCount };

      // Usability
      const usabilityReport = calculateUsabilityScore(resources, validationResults, resourceType);
      result.usabilityReports[resourceType] = usabilityReport;
      allUsabilityReports.push(usabilityReport);
    }

    // Aggregate usability
    if (allUsabilityReports.length > 0) {
      const avgScore = allUsabilityReports.reduce((sum, r) => sum + r.averageOverallScore, 0) / allUsabilityReports.length;
      result.aggregatedUsability.averageOverallScore = Math.round(avgScore * 100) / 100;

      // Aggregate use case readiness
      const useCases = ['quality_reporting', 'population_health', 'prior_authorization', 'analytics', 'drug_trials', 'risk_adjustment'];
      for (const useCase of useCases) {
        const scores = allUsabilityReports.map(r => r.useCaseReadiness[useCase]?.readinessScore || 0);
        const avgUcScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        result.aggregatedUsability.useCaseReadiness[useCase] = {
          score: Math.round(avgUcScore * 100) / 100,
          level: avgUcScore >= 90 ? 'excellent' : avgUcScore >= 80 ? 'good' : avgUcScore >= 70 ? 'acceptable' : avgUcScore >= 50 ? 'needs_improvement' : 'not_ready'
        };
      }

      // Aggregate dimensions
      result.aggregatedUsability.dimensionBreakdown = {
        conformance: {
          score: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.conformance.score, 0) / allUsabilityReports.length,
          issues: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.conformance.issues, 0)
        },
        completeness: {
          score: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.completeness.score, 0) / allUsabilityReports.length,
          issues: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.completeness.issues, 0)
        },
        plausibility: {
          score: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.plausibility.score, 0) / allUsabilityReports.length,
          issues: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.plausibility.issues, 0)
        },
        timeliness: {
          score: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.timeliness.score, 0) / allUsabilityReports.length,
          issues: allUsabilityReports.reduce((sum, r) => sum + r.dimensionBreakdown.timeliness.issues, 0)
        }
      };
    }

    // Top issues and prevention insights
    result.topIssues = [
      { priority: 'high', issue: 'Missing ICD-10 coding for conditions', recommendation: 'Add ICD-10-CM coding to enable HCC risk adjustment' },
      { priority: 'medium', issue: 'Missing demographic extensions', recommendation: 'Add US Core race and ethnicity extensions' },
      { priority: 'medium', issue: 'Incomplete patient identifiers', recommendation: 'Ensure all patients have system identifiers' }
    ];

    result.preventionInsights = [
      { pattern: 'Missing required fields', frequency: 3, preventionAction: 'Configure required field validation at data entry', estimatedImpact: 30 },
      { pattern: 'Future dates detected', frequency: 2, preventionAction: 'Add date validation rules', estimatedImpact: 20 }
    ];

    result.executionTime = Date.now() - startTime;

    return res.status(200).json(result);
  } catch (error) {
    console.error('Quick demo failed:', error);
    return res.status(500).json({
      error: 'Quick demo failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
