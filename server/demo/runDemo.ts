#!/usr/bin/env npx tsx
/**
 * FHIRspective Demo Runner
 *
 * Run this script to execute a complete end-to-end demo of FHIRspective's
 * FHIR validation and usability scoring capabilities.
 *
 * Usage:
 *   npx tsx server/demo/runDemo.ts [mode]
 *
 * Modes:
 *   quick   - Run with sample data (default)
 *   live    - Run against HAPI FHIR public server
 *   custom  - Run with custom configuration
 */

import { demoService, PUBLIC_FHIR_SERVERS, DemoConfig } from './demoService.js';

async function main() {
  const mode = process.argv[2] || 'quick';

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   FHIRspective Demo                          ║');
  console.log('║         Healthcare Data Quality Assessment Tool              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    let result;

    switch (mode) {
      case 'quick':
        console.log('Running QUICK demo with sample FHIR data...');
        console.log('This demo uses pre-defined sample data with varying data quality.\n');
        result = await demoService.runQuickDemo();
        break;

      case 'live':
        console.log('Running LIVE demo with HAPI FHIR public server...');
        console.log(`Connecting to: ${PUBLIC_FHIR_SERVERS.hapi_r4.url}\n`);
        result = await demoService.runLiveDemo();
        break;

      case 'custom':
        console.log('Running CUSTOM demo...');
        const customConfig: DemoConfig = {
          mode: 'sample',
          resourceTypes: ['Patient', 'Condition', 'Observation', 'MedicationRequest', 'Encounter', 'Immunization'],
          sampleSize: 20,
          validator: 'custom',
          implementationGuide: 'uscore'
        };
        result = await demoService.runDemo(customConfig);
        break;

      default:
        console.log(`Unknown mode: ${mode}`);
        console.log('Available modes: quick, live, custom');
        process.exit(1);
    }

    // Print detailed use case analysis
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              Use Case Readiness Analysis                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const useCaseLabels: { [key: string]: string } = {
      quality_reporting: 'Quality Reporting & Measurement',
      population_health: 'Population Health Management',
      prior_authorization: 'Prior Authorization',
      analytics: 'Analytics & Business Intelligence',
      drug_trials: 'Clinical Trials & Drug Research',
      risk_adjustment: 'Risk Adjustment & HCC Coding'
    };

    for (const [useCase, readiness] of Object.entries(result.aggregatedUsability.useCaseReadiness)) {
      const label = useCaseLabels[useCase] || useCase;
      const scoreBar = createScoreBar(readiness.score);
      const levelIcon = getLevelIcon(readiness.level);

      console.log(`${levelIcon} ${label}`);
      console.log(`   Score: ${scoreBar} ${readiness.score.toFixed(1)}%`);
      console.log(`   Readiness: ${readiness.level.toUpperCase()}`);

      if (readiness.blockers && readiness.blockers.length > 0) {
        console.log(`   Blockers:`);
        for (const blocker of readiness.blockers) {
          console.log(`     - ${blocker}`);
        }
      }

      if (readiness.warnings && readiness.warnings.length > 0) {
        console.log(`   Warnings:`);
        for (const warning of readiness.warnings) {
          console.log(`     - ${warning}`);
        }
      }
      console.log('');
    }

    // Print JSON summary for programmatic access
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    JSON Summary                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const summary = {
      executionTime: result.executionTime,
      mode: result.config.mode,
      resourceTypes: result.config.resourceTypes,
      resourceSummary: result.resourceSummary,
      overallUsabilityScore: result.aggregatedUsability.averageOverallScore,
      useCaseScores: Object.fromEntries(
        Object.entries(result.aggregatedUsability.useCaseReadiness).map(([k, v]) => [k, v.score])
      ),
      dimensionScores: {
        conformance: result.aggregatedUsability.dimensionBreakdown.conformance.score,
        completeness: result.aggregatedUsability.dimensionBreakdown.completeness.score,
        plausibility: result.aggregatedUsability.dimensionBreakdown.plausibility.score,
        timeliness: result.aggregatedUsability.dimensionBreakdown.timeliness.score
      }
    };

    console.log(JSON.stringify(summary, null, 2));

    console.log('\n');
    console.log('Demo completed successfully!');
    console.log('\nAPI Endpoints available:');
    console.log('  GET  /api/demo/quick       - Run quick demo');
    console.log('  GET  /api/demo/live        - Run live demo');
    console.log('  POST /api/demo/run         - Run custom demo');
    console.log('  GET  /api/demo/sample-data - View sample data');
    console.log('  GET  /api/demo/servers     - List available servers');
    console.log('\n');

  } catch (error) {
    console.error('\nDemo failed:', error);
    process.exit(1);
  }
}

function createScoreBar(score: number): string {
  const clampedScore = Math.max(0, Math.min(100, score));
  const filled = Math.round(clampedScore / 5);
  const empty = Math.max(0, 20 - filled);
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function getLevelIcon(level: string): string {
  switch (level) {
    case 'excellent': return '✅';
    case 'good': return '🟢';
    case 'acceptable': return '🟡';
    case 'needs_improvement': return '🟠';
    case 'not_ready': return '🔴';
    default: return '⚪';
  }
}

main();
