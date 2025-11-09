import type { Assessment, AssessmentResult, DatabricksConfig } from '@shared/schema';

/**
 * Databricks Integration Service
 *
 * Handles all interactions with Databricks workspace including:
 * - Delta Lake data synchronization
 * - SQL Analytics queries
 * - Job execution and monitoring
 * - Cluster management
 */

interface DatabricksCluster {
  cluster_id: string;
  cluster_name: string;
  state: 'PENDING' | 'RUNNING' | 'RESTARTING' | 'TERMINATING' | 'TERMINATED' | 'ERROR';
}

interface DatabricksJob {
  job_id: number;
  run_id: number;
  state: {
    life_cycle_state: 'PENDING' | 'RUNNING' | 'TERMINATING' | 'TERMINATED' | 'SKIPPED';
    result_state?: 'SUCCESS' | 'FAILED' | 'CANCELED';
  };
}

interface SyncStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  recordsSynced?: number;
  startedAt: Date;
  completedAt?: Date;
}

export class DatabricksService {
  private workspaceUrl: string;
  private accessToken: string;
  private clusterId?: string;

  constructor(config: DatabricksConfig) {
    this.workspaceUrl = config.workspaceUrl.replace(/\/$/, ''); // Remove trailing slash
    this.accessToken = config.accessToken;
    this.clusterId = config.clusterId || undefined;
  }

