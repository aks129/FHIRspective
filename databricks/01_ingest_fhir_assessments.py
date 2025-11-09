# Databricks notebook source
# MAGIC %md
# MAGIC # FHIR Assessment Data Ingestion
# MAGIC
# MAGIC This notebook ingests FHIR assessment data from the FHIRspective application
# MAGIC and stores it in Delta Lake tables for analytics.
# MAGIC
# MAGIC ## Setup Requirements
# MAGIC - Database: `fhirspective` created
# MAGIC - API endpoint configured or data files available
# MAGIC
# MAGIC ## Tables Created
# MAGIC - `assessments_meta`: Assessment configuration and metadata
# MAGIC - `assessment_results`: Individual resource assessment results
# MAGIC - `validation_issues`: Detailed validation issues
# MAGIC - `quality_trends_daily`: Daily aggregated quality metrics

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuration

# COMMAND ----------

# Database configuration
database_name = "fhirspective"
spark.sql(f"CREATE DATABASE IF NOT EXISTS {database_name}")
spark.sql(f"USE {database_name}")

# API endpoint (if pulling data via REST)
api_base_url = "https://your-fhirspective-instance.vercel.app"

# Storage configuration (if using cloud storage)
storage_path = "s3://your-bucket/fhirspective/" # or dbfs:/mnt/fhirspective/

# COMMAND ----------

# MAGIC %md
# MAGIC ## Create Delta Lake Tables

# COMMAND ----------

# Assessment Metadata Table
spark.sql("""
CREATE TABLE IF NOT EXISTS assessments_meta (
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
COMMENT 'FHIR assessment metadata and configuration'
""")

# Assessment Results Table (Partitioned for performance)
spark.sql("""
CREATE TABLE IF NOT EXISTS assessment_results (
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
COMMENT 'Individual resource assessment results'
""")

# Validation Issues Table
spark.sql("""
CREATE TABLE IF NOT EXISTS validation_issues (
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
COMMENT 'Detailed validation issues from assessments'
""")

# Quality Trends Table (Aggregated)
spark.sql("""
CREATE TABLE IF NOT EXISTS quality_trends_daily (
  date DATE,
  user_id INT,
  resource_type STRING,
  avg_quality_score DOUBLE,
  total_resources_evaluated LONG,
  total_issues LONG,
  assessment_count INT,
  updated_at TIMESTAMP
) USING DELTA
COMMENT 'Daily aggregated quality metrics for trend analysis'
""")

print("✅ Delta Lake tables created successfully")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Ingestion Functions

# COMMAND ----------

from pyspark.sql.functions import *
from pyspark.sql.types import *
import requests
import json

def ingest_from_api(assessment_id):
    """
    Fetch assessment data from FHIRspective API and ingest into Delta Lake
    """
    # Fetch assessment metadata
    response = requests.get(f"{api_base_url}/api/assessments/{assessment_id}")
    assessment_data = response.json()

    # Fetch results
    results_response = requests.get(f"{api_base_url}/api/assessments/{assessment_id}/results")
    results_data = results_response.json()

    # Transform and load
    ingest_assessment_data(assessment_data, results_data)

def ingest_from_file(file_path):
    """
    Ingest assessment data from JSON file
    """
    df = spark.read.json(file_path)
    df.write.format("delta").mode("append").save(storage_path + "raw_assessments")
    print(f"✅ Ingested data from {file_path}")

