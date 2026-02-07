import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatorService } from '../../server/services/validatorService';
import { usabilityService } from '../../server/services/usabilityService';
import { sampleFhirData, getSampleResourcesByType } from '../../server/demo/sampleFhirData';

const HAPI_FHIR_URL = 'https://hapi.fhir.org/baseR4';

/**
 * Live demo endpoint - attempts to connect to HAPI FHIR server
 * Falls back to sample data if connection fails
 * GET /api/demo/live
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
    console.log('Running live demo with HAPI FHIR server...');
    const startTime = Date.now();

    const resourceTypes = ['Patient', 'Condition', 'Observation'];
    let mode = 'live';
    let connectionInfo: any = { success: false };

    // Try to connect to HAPI FHIR server
    try {
      const metadataUrl = `${HAPI_FHIR_URL}/metadata`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(metadataUrl, {
        headers: { 'Accept': 'application/fhir+json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const capability = await response.json();
        connectionInfo = {
          success: true,
          serverInfo: {
            fhirVersion: capability.fhirVersion,
            software: capability.software?.name,
            version: capability.software?.version
          }
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('Failed to connect to HAPI FHIR, falling back to sample data');
      mode = 'sample';
      connectionInfo = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fallback: 'Using sample data'
      };
    }

    const result: any = {
      config: {
        mode,
        serverUrl: mode === 'live' ? HAPI_FHIR_URL : undefined,
        resourceTypes,
        sampleSize: 5,
        validator: 'custom',
        implementationGuide: 'uscore'
      },
      executionTime: 0,
      connection: connectionInfo,
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

    const mockConnection = {
      id: 0,
      url: mode === 'live' ? HAPI_FHIR_URL : 'sample://demo',
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
      let resources: any[];

      if (mode === 'live' && connectionInfo.success) {
        // Fetch from live server
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const searchUrl = `${HAPI_FHIR_URL}/${resourceType}?_count=5`;
          const response = await fetch(searchUrl, {
            headers: { 'Accept': 'application/fhir+json' },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const bundle = await response.json();
            resources = bundle.entry?.map((e: any) => e.resource) || [];
          } else {
            console.log(`Failed to fetch ${resourceType} from live server, using sample data`);
            resources = getSampleResourcesByType(resourceType);
          }
        } catch (error) {
          console.log(`Error fetching ${resourceType}, using sample data`);
          resources = getSampleResourcesByType(resourceType);
        }
      } else {
        resources = getSampleResourcesByType(resourceType);
      }

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
    console.error('Live demo failed:', error);
    return res.status(500).json({
      error: 'Live demo failed',
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