  /**
   * Test connection to Databricks workspace
   */
  async testConnection(): Promise<{ success: boolean; message: string; clusterState?: string }> {
    try {
      // Try to fetch workspace info
      const response = await this.makeRequest('/api/2.0/clusters/list', 'GET');

      if (response.ok) {
        const data = await response.json();

        // Check if specified cluster exists and is running
        if (this.clusterId) {
          const cluster = data.clusters?.find((c: DatabricksCluster) => c.cluster_id === this.clusterId);
          if (!cluster) {
            return {
              success: false,
              message: `Cluster ${this.clusterId} not found`
            };
          }
          return {
            success: true,
            message: 'Successfully connected to Databricks workspace',
            clusterState: cluster.state
          };
        }

        return {
          success: true,
          message: 'Successfully connected to Databricks workspace'
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          message: `Failed to connect: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Sync assessment data to Delta Lake
   */
  async syncAssessment(
    assessment: Assessment,
    results: AssessmentResult[],
    onProgress?: (status: SyncStatus) => void
  ): Promise<{ success: boolean; message: string; recordsSynced?: number }> {
    const status: SyncStatus = {
      status: 'running',
      progress: 0,
      message: 'Starting data sync...',
      startedAt: new Date()
    };

    onProgress?.(status);

    try {
      // Step 1: Ensure Delta tables exist
      status.progress = 10;
      status.message = 'Ensuring Delta Lake tables exist...';
      onProgress?.(status);

      await this.ensureTablesExist();

      // Step 2: Transform assessment metadata
      status.progress = 25;
      status.message = 'Transforming assessment metadata...';
      onProgress?.(status);

      const assessmentData = this.transformAssessmentMetadata(assessment);

      // Step 3: Write assessment metadata
      status.progress = 40;
      status.message = 'Writing assessment metadata...';
      onProgress?.(status);

      await this.writeToTable('fhirspective.assessments_meta', [assessmentData]);

      // Step 4: Transform and write results
      status.progress = 55;
      status.message = 'Transforming assessment results...';
      onProgress?.(status);

      const resultsData = this.transformResults(assessment.id!, results);

      status.progress = 70;
      status.message = 'Writing assessment results...';
      onProgress?.(status);

      await this.writeToTable('fhirspective.assessment_results', resultsData);

      // Step 5: Extract and write issues
      status.progress = 85;
      status.message = 'Writing validation issues...';
      onProgress?.(status);

      const issuesData = this.transformIssues(assessment.id!, results);

      if (issuesData.length > 0) {
        await this.writeToTable('fhirspective.validation_issues', issuesData);
      }

      // Step 6: Update trend aggregations
      status.progress = 95;
      status.message = 'Updating quality trends...';
      onProgress?.(status);

      await this.updateTrends(assessment);

      // Complete
      status.status = 'completed';
      status.progress = 100;
      status.message = 'Data sync completed successfully';
      status.recordsSynced = resultsData.length + issuesData.length + 1;
      status.completedAt = new Date();
      onProgress?.(status);

      return {
        success: true,
        message: 'Assessment data synced successfully',
        recordsSynced: status.recordsSynced
      };

    } catch (error) {
      status.status = 'failed';
      status.message = `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      status.completedAt = new Date();
      onProgress?.(status);

      return {
        success: false,
        message: status.message
      };
    }
  }

  /**
   * Execute SQL query against Delta Lake
   */
  async executeQuery(sql: string): Promise<any> {
    if (!this.clusterId) {
      throw new Error('Cluster ID is required for query execution');
    }

    // Create SQL execution context
    const contextResponse = await this.makeRequest('/api/1.2/contexts/create', 'POST', {
      clusterId: this.clusterId,
      language: 'sql'
    });

    if (!contextResponse.ok) {
      throw new Error('Failed to create execution context');
    }

    const { id: contextId } = await contextResponse.json();

    try {
      // Execute command
      const execResponse = await this.makeRequest('/api/1.2/commands/execute', 'POST', {
        clusterId: this.clusterId,
        contextId,
        language: 'sql',
        command: sql
      });

      if (!execResponse.ok) {
        throw new Error('Failed to execute query');
      }

      const { id: commandId } = await execResponse.json();

      // Poll for results
      let attempts = 0;
      const maxAttempts = 60; // 1 minute timeout

      while (attempts < maxAttempts) {
        const statusResponse = await this.makeRequest(
          `/api/1.2/commands/status?clusterId=${this.clusterId}&contextId=${contextId}&commandId=${commandId}`,
          'GET'
        );

        const statusData = await statusResponse.json();

        if (statusData.status === 'Finished') {
          return statusData.results?.data || [];
        } else if (statusData.status === 'Error') {
          throw new Error(statusData.results?.cause || 'Query execution failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      throw new Error('Query execution timeout');

    } finally {
      // Clean up context
      await this.makeRequest('/api/1.2/contexts/destroy', 'POST', {
        clusterId: this.clusterId,
        contextId
      });
    }
  }

  /**
   * Get quality trends from Delta Lake
   */
  async getQualityTrends(userId: number, days: number = 30): Promise<any[]> {
    const sql = `
      SELECT
        date,
        resource_type,
        avg_quality_score,
        total_resources_evaluated,
        total_issues,
        assessment_count
      FROM fhirspective.quality_trends_daily
      WHERE user_id = ${userId}
        AND date >= DATE_SUB(CURRENT_DATE(), ${days})
      ORDER BY date DESC, resource_type
    `;

    return this.executeQuery(sql);
  }

  /**
   * Get benchmarking data
   */
  async getBenchmarks(resourceType?: string): Promise<any[]> {
    const resourceFilter = resourceType ? `WHERE resource_type = '${resourceType}'` : '';

    const sql = `
      SELECT
        resource_type,
        PERCENTILE(avg_quality_score, 0.25) as p25,
        PERCENTILE(avg_quality_score, 0.50) as median,
        PERCENTILE(avg_quality_score, 0.75) as p75,
        AVG(avg_quality_score) as mean,
        COUNT(DISTINCT user_id) as organizations
      FROM fhirspective.quality_trends_daily
      ${resourceFilter}
      GROUP BY resource_type
    `;

    return this.executeQuery(sql);
  }

  /**
   * Run Databricks job
   */
  async runJob(jobId: number, params?: Record<string, any>): Promise<{ runId: number }> {
    const response = await this.makeRequest('/api/2.1/jobs/run-now', 'POST', {
      job_id: jobId,
      notebook_params: params
    });

    if (!response.ok) {
      throw new Error('Failed to start job');
    }

    const { run_id } = await response.json();
    return { runId: run_id };
  }

  /**
   * Get job run status
   */
  async getJobStatus(runId: number): Promise<DatabricksJob['state']> {
    const response = await this.makeRequest(`/api/2.1/jobs/runs/get?run_id=${runId}`, 'GET');

    if (!response.ok) {
      throw new Error('Failed to get job status');
    }

    const data = await response.json();
    return data.state;
  }

  // Private helper methods

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<Response> {
    const url = `${this.workspaceUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  private async ensureTablesExist(): Promise<void> {
    const createDbSql = 'CREATE DATABASE IF NOT EXISTS fhirspective';
    await this.executeQuery(createDbSql);

    const tables = [
      {
        name: 'assessments_meta',
        schema: `
          CREATE TABLE IF NOT EXISTS fhirspective.assessments_meta (
            assessment_id STRING,
            user_id INT,
            server_url STRING,
            execution_date TIMESTAMP,
            resources ARRAY<STRING>,
            sample_size INT,
            validator STRING,
            framework STRING,
            status STRING,
            overall_score DOUBLE,
            created_at TIMESTAMP
          ) USING DELTA
        `
      },
      {
        name: 'assessment_results',
        schema: `
          CREATE TABLE IF NOT EXISTS fhirspective.assessment_results (
            result_id STRING,
            assessment_id STRING,
            resource_type STRING,
            resource_id STRING,
            quality_score DOUBLE,
            completeness_score DOUBLE,
            conformity_score DOUBLE,
            plausibility_score DOUBLE,
            timeliness_score DOUBLE,
            calculability_score DOUBLE,
            execution_date DATE,
            created_at TIMESTAMP
          ) USING DELTA
          PARTITIONED BY (execution_date, resource_type)
        `
      },
      {
        name: 'validation_issues',
        schema: `
          CREATE TABLE IF NOT EXISTS fhirspective.validation_issues (
            issue_id STRING,
            result_id STRING,
            assessment_id STRING,
            resource_type STRING,
            resource_id STRING,
            dimension STRING,
            severity STRING,
            message STRING,
            field_path STRING,
            is_auto_fixed BOOLEAN,
            detected_at TIMESTAMP
          ) USING DELTA
          PARTITIONED BY (detected_at)
        `
      },
      {
        name: 'quality_trends_daily',
        schema: `
          CREATE TABLE IF NOT EXISTS fhirspective.quality_trends_daily (
            date DATE,
            user_id INT,
            resource_type STRING,
            avg_quality_score DOUBLE,
            total_resources_evaluated LONG,
            total_issues LONG,
            assessment_count INT,
            updated_at TIMESTAMP
          ) USING DELTA
        `
      }
    ];

    for (const table of tables) {
      try {
        await this.executeQuery(table.schema);
      } catch (error) {
        console.error(`Failed to create table ${table.name}:`, error);
        // Continue with other tables
      }
    }
  }

  private transformAssessmentMetadata(assessment: Assessment): any {
    return {
      assessment_id: String(assessment.id),
      user_id: assessment.userId,
      server_url: assessment.serverId ? `server_${assessment.serverId}` : 'unknown',
      execution_date: assessment.completedAt || new Date(),
      resources: assessment.resources,
      sample_size: assessment.sampleSize,
      validator: assessment.validator,
      framework: assessment.qualityFramework,
      status: assessment.status,
      overall_score: 0, // Will be calculated from results
      created_at: assessment.createdAt || new Date()
    };
  }

  private transformResults(assessmentId: number, results: AssessmentResult[]): any[] {
    return results.map(result => ({
      result_id: `${assessmentId}_${result.resourceType}_${Date.now()}`,
      assessment_id: String(assessmentId),
      resource_type: result.resourceType,
      resource_id: `${result.resourceType}_batch`,
      quality_score: result.qualityScore,
      completeness_score: result.completenessScore,
      conformity_score: result.conformityScore,
      plausibility_score: result.plausibilityScore,
      timeliness_score: result.timelinessScore || null,
      calculability_score: result.calculabilityScore || null,
      execution_date: new Date().toISOString().split('T')[0],
      created_at: new Date()
    }));
  }

  private transformIssues(assessmentId: number, results: AssessmentResult[]): any[] {
    const issues: any[] = [];

    for (const result of results) {
      const resultIssues = Array.isArray(result.issues) ? result.issues : [];
      for (const issue of resultIssues) {
        issues.push({
          issue_id: `${assessmentId}_${result.resourceType}_${Date.now()}_${Math.random()}`,
          result_id: `${assessmentId}_${result.resourceType}`,
          assessment_id: String(assessmentId),
          resource_type: result.resourceType,
          resource_id: issue.resourceId || 'unknown',
          dimension: issue.dimension,
          severity: issue.severity,
          message: issue.message,
          field_path: issue.field || '',
          is_auto_fixed: issue.autoFixed || false,
          detected_at: new Date()
        });
      }
    }

    return issues;
  }

  private async writeToTable(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    // Convert data to SQL INSERT statements
    // In production, use Databricks' bulk load APIs or Delta Live Tables
    const insertSql = this.generateInsertStatement(tableName, data);
    await this.executeQuery(insertSql);
  }

  private generateInsertStatement(tableName: string, data: any[]): string {
    if (data.length === 0) return '';

    const columns = Object.keys(data[0]);
    const values = data.map(row => {
      const vals = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return String(val);
      });
      return `(${vals.join(', ')})`;
    });

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${values.join(', ')}`;
  }

  private async updateTrends(assessment: Assessment): Promise<void> {
    // This would typically be done via a scheduled job or trigger
    // For now, we'll execute a MERGE statement
    const mergeSql = `
      MERGE INTO fhirspective.quality_trends_daily AS target
      USING (
        SELECT
          DATE(execution_date) as date,
          ${assessment.userId} as user_id,
          resource_type,
          AVG(quality_score) as avg_quality_score,
          COUNT(*) as total_resources_evaluated,
          SUM(ARRAY_SIZE(issues)) as total_issues,
          1 as assessment_count,
          CURRENT_TIMESTAMP() as updated_at
        FROM fhirspective.assessment_results
        WHERE assessment_id = '${assessment.id}'
        GROUP BY DATE(execution_date), resource_type
      ) AS source
      ON target.date = source.date
        AND target.user_id = source.user_id
        AND target.resource_type = source.resource_type
      WHEN MATCHED THEN UPDATE SET
        avg_quality_score = (target.avg_quality_score * target.assessment_count + source.avg_quality_score) / (target.assessment_count + 1),
        total_resources_evaluated = target.total_resources_evaluated + source.total_resources_evaluated,
        total_issues = target.total_issues + source.total_issues,
        assessment_count = target.assessment_count + 1,
        updated_at = source.updated_at
      WHEN NOT MATCHED THEN INSERT *
    `;

    try {
      await this.executeQuery(mergeSql);
    } catch (error) {
      console.error('Failed to update trends:', error);
      // Non-critical, continue
    }
  }
}

export default DatabricksService;
