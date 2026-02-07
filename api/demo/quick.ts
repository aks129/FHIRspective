import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatorService } from '../../server/services/validatorService';
import { usabilityService } from '../../server/services/usabilityService';
import { sampleFhirData, getSampleResourcesByType } from '../../server/demo/sampleFhirData';

/**
 * Quick demo endpoint - runs assessment with sample FHIR data
 * GET /api/demo/quick
 */
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
    console.log('Running quick demo with sample data...');
    const startTime = Date.now();

    const resourceTypes = ['Patient', 'Condition', 'Observation', 'MedicationRequest', 'Encounter', 'Immunization'];
    const result: any = {
      config: {
        mode: 'sample',
        resourceTypes,
        sampleSize: 10,
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

    const allValidationResults: any[] = [];

    // Mock connection for validation
    const mockConnection = {
      id: 0,
      url: 'sample://demo',
      authType: 'none' as const,
      username: null,
      password: null,
      token: null,
      clientId: null,
      clientSecret: null,
      tokenUrl: null,
      accessToken: null,
      tokenExpiresAt: null,
      timeout: 30,
      lastUsed: new Date(),
      userId: null
    };

    // Process each resource type
    for (const resourceType of resourceTypes) {
      const resources = getSampleResourcesByType(resourceType);

      if (resources.length === 0) {
        continue;
      }

      // Validate resources
      const validationResults = await validatorService.validateResources(
        mockConnection,
        resourceType,
        resources,
        'custom',
        'uscore'
      );

      result.validationResults[resourceType] = validationResults;
      allValidationResults.push(...validationResults);

      // Count issues
      const issueCount = validationResults.reduce((sum: number, r: any) => sum + r.issues.length, 0);
      const validCount = validationResults.filter((r: any) => r.valid).length;

      result.resourceSummary[resourceType] = {
        count: resources.length,
        validCount,
        issueCount
      };

      // Calculate usability scores
      const usabilityReport = usabilityService.generateUsabilityReport(
        resources,
        validationResults
      );

      result.usabilityReports[resourceType] = serializeUsabilityReport(usabilityReport);
    }

    // Calculate aggregated usability
    result.aggregatedUsability = calculateAggregatedUsability(result.usabilityReports);

    // Compile prevention insights and top issues
    result.preventionInsights = aggregatePreventionInsights(result.usabilityReports);
    result.topIssues = aggregateTopIssues(result.usabilityReports);

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

function serializeUsabilityReport(report: any): any {
  return {
    resourceType: report.resourceType,
    resourceCount: report.resourceCount,
    averageOverallScore: Math.round(report.averageOverallScore * 100) / 100,
    useCaseReadiness: Object.fromEntries(report.useCaseReadiness),
    dimensionBreakdown: report.dimensionBreakdown,
    topIssues: report.topIssues,
    preventionInsights: report.preventionInsights
  };
}

function calculateAggregatedUsability(reports: any): any {
  const reportValues = Object.values(reports) as any[];
  if (reportValues.length === 0) {
    return {
      averageOverallScore: 0,
      useCaseReadiness: {},
      dimensionBreakdown: {
        conformance: { score: 0, issues: 0 },
        completeness: { score: 0, issues: 0 },
        plausibility: { score: 0, issues: 0 },
        timeliness: { score: 0, issues: 0 }
      }
    };
  }

  const averageOverallScore = reportValues.reduce((sum, r) => sum + r.averageOverallScore, 0) / reportValues.length;

  const useCases = [
    'quality_reporting', 'population_health', 'prior_authorization',
    'analytics', 'drug_trials', 'risk_adjustment'
  ];

  const useCaseReadiness: any = {};
  for (const useCase of useCases) {
    const scores = reportValues.map(r => r.useCaseReadiness[useCase]?.readinessScore || 0);
    const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

    const blockers = new Set<string>();
    const warnings = new Set<string>();
    for (const report of reportValues) {
      const readiness = report.useCaseReadiness[useCase];
      if (readiness) {
        readiness.blockers?.forEach((b: string) => blockers.add(b));
        readiness.warnings?.forEach((w: string) => warnings.add(w));
      }
    }

    useCaseReadiness[useCase] = {
      score: Math.round(avgScore * 100) / 100,
      level: getReadinessLevel(avgScore),
      blockers: Array.from(blockers).slice(0, 3),
      warnings: Array.from(warnings).slice(0, 3)
    };
  }

  const dimensionBreakdown = {
    conformance: {
      score: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.conformance?.score || 0), 0) / reportValues.length,
      issues: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.conformance?.issues || 0), 0)
    },
    completeness: {
      score: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.completeness?.score || 0), 0) / reportValues.length,
      issues: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.completeness?.issues || 0), 0)
    },
    plausibility: {
      score: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.plausibility?.score || 0), 0) / reportValues.length,
      issues: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.plausibility?.issues || 0), 0)
    },
    timeliness: {
      score: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.timeliness?.score || 0), 0) / reportValues.length,
      issues: reportValues.reduce((sum, r) => sum + (r.dimensionBreakdown?.timeliness?.issues || 0), 0)
    }
  };

  return {
    averageOverallScore: Math.round(averageOverallScore * 100) / 100,
    useCaseReadiness,
    dimensionBreakdown
  };
}

function getReadinessLevel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'acceptable';
  if (score >= 50) return 'needs_improvement';
  return 'not_ready';
}

function aggregatePreventionInsights(reports: any): any[] {
  const allInsights: any[] = [];
  for (const report of Object.values(reports) as any[]) {
    if (report.preventionInsights) {
      allInsights.push(...report.preventionInsights);
    }
  }
  return allInsights
    .sort((a, b) => (b.estimatedImpact || 0) - (a.estimatedImpact || 0))
    .slice(0, 5);
}

function aggregateTopIssues(reports: any): any[] {
  const allIssues: any[] = [];
  for (const report of Object.values(reports) as any[]) {
    if (report.topIssues) {
      allIssues.push(...report.topIssues);
    }
  }
  const priorityOrder: any = { critical: 0, high: 1, medium: 2, low: 3 };
  return allIssues
    .sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4))
    .slice(0, 10);
}
