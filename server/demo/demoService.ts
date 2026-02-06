/**
 * Demo Service - End-to-End FHIR Assessment Demo
 *
 * This service demonstrates the complete FHIRspective workflow:
 * 1. Connect to a real FHIR server
 * 2. Fetch or use sample data
 * 3. Run validation against selected frameworks
 * 4. Calculate usability scores
 * 5. Generate prevention insights
 */

import { validatorService, ValidationResult } from "../services/validatorService.js";
import { usabilityService, UsabilityReport, UsabilityUseCase } from "../services/usabilityService.js";
import { sampleFhirData, getSampleResourcesByType, getAllSampleResources } from "./sampleFhirData.js";

// Public FHIR servers for demo
export const PUBLIC_FHIR_SERVERS = {
  hapi_r4: {
    name: "HAPI FHIR R4 (Public)",
    url: "https://hapi.fhir.org/baseR4",
    description: "Public HAPI FHIR R4 test server with sample data"
  },
  medplum: {
    name: "Medplum (Requires Auth)",
    url: "https://api.medplum.com/fhir/R4",
    description: "Medplum FHIR server - requires OAuth2 credentials"
  },
  synthea: {
    name: "Synthea Sample",
    url: "https://syntheticmass.mitre.org/v1/fhir",
    description: "Synthea synthetic patient data"
  }
};

export interface DemoConfig {
  mode: 'sample' | 'live';
  serverUrl?: string;
  resourceTypes: string[];
  sampleSize: number;
  validator: string;
  implementationGuide: string;
}

export interface DemoResult {
  config: DemoConfig;
  executionTime: number;
  connection: {
    success: boolean;
    serverInfo?: any;
    error?: string;
  };
  resourceSummary: {
    [resourceType: string]: {
      count: number;
      validCount: number;
      issueCount: number;
    };
  };
  validationResults: {
    [resourceType: string]: ValidationResult[];
  };
  usabilityReports: {
    [resourceType: string]: SerializableUsabilityReport;
  };
  aggregatedUsability: {
    averageOverallScore: number;
    useCaseReadiness: {
      [useCase: string]: {
        score: number;
        level: string;
        blockers: string[];
        warnings: string[];
      };
    };
    dimensionBreakdown: {
      conformance: { score: number; issues: number };
      completeness: { score: number; issues: number };
      plausibility: { score: number; issues: number };
      timeliness: { score: number; issues: number };
    };
  };
  preventionInsights: any[];
  topIssues: any[];
}

interface SerializableUsabilityReport {
  resourceType: string;
  resourceCount: number;
  averageOverallScore: number;
  useCaseReadiness: { [useCase: string]: any };
  dimensionBreakdown: any;
  topIssues: any[];
  preventionInsights: any[];
}

