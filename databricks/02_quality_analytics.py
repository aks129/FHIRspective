# Databricks notebook source
# MAGIC %md
# MAGIC # FHIR Quality Analytics
# MAGIC
# MAGIC This notebook provides comprehensive analytics on FHIR data quality assessments.
# MAGIC
# MAGIC ## Analytics Included
# MAGIC - Quality trends over time
# MAGIC - Resource-level analysis
# MAGIC - Issue patterns and root causes
# MAGIC - Cross-organizational benchmarks
# MAGIC - Dimension-specific insights

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup

# COMMAND ----------

from pyspark.sql.functions import *
from pyspark.sql.window import Window
import matplotlib.pyplot as plt
import seaborn as sns

# Use the FHIRspective database
spark.sql("USE fhirspective")

# Set visualization style
sns.set_style("whitegrid")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Overall Quality Metrics

# COMMAND ----------

# Overall quality summary
overall_summary = spark.sql("""
SELECT
  COUNT(DISTINCT assessment_id) as total_assessments,
  COUNT(DISTINCT user_id) as total_users,
  SUM(total_resources_evaluated) as total_resources,
  SUM(total_issues) as total_issues,
  ROUND(AVG(avg_quality_score), 2) as overall_avg_score,
  ROUND(STDDEV(avg_quality_score), 2) as score_std_dev
FROM quality_trends_daily
""")

display(overall_summary)

# COMMAND ----------

# Quality score distribution by resource type
resource_quality = spark.sql("""
SELECT
  resource_type,
  COUNT(DISTINCT assessment_id) as assessment_count,
  ROUND(AVG(quality_score), 2) as avg_quality_score,
  ROUND(MIN(quality_score), 2) as min_score,
  ROUND(MAX(quality_score), 2) as max_score,
  ROUND(PERCENTILE(quality_score, 0.5), 2) as median_score
FROM assessment_results
GROUP BY resource_type
ORDER BY avg_quality_score DESC
""")

display(resource_quality)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Quality Trends Analysis

# COMMAND ----------

# 30-day quality trends
trends_30d = spark.sql("""
SELECT
  date,
  resource_type,
  avg_quality_score,
  total_resources_evaluated,
  total_issues
FROM quality_trends_daily
WHERE date >= DATE_SUB(CURRENT_DATE(), 30)
ORDER BY date DESC, resource_type
""")

display(trends_30d)

# COMMAND ----------

# Calculate week-over-week change
wow_change = spark.sql("""
WITH weekly_avg AS (
  SELECT
    WEEKOFYEAR(date) as week,
    YEAR(date) as year,
    resource_type,
    AVG(avg_quality_score) as avg_score
  FROM quality_trends_daily
  WHERE date >= DATE_SUB(CURRENT_DATE(), 60)
  GROUP BY WEEKOFYEAR(date), YEAR(date), resource_type
),
with_lag AS (
  SELECT
    week,
    year,
    resource_type,
    avg_score,
    LAG(avg_score) OVER (PARTITION BY resource_type ORDER BY year, week) as prev_week_score
  FROM weekly_avg
)
SELECT
  week,
  year,
  resource_type,
  ROUND(avg_score, 2) as current_score,
  ROUND(prev_week_score, 2) as previous_score,
  ROUND(avg_score - prev_week_score, 2) as score_change,
  ROUND(((avg_score - prev_week_score) / prev_week_score) * 100, 2) as pct_change
FROM with_lag
WHERE prev_week_score IS NOT NULL
ORDER BY year DESC, week DESC, resource_type
""")

display(wow_change)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Issue Analysis

# COMMAND ----------

# Top 10 most common issues
top_issues = spark.sql("""
SELECT
  dimension,
  severity,
  message,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT assessment_id) as affected_assessments,
  ROUND(AVG(CASE WHEN is_auto_fixed THEN 1 ELSE 0 END) * 100, 2) as auto_fix_rate_pct
FROM validation_issues
GROUP BY dimension, severity, message
ORDER BY occurrence_count DESC
LIMIT 10
""")

display(top_issues)

# COMMAND ----------

# Issues by dimension
issues_by_dimension = spark.sql("""
SELECT
  dimension,
  severity,
  COUNT(*) as issue_count,
  COUNT(DISTINCT resource_type) as affected_resource_types
FROM validation_issues
GROUP BY dimension, severity
ORDER BY dimension, severity
""")

display(issues_by_dimension)

# COMMAND ----------

# Issue severity distribution
severity_dist = spark.sql("""
SELECT
  severity,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM validation_issues
GROUP BY severity
ORDER BY count DESC
""")

display(severity_dist)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Resource-Specific Analysis

# COMMAND ----------

# Dimension scores by resource type
dimension_scores = spark.sql("""
SELECT
  resource_type,
  ROUND(AVG(completeness_score), 2) as avg_completeness,
  ROUND(AVG(conformity_score), 2) as avg_conformity,
  ROUND(AVG(plausibility_score), 2) as avg_plausibility,
  ROUND(AVG(timeliness_score), 2) as avg_timeliness,
  ROUND(AVG(calculability_score), 2) as avg_calculability
FROM assessment_results
GROUP BY resource_type
ORDER BY resource_type
""")

display(dimension_scores)

# COMMAND ----------