def ingest_assessment_data(assessment, results):
    """
    Core ingestion logic - transform and write to Delta tables
    """
    # 1. Write Assessment Metadata
    assessment_df = spark.createDataFrame([{
        'assessment_id': str(assessment['id']),
        'user_id': assessment['userId'],
        'server_url': f"server_{assessment['serverId']}",
        'execution_date': assessment.get('completedAt') or assessment['createdAt'],
        'resources': assessment['resources'],
        'sample_size': assessment['sampleSize'],
        'validator': assessment['validator'],
        'framework': assessment['qualityFramework'],
        'status': assessment['status'],
        'overall_score': results.get('overallQualityScore', 0),
        'created_at': assessment['createdAt']
    }])

    assessment_df.write.format("delta").mode("append").saveAsTable("assessments_meta")

    # 2. Write Assessment Results
    if 'resourceScores' in results:
        results_data = []
        for score in results['resourceScores']:
            results_data.append({
                'result_id': f"{assessment['id']}_{score['resourceType']}_{int(time.time())}",
                'assessment_id': str(assessment['id']),
                'resource_type': score['resourceType'],
                'resource_id': f"{score['resourceType']}_batch",
                'quality_score': score['overallScore'],
                'completeness_score': score['dimensionScores'].get('completeness', 0),
                'conformity_score': score['dimensionScores'].get('conformity', 0),
                'plausibility_score': score['dimensionScores'].get('plausibility', 0),
                'timeliness_score': score['dimensionScores'].get('timeliness'),
                'calculability_score': score['dimensionScores'].get('calculability'),
                'execution_date': assessment.get('completedAt', assessment['createdAt']).split('T')[0],
                'created_at': current_timestamp()
            })

        results_df = spark.createDataFrame(results_data)
        results_df.write.format("delta").mode("append").partitionBy("execution_date", "resource_type").saveAsTable("assessment_results")

    # 3. Write Validation Issues
    if 'topIssues' in results:
        issues_data = []
        for issue in results['topIssues']:
            issues_data.append({
                'issue_id': f"{assessment['id']}_{issue.get('resourceType', 'unknown')}_{int(time.time())}_{hash(issue['message'])}",
                'result_id': f"{assessment['id']}_{issue.get('resourceType', 'unknown')}",
                'assessment_id': str(assessment['id']),
                'resource_type': issue.get('resourceType', 'unknown'),
                'resource_id': issue.get('resourceId', 'unknown'),
                'dimension': issue['dimension'],
                'severity': issue['severity'],
                'message': issue['message'],
                'field_path': issue.get('field', ''),
                'is_auto_fixed': issue.get('autoFixed', False),
                'detected_at': current_timestamp()
            })

        issues_df = spark.createDataFrame(issues_data)
        issues_df.write.format("delta").mode("append").partitionBy("detected_at").saveAsTable("validation_issues")

    print(f"✅ Ingested assessment {assessment['id']} successfully")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Update Trend Aggregations

# COMMAND ----------

def update_quality_trends():
    """
    Aggregate daily quality metrics for trend analysis
    """
    spark.sql("""
    MERGE INTO quality_trends_daily AS target
    USING (
      SELECT
        DATE(execution_date) as date,
        a.user_id,
        r.resource_type,
        AVG(r.quality_score) as avg_quality_score,
        COUNT(*) as total_resources_evaluated,
        COALESCE(SUM(i.issue_count), 0) as total_issues,
        COUNT(DISTINCT r.assessment_id) as assessment_count,
        CURRENT_TIMESTAMP() as updated_at
      FROM assessment_results r
      JOIN assessments_meta a ON r.assessment_id = a.assessment_id
      LEFT JOIN (
        SELECT
          assessment_id,
          resource_type,
          COUNT(*) as issue_count
        FROM validation_issues
        GROUP BY assessment_id, resource_type
      ) i ON r.assessment_id = i.assessment_id AND r.resource_type = i.resource_type
      WHERE DATE(r.execution_date) = CURRENT_DATE()
      GROUP BY DATE(r.execution_date), a.user_id, r.resource_type
    ) AS source
    ON target.date = source.date
      AND target.user_id = source.user_id
      AND target.resource_type = source.resource_type
    WHEN MATCHED THEN UPDATE SET
      avg_quality_score = source.avg_quality_score,
      total_resources_evaluated = source.total_resources_evaluated,
      total_issues = source.total_issues,
      assessment_count = source.assessment_count,
      updated_at = source.updated_at
    WHEN NOT MATCHED THEN INSERT *
    """)

    print("✅ Quality trends updated successfully")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Example Usage

# COMMAND ----------

# Example 1: Ingest from API
# ingest_from_api(assessment_id=1)

# Example 2: Ingest from file
# ingest_from_file("/dbfs/mnt/uploads/assessment_data.json")

# Example 3: Update trends
# update_quality_trends()

# Display table statistics
display(spark.sql("SELECT COUNT(*) as total_assessments FROM assessments_meta"))
display(spark.sql("SELECT resource_type, COUNT(*) as count FROM assessment_results GROUP BY resource_type"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## Data Quality Checks

# COMMAND ----------

# Check for duplicate assessments
display(spark.sql("""
SELECT assessment_id, COUNT(*) as count
FROM assessments_meta
GROUP BY assessment_id
HAVING count > 1
"""))

# Check data freshness
display(spark.sql("""
SELECT
  MAX(created_at) as latest_ingestion,
  DATEDIFF(CURRENT_DATE(), MAX(DATE(created_at))) as days_since_last_ingestion
FROM assessments_meta
"""))

# Quality score distribution
display(spark.sql("""
SELECT
  CASE
    WHEN quality_score >= 90 THEN 'Excellent (90-100)'
    WHEN quality_score >= 75 THEN 'Good (75-89)'
    WHEN quality_score >= 50 THEN 'Fair (50-74)'
    ELSE 'Poor (<50)'
  END as quality_category,
  COUNT(*) as count,
  ROUND(AVG(quality_score), 2) as avg_score
FROM assessment_results
GROUP BY quality_category
ORDER BY avg_score DESC
"""))
