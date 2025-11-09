# FHIRspective Databricks Integration

This directory contains Databricks notebooks for advanced analytics on FHIR data quality assessments.

## Overview

The Databricks integration provides:

- **Data Lake Storage**: Store assessment results in Delta Lake for long-term retention
- **Historical Trends**: Analyze quality metrics over time
- **Benchmarking**: Compare against industry standards
- **Advanced Analytics**: Custom queries and visualizations
- **ML Predictions**: (Future) Predict quality scores and identify anomalies

## Notebooks

### 01_ingest_fhir_assessments.py
**Purpose**: Ingest assessment data into Delta Lake

**Features**:
- Create Delta Lake tables (assessments_meta, assessment_results, validation_issues, quality_trends_daily)
- Ingest data from API or files
- Update daily trend aggregations
- Data quality checks

**Tables Created**:
- `assessments_meta`: Assessment configuration and metadata
- `assessment_results`: Individual resource results (partitioned by date and resource type)
- `validation_issues`: Detailed validation issues (partitioned by date)
- `quality_trends_daily`: Aggregated daily metrics for fast querying

### 02_quality_analytics.py
**Purpose**: Comprehensive quality analytics and reporting

**Features**:
- Overall quality metrics
- 30-day trends analysis
- Week-over-week comparisons
- Top issues identification
- Resource-specific dimension analysis
- Cross-organizational benchmarks
- Improvement recommendations

## Setup Instructions

### 1. Create Databricks Workspace

1. Sign up for Databricks (AWS, Azure, or GCP)
2. Create a new workspace
3. Note your workspace URL (e.g., `https://your-workspace.cloud.databricks.com`)

### 2. Generate Access Token

1. In Databricks, go to **User Settings → Developer → Access Tokens**
2. Click **Generate New Token**
3. Give it a name (e.g., "FHIRspective Integration")
4. Set expiration (90 days recommended)
5. Copy the token and save it securely

### 3. Create Cluster (Optional)

For SQL queries, create a cluster:

1. Go to **Compute** in Databricks
2. Click **Create Cluster**
3. Configure:
   - Name: "FHIRspective Analytics"
   - Cluster Mode: Single Node (for dev) or Standard (for production)
   - Runtime: Latest LTS version with Delta Lake
   - Node Type: Standard_DS3_v2 (Azure) or m5.xlarge (AWS)
4. Copy the Cluster ID

### 4. Import Notebooks

1. In Databricks, go to **Workspace**
2. Right-click on your folder → **Import**
3. Upload all `.py` files from this directory
4. Or use Databricks CLI:
   ```bash
   databricks workspace import_dir databricks/ /Users/your-email@example.com/fhirspective
   ```

### 5. Configure FHIRspective

1. In FHIRspective, go to **Settings**
2. Enter:
   - Workspace URL: `https://your-workspace.cloud.databricks.com`
   - Access Token: `dapi...` (from step 2)
   - Cluster ID: (optional, from step 3)
3. Click **Test Connection**
4. Click **Save Configuration**

### 6. Initial Setup

Run the ingestion notebook to create tables:

```python
# In Databricks, open 01_ingest_fhir_assessments.py
# Run the "Create Delta Lake Tables" section
# Tables will be created in the `fhirspective` database
```

## Usage

### Sync Assessment Data

After completing an assessment in FHIRspective:

1. Go to the assessment details page
2. Click **Sync to Databricks**
3. Data will be pushed to Delta Lake automatically

Or use the API:
```bash
curl -X POST https://your-app.vercel.app/api/databricks/sync/123
```

### View Analytics

1. Open the Analytics page in FHIRspective
2. View trends, benchmarks, and insights powered by Databricks
3. Or run queries directly in Databricks notebooks

### Run Custom Queries

In Databricks SQL Editor or notebooks:

```sql
-- View recent assessments
SELECT * FROM fhirspective.assessments_meta
ORDER BY created_at DESC
LIMIT 10;

-- Calculate average quality by resource type
SELECT
  resource_type,
  AVG(quality_score) as avg_score,
  COUNT(*) as count
FROM fhirspective.assessment_results
GROUP BY resource_type
ORDER BY avg_score DESC;

-- Find most common issues
SELECT
  dimension,
  message,
  COUNT(*) as count
FROM fhirspective.validation_issues
GROUP BY dimension, message
ORDER BY count DESC
LIMIT 10;
```

## Data Schema

### assessments_meta
```
assessment_id: STRING
user_id: INT
server_url: STRING
execution_date: TIMESTAMP
resources: ARRAY<STRING>
sample_size: INT
validator: STRING
framework: STRING
status: STRING
overall_score: DOUBLE
created_at: TIMESTAMP
```

### assessment_results
```
result_id: STRING
assessment_id: STRING
resource_type: STRING
resource_id: STRING
quality_score: DOUBLE
completeness_score: DOUBLE
conformity_score: DOUBLE
plausibility_score: DOUBLE
timeliness_score: DOUBLE
calculability_score: DOUBLE
execution_date: DATE (PARTITION)
created_at: TIMESTAMP
```

### validation_issues
```
issue_id: STRING
result_id: STRING
assessment_id: STRING
resource_type: STRING
resource_id: STRING
dimension: STRING
severity: STRING
message: STRING
field_path: STRING
is_auto_fixed: BOOLEAN
detected_at: TIMESTAMP (PARTITION)
```

### quality_trends_daily
```
date: DATE
user_id: INT
resource_type: STRING
avg_quality_score: DOUBLE
total_resources_evaluated: LONG
total_issues: LONG
assessment_count: INT
updated_at: TIMESTAMP
```

## Best Practices

### Performance
- Data is partitioned by date and resource type for efficient queries
- Use `WHERE` clauses on partition columns when possible
- Regularly optimize tables: `OPTIMIZE fhirspective.assessment_results`

### Security
- Rotate access tokens every 90 days
- Use workspace-level permissions to control access
- Consider encrypting sensitive data

### Costs
- Use serverless SQL warehouses for ad-hoc queries
- Schedule notebooks during off-peak hours
- Monitor DBU consumption in the account console

### Maintenance
- Run `VACUUM` periodically to clean up old files:
  ```sql
  VACUUM fhirspective.assessment_results RETAIN 30 HOURS;
  ```
- Monitor table sizes and storage usage
- Archive old assessments if needed

## Troubleshooting

### Connection Failed
- Verify workspace URL is correct (include `https://`)
- Check that access token is valid and not expired
- Ensure network connectivity to Databricks

### Sync Errors
- Check cluster is running (if cluster ID provided)
- Verify tables exist (`SHOW TABLES IN fhirspective`)
- Check assessment has completed status

### Query Performance
- Ensure queries filter on partition columns
- Use `OPTIMIZE` to compact small files
- Consider using materialized views for common queries

## Support

For issues or questions:
- Check Databricks documentation: https://docs.databricks.com
- Review FHIRspective logs for sync errors
- Contact your Databricks support team for platform issues

## Future Enhancements

Planned features:
- ML-based quality prediction models
- Anomaly detection for data quality issues
- Automated quality improvement recommendations
- Real-time streaming data ingestion
- Cross-organization anonymous benchmarking