# Resource types with declining quality
declining_quality = spark.sql("""
WITH recent_scores AS (
  SELECT
    resource_type,
    AVG(CASE WHEN date >= DATE_SUB(CURRENT_DATE(), 7) THEN avg_quality_score END) as last_week_score,
    AVG(CASE WHEN date >= DATE_SUB(CURRENT_DATE(), 14) AND date < DATE_SUB(CURRENT_DATE(), 7) THEN avg_quality_score END) as prev_week_score
  FROM quality_trends_daily
  WHERE date >= DATE_SUB(CURRENT_DATE(), 14)
  GROUP BY resource_type
)
SELECT
  resource_type,
  ROUND(last_week_score, 2) as last_week,
  ROUND(prev_week_score, 2) as previous_week,
  ROUND(last_week_score - prev_week_score, 2) as change,
  CASE
    WHEN last_week_score < prev_week_score THEN '⚠️ Declining'
    WHEN last_week_score > prev_week_score THEN '✅ Improving'
    ELSE '➡️ Stable'
  END as trend
FROM recent_scores
WHERE last_week_score IS NOT NULL AND prev_week_score IS NOT NULL
ORDER BY change
""")

display(declining_quality)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Cross-Organizational Benchmarks

# COMMAND ----------

# Calculate percentiles for benchmarking
benchmarks = spark.sql("""
SELECT
  resource_type,
  ROUND(PERCENTILE(avg_quality_score, 0.25), 2) as p25,
  ROUND(PERCENTILE(avg_quality_score, 0.50), 2) as median,
  ROUND(PERCENTILE(avg_quality_score, 0.75), 2) as p75,
  ROUND(AVG(avg_quality_score), 2) as mean,
  COUNT(DISTINCT user_id) as organizations
FROM quality_trends_daily
GROUP BY resource_type
ORDER BY mean DESC
""")

display(benchmarks)

# COMMAND ----------

# User performance vs benchmarks
user_vs_benchmark = spark.sql("""
WITH user_scores AS (
  SELECT
    user_id,
    resource_type,
    AVG(avg_quality_score) as user_avg_score
  FROM quality_trends_daily
  WHERE date >= DATE_SUB(CURRENT_DATE(), 30)
  GROUP BY user_id, resource_type
),
benchmarks AS (
  SELECT
    resource_type,
    PERCENTILE(avg_quality_score, 0.50) as median_score
  FROM quality_trends_daily
  WHERE date >= DATE_SUB(CURRENT_DATE(), 30)
  GROUP BY resource_type
)
SELECT
  u.user_id,
  u.resource_type,
  ROUND(u.user_avg_score, 2) as user_score,
  ROUND(b.median_score, 2) as industry_median,
  ROUND(u.user_avg_score - b.median_score, 2) as difference,
  CASE
    WHEN u.user_avg_score >= b.median_score THEN '✅ Above Median'
    ELSE '⚠️ Below Median'
  END as performance
FROM user_scores u
JOIN benchmarks b ON u.resource_type = b.resource_type
ORDER BY u.user_id, difference DESC
""")

display(user_vs_benchmark)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Quality Improvement Opportunities

# COMMAND ----------

# Resources with lowest scores (improvement targets)
improvement_targets = spark.sql("""
WITH latest_scores AS (
  SELECT
    resource_type,
    AVG(quality_score) as avg_score,
    COUNT(*) as assessment_count
  FROM assessment_results
  WHERE execution_date >= DATE_SUB(CURRENT_DATE(), 30)
  GROUP BY resource_type
)
SELECT
  resource_type,
  ROUND(avg_score, 2) as current_score,
  assessment_count,
  ROUND(90 - avg_score, 2) as points_to_target,
  CASE
    WHEN avg_score < 50 THEN 'Critical - Immediate Action Required'
    WHEN avg_score < 75 THEN 'Medium - Improvement Needed'
    WHEN avg_score < 90 THEN 'Low - Minor Improvements'
    ELSE 'Good - Maintain Quality'
  END as priority
FROM latest_scores
ORDER BY avg_score
LIMIT 10
""")

display(improvement_targets)

# COMMAND ----------

# Most impactful issues to fix
impactful_issues = spark.sql("""
SELECT
  dimension,
  message,
  COUNT(DISTINCT assessment_id) as affected_assessments,
  COUNT(*) as total_occurrences,
  SUM(CASE WHEN is_auto_fixed THEN 1 ELSE 0 END) as auto_fixable,
  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT assessment_id), 2) as avg_per_assessment
FROM validation_issues
WHERE detected_at >= CURRENT_TIMESTAMP() - INTERVAL 30 DAYS
GROUP BY dimension, message
HAVING COUNT(DISTINCT assessment_id) >= 3
ORDER BY total_occurrences DESC
LIMIT 15
""")

display(impactful_issues)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Export Analytics Results

# COMMAND ----------

# Save key metrics for API consumption
spark.sql("""
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  CURRENT_DATE() as report_date,
  COUNT(DISTINCT a.assessment_id) as total_assessments,
  ROUND(AVG(r.quality_score), 2) as avg_quality_score,
  SUM(i.issue_count) as total_issues,
  COUNT(DISTINCT a.user_id) as active_users
FROM assessments_meta a
JOIN assessment_results r ON a.assessment_id = r.assessment_id
LEFT JOIN (
  SELECT assessment_id, COUNT(*) as issue_count
  FROM validation_issues
  GROUP BY assessment_id
) i ON a.assessment_id = i.assessment_id
WHERE a.created_at >= DATE_SUB(CURRENT_DATE(), 30)
""")

print("✅ Analytics complete. Summary view created.")