class DemoService {
  /**
   * Run a complete demo assessment
   */
  async runDemo(config: DemoConfig): Promise<DemoResult> {
    const startTime = Date.now();
    console.log('\n========================================');
    console.log('FHIRspective Demo - Starting Assessment');
    console.log('========================================\n');

    const result: DemoResult = {
      config,
      executionTime: 0,
      connection: { success: false },
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

    try {
      // Step 1: Connection test (for live mode) or sample data load
      if (config.mode === 'live' && config.serverUrl) {
        console.log(`Step 1: Testing connection to ${config.serverUrl}...`);
        const connectionResult = await this.testConnection(config.serverUrl);
        result.connection = connectionResult;

        if (!connectionResult.success) {
          console.log(`Connection failed: ${connectionResult.error}`);
          console.log('Falling back to sample data mode...\n');
          config.mode = 'sample';
        } else {
          console.log(`Connected successfully to FHIR ${connectionResult.serverInfo?.fhirVersion}\n`);
        }
      } else {
        console.log('Step 1: Using sample data mode...\n');
        result.connection = { success: true, serverInfo: { mode: 'sample', fhirVersion: 'R4' } };
      }

      // Step 2: Process each resource type
      const allValidationResults: ValidationResult[] = [];
      const allResources: any[] = [];

      for (const resourceType of config.resourceTypes) {
        console.log(`Step 2: Processing ${resourceType} resources...`);

        // Get resources (sample or live)
        const resources = config.mode === 'sample'
          ? getSampleResourcesByType(resourceType)
          : await this.fetchLiveResources(config.serverUrl!, resourceType, config.sampleSize);

        if (resources.length === 0) {
          console.log(`  No ${resourceType} resources found, skipping...\n`);
          continue;
        }

        console.log(`  Found ${resources.length} ${resourceType} resources`);
        allResources.push(...resources);

        // Step 3: Validate resources
        console.log(`  Validating against ${config.implementationGuide} implementation guide...`);

        const mockConnection = {
          id: 0,
          url: config.serverUrl || 'sample://demo',
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

        const validationResults = await validatorService.validateResources(
          mockConnection,
          resourceType,
          resources,
          config.validator,
          config.implementationGuide
        );

        result.validationResults[resourceType] = validationResults;
        allValidationResults.push(...validationResults);

        // Count issues
        const issueCount = validationResults.reduce((sum, r) => sum + r.issues.length, 0);
        const validCount = validationResults.filter(r => r.valid).length;

        result.resourceSummary[resourceType] = {
          count: resources.length,
          validCount,
          issueCount
        };

        console.log(`  Validation complete: ${validCount}/${resources.length} valid, ${issueCount} issues found`);

        // Step 4: Calculate usability scores
        console.log(`  Calculating usability scores...`);
        const usabilityReport = usabilityService.generateUsabilityReport(
          resources,
          validationResults
        );

        result.usabilityReports[resourceType] = this.serializeUsabilityReport(usabilityReport);
        console.log(`  Usability score: ${usabilityReport.averageOverallScore.toFixed(1)}%\n`);
      }

      // Step 5: Calculate aggregated usability
      console.log('Step 3: Calculating aggregated usability metrics...');
      result.aggregatedUsability = this.calculateAggregatedUsability(result.usabilityReports);

      // Step 6: Compile prevention insights and top issues
      console.log('Step 4: Generating prevention insights...\n');
      result.preventionInsights = this.aggregatePreventionInsights(result.usabilityReports);
      result.topIssues = this.aggregateTopIssues(result.usabilityReports);

      result.executionTime = Date.now() - startTime;

      // Print summary
      this.printSummary(result);

      return result;
    } catch (error) {
      result.executionTime = Date.now() - startTime;
      console.error('Demo failed:', error);
      throw error;
    }
  }

  /**
   * Run a quick demo with sample data
   */
  async runQuickDemo(): Promise<DemoResult> {
    return this.runDemo({
      mode: 'sample',
      resourceTypes: ['Patient', 'Condition', 'Observation', 'MedicationRequest', 'Encounter', 'Immunization'],
      sampleSize: 10,
      validator: 'custom',
      implementationGuide: 'uscore'
    });
  }

  /**
   * Run demo against HAPI FHIR public server
   */
  async runLiveDemo(): Promise<DemoResult> {
    return this.runDemo({
      mode: 'live',
      serverUrl: PUBLIC_FHIR_SERVERS.hapi_r4.url,
      resourceTypes: ['Patient', 'Condition', 'Observation'],
      sampleSize: 5,
      validator: 'custom',
      implementationGuide: 'uscore'
    });
  }

  /**
   * Test connection to a FHIR server
   */
  private async testConnection(url: string): Promise<{ success: boolean; serverInfo?: any; error?: string }> {
    try {
      const metadataUrl = `${url}/metadata`;
      const response = await fetch(metadataUrl, {
        headers: { 'Accept': 'application/fhir+json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const capability = await response.json();
      return {
        success: true,
        serverInfo: {
          fhirVersion: capability.fhirVersion,
          software: capability.software?.name,
          version: capability.software?.version,
          resourceTypes: capability.rest?.[0]?.resource?.map((r: any) => r.type) || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Fetch resources from a live FHIR server
   */
  private async fetchLiveResources(url: string, resourceType: string, count: number): Promise<any[]> {
    try {
      const searchUrl = `${url}/${resourceType}?_count=${count}`;
      const response = await fetch(searchUrl, {
        headers: { 'Accept': 'application/fhir+json' },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        console.log(`  Warning: Could not fetch ${resourceType}: HTTP ${response.status}`);
        return [];
      }

      const bundle = await response.json();
      return bundle.entry?.map((e: any) => e.resource) || [];
    } catch (error) {
      console.log(`  Warning: Error fetching ${resourceType}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Serialize usability report for JSON output
   */
  private serializeUsabilityReport(report: UsabilityReport): SerializableUsabilityReport {
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

  /**
   * Calculate aggregated usability across all resource types
   */
  private calculateAggregatedUsability(reports: { [resourceType: string]: SerializableUsabilityReport }): DemoResult['aggregatedUsability'] {
    const reportValues = Object.values(reports);
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

    // Calculate average overall score
    const averageOverallScore = reportValues.reduce((sum, r) => sum + r.averageOverallScore, 0) / reportValues.length;

    // Aggregate use case readiness
    const useCases: UsabilityUseCase[] = [
      'quality_reporting', 'population_health', 'prior_authorization',
      'analytics', 'drug_trials', 'risk_adjustment'
    ];

    const useCaseReadiness: { [useCase: string]: any } = {};
    for (const useCase of useCases) {
      const scores = reportValues.map(r => r.useCaseReadiness[useCase]?.readinessScore || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Aggregate blockers and warnings
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
        level: this.getReadinessLevel(avgScore),
        blockers: Array.from(blockers).slice(0, 3),
        warnings: Array.from(warnings).slice(0, 3)
      };
    }

    // Aggregate dimension breakdown
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

  private getReadinessLevel(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'acceptable';
    if (score >= 50) return 'needs_improvement';
    return 'not_ready';
  }

  /**
   * Aggregate prevention insights from all reports
   */
  private aggregatePreventionInsights(reports: { [resourceType: string]: SerializableUsabilityReport }): any[] {
    const allInsights: any[] = [];
    for (const report of Object.values(reports)) {
      if (report.preventionInsights) {
        allInsights.push(...report.preventionInsights);
      }
    }
    // Sort by estimated impact and take top 5
    return allInsights
      .sort((a, b) => (b.estimatedImpact || 0) - (a.estimatedImpact || 0))
      .slice(0, 5);
  }

  /**
   * Aggregate top issues from all reports
   */
  private aggregateTopIssues(reports: { [resourceType: string]: SerializableUsabilityReport }): any[] {
    const allIssues: any[] = [];
    for (const report of Object.values(reports)) {
      if (report.topIssues) {
        allIssues.push(...report.topIssues);
      }
    }
    // Sort by priority and take top 10
    const priorityOrder: { [key: string]: number } = { critical: 0, high: 1, medium: 2, low: 3 };
    return allIssues
      .sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4))
      .slice(0, 10);
  }

  /**
   * Print a summary of the demo results
   */
  private printSummary(result: DemoResult): void {
    console.log('\n========================================');
    console.log('Demo Results Summary');
    console.log('========================================\n');

    console.log(`Execution Time: ${result.executionTime}ms`);
    console.log(`Mode: ${result.config.mode}`);
    console.log(`Resource Types: ${result.config.resourceTypes.join(', ')}`);
    console.log(`Implementation Guide: ${result.config.implementationGuide}\n`);

    console.log('--- Resource Summary ---');
    for (const [resourceType, summary] of Object.entries(result.resourceSummary)) {
      console.log(`  ${resourceType}: ${summary.count} resources, ${summary.validCount} valid, ${summary.issueCount} issues`);
    }

    console.log('\n--- Overall Usability ---');
    console.log(`  Average Score: ${result.aggregatedUsability.averageOverallScore}%`);

    console.log('\n--- Use Case Readiness ---');
    for (const [useCase, readiness] of Object.entries(result.aggregatedUsability.useCaseReadiness)) {
      const useCaseLabel = useCase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`  ${useCaseLabel}: ${readiness.score}% (${readiness.level})`);
    }

    console.log('\n--- Data Quality Dimensions ---');
    const dims = result.aggregatedUsability.dimensionBreakdown;
    console.log(`  Conformance:  ${dims.conformance.score.toFixed(1)}% (${dims.conformance.issues} issues)`);
    console.log(`  Completeness: ${dims.completeness.score.toFixed(1)}% (${dims.completeness.issues} issues)`);
    console.log(`  Plausibility: ${dims.plausibility.score.toFixed(1)}% (${dims.plausibility.issues} issues)`);
    console.log(`  Timeliness:   ${dims.timeliness.score.toFixed(1)}% (${dims.timeliness.issues} issues)`);

    if (result.preventionInsights.length > 0) {
      console.log('\n--- Top Prevention Insights ---');
      for (const insight of result.preventionInsights.slice(0, 3)) {
        console.log(`  - ${insight.pattern}`);
        console.log(`    Action: ${insight.preventionAction}`);
      }
    }

    if (result.topIssues.length > 0) {
      console.log('\n--- Top Issues ---');
      for (const issue of result.topIssues.slice(0, 3)) {
        console.log(`  - [${issue.priority}] ${issue.issue}`);
        console.log(`    Recommendation: ${issue.recommendation}`);
      }
    }

    console.log('\n========================================');
    console.log('Demo Complete');
    console.log('========================================\n');
  }
}

export const demoService = new DemoService();
