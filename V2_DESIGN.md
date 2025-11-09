# FHIRspective v2 - Design Document

## Overview
FHIRspective v2 enhances the FHIR data quality assessment platform with a modern, multi-page UI and powerful Databricks integration for advanced analytics and ML-based insights.

## Key Features

### 1. Modern Multi-Page UI

#### Pages
1. **Dashboard (/)**
   - Overview cards: Total assessments, average quality score, recent activity
   - Recent assessments table with quick actions
   - Quality trend chart (30-day view)
   - Quick-start button for new assessment

2. **Assessments (/assessments)**
   - Filterable, searchable list of all assessments
   - Status indicators (pending, running, completed, failed)
   - Bulk actions (export, delete, compare)
   - Assessment cards with key metrics
   - Pagination and sorting

3. **New Assessment (/assessments/new)**
   - Enhanced 4-step wizard (existing flow improved)
   - Saved configurations for quick re-run
   - Template library for common assessment types

4. **Assessment Details (/assessments/:id)**
   - Comprehensive results view
   - Interactive visualizations
   - Resource drill-down
   - Issue management and remediation
   - Export and sharing options
   - Databricks sync status

5. **Analytics (/analytics)**
   - Historical trend analysis
   - Cross-assessment comparisons
   - Benchmarking against industry standards
   - ML-powered quality predictions
   - Custom report builder
   - Databricks-powered insights

6. **Settings (/settings)**
   - User profile management
   - Databricks workspace configuration
   - FHIR server management
   - Export preferences
   - Notification settings

#### UI Improvements
- **Design System**: Enhanced shadcn/ui with custom theme
- **Responsive**: Mobile-first design
- **Performance**: Virtual scrolling for large datasets
- **Accessibility**: WCAG 2.1 AA compliance
- **Real-time**: WebSocket updates for long-running assessments
- **Dark Mode**: User-selectable theme

### 2. Databricks Integration

#### Architecture Components

##### Backend Services
1. **databricksService.ts**
   - Connection management (workspace URL, access token)
   - REST API client for Databricks
   - Delta Lake table operations
   - Job execution and monitoring
   - Notebook management

2. **dataLakeService.ts**
   - Schema management for assessment data
   - Data transformation and mapping
   - Streaming ingestion
   - Query interface for analytics

3. **analyticsService.ts**
   - Trend calculation
   - Benchmarking logic
   - ML model integration
   - Custom report generation

##### Data Schema (Delta Lake)

**Tables:**

```sql
-- Assessment metadata
assessments_meta
- assessment_id (STRING)
- user_id (INT)
- server_url (STRING)
- execution_date (TIMESTAMP)
- resources (ARRAY<STRING>)
- sample_size (INT)
- validator (STRING)
- framework (STRING)
- status (STRING)
- overall_score (DOUBLE)

-- Assessment results (partitioned by date and resource type)
assessment_results
- result_id (STRING)
- assessment_id (STRING)
- resource_type (STRING)
- resource_id (STRING)
- quality_score (DOUBLE)
- completeness_score (DOUBLE)
- conformity_score (DOUBLE)
- plausibility_score (DOUBLE)
- timeliness_score (DOUBLE)
- calculability_score (DOUBLE)
- execution_date (DATE) [PARTITION]
- resource_type (STRING) [PARTITION]

-- Validation issues
validation_issues
- issue_id (STRING)
- result_id (STRING)
- assessment_id (STRING)
- resource_type (STRING)
- resource_id (STRING)
- dimension (STRING)
- severity (STRING)
- message (STRING)
- field_path (STRING)
- is_auto_fixed (BOOLEAN)
- detected_at (TIMESTAMP)

-- Quality trends (aggregated for fast queries)
quality_trends_daily
- date (DATE)
- user_id (INT)
- resource_type (STRING)
- avg_quality_score (DOUBLE)
- total_resources_evaluated (LONG)
- total_issues (LONG)
- assessment_count (INT)

-- ML predictions
quality_predictions
- prediction_id (STRING)
- assessment_id (STRING)
- predicted_score (DOUBLE)
- confidence (DOUBLE)
- model_version (STRING)
- prediction_date (TIMESTAMP)
- actual_score (DOUBLE) [nullable]
```

##### API Endpoints

```
Databricks Configuration:
  GET  /api/databricks/config          # Get current config
  POST /api/databricks/config          # Save config (workspace URL, token)
  POST /api/databricks/test-connection # Test connection

Data Sync:
  POST /api/databricks/sync/:assessmentId  # Sync single assessment
  POST /api/databricks/sync-all            # Sync all assessments
  GET  /api/databricks/sync-status/:id     # Get sync job status

Analytics:
  GET  /api/analytics/trends              # Quality trends over time
  GET  /api/analytics/benchmarks          # Industry benchmarks
  GET  /api/analytics/predictions/:id     # ML predictions for assessment
  POST /api/analytics/custom-query        # Execute custom SQL on Delta Lake

Jobs:
  GET  /api/databricks/jobs               # List scheduled jobs
  POST /api/databricks/jobs               # Create new job
  POST /api/databricks/jobs/:id/run       # Trigger job run
```

##### Databricks Notebooks

**1. Data Ingestion Notebook** (`01_ingest_fhir_assessments.py`)
- Read from REST API or file upload
- Transform to Delta Lake schema
- Validate data quality
- Write to Delta tables with partitioning

**2. Analytics Notebook** (`02_quality_analytics.py`)
- Calculate aggregate metrics
- Generate trend reports
- Cross-assessment comparisons
- Dimension-specific analysis

**3. ML Training Notebook** (`03_train_quality_predictor.py`)
- Feature engineering from assessment history
- Train quality score prediction model
- Model evaluation and versioning
- Deploy to MLflow

**4. ML Prediction Notebook** (`04_predict_quality.py`)
- Load trained model from MLflow
- Generate predictions for new assessments
- Calculate confidence intervals
- Store predictions in Delta Lake

**5. Benchmarking Notebook** (`05_industry_benchmarks.py`)
- Aggregate cross-organization data (anonymized)
- Calculate percentiles and standards
- Generate benchmark reports
- Identify best practices

#### Data Flow

```
Assessment Execution
    ↓
Save Results to PostgreSQL
    ↓
Trigger Databricks Sync (async)
    ↓
Transform to Delta Lake Schema
    ↓
Write to Delta Tables
    ↓
[Branch 1] Update Trend Aggregations
    ↓
[Branch 2] Trigger ML Prediction Job
    ↓
[Branch 3] Update Benchmarks
    ↓
Results Available in Analytics Dashboard
```

#### Streaming Integration (Future)

For real-time analytics:
- **Apache Kafka/Kinesis**: Stream assessment events
- **Databricks Structured Streaming**: Process streams
- **Delta Lake**: Merge streaming data
- **Live Dashboard**: Real-time quality monitoring

### 3. Enhanced Features

#### Assessment Management
- **Templates**: Pre-configured assessment templates (e.g., "US Core Validation", "Analytics Readiness")
- **Scheduling**: Run assessments on schedule (hourly, daily, weekly)
- **Comparison**: Side-by-side comparison of multiple assessments
- **Versioning**: Track changes in FHIR server quality over time

#### Advanced Visualization
- **Time-series charts**: Quality trends over weeks/months
- **Heatmaps**: Resource type × dimension quality matrix
- **Sankey diagrams**: Issue flow and remediation tracking
- **Geospatial**: Quality by healthcare facility location (if available)

#### Collaboration
- **Sharing**: Share assessment results with team members
- **Comments**: Annotate specific issues or resources
- **Notifications**: Email/Slack alerts for quality degradation
- **Export**: Enhanced exports with charts and narratives

#### ML-Powered Insights
- **Quality Prediction**: Predict expected quality score before running assessment
- **Anomaly Detection**: Flag unusual patterns in FHIR data
- **Root Cause Analysis**: Identify common causes of quality issues
- **Recommendations**: AI-generated remediation suggestions

## Technical Implementation

### Frontend Stack
- **React 18** with TypeScript
- **React Router v6** (replacing Wouter for multi-page navigation)
- **TanStack Query v5** (React Query)
- **shadcn/ui v2** with enhanced components
- **Recharts** + **Chart.js** for advanced visualizations
- **Socket.io Client** for real-time updates
- **Zustand** for global state management

### Backend Stack
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM (replacing MemStorage)
- **Socket.io** for WebSocket connections
- **Bull** for background job queue
- **Redis** for caching and session storage
- **Databricks REST API SDK**

### Infrastructure
- **Vercel** for hosting (frontend + serverless API)
- **Neon PostgreSQL** for database
- **Upstash Redis** for caching/sessions
- **Databricks** for analytics and ML
- **AWS S3** for large file exports (optional)

### Security
- **JWT Authentication** with refresh tokens
- **OAuth 2.0** for Databricks integration
- **Row-level security** in PostgreSQL
- **Encrypted credentials** for FHIR servers and Databricks
- **Rate limiting** on API endpoints
- **CORS** configuration for production

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Set up PostgreSQL database and migrate from MemStorage
2. Implement user authentication and session management
3. Create new multi-page routing structure
4. Build dashboard homepage

### Phase 2: Databricks Integration (Week 3-4)
1. Set up Databricks workspace and Delta Lake
2. Implement databricksService and data sync
3. Create Delta Lake schemas
4. Build initial analytics notebooks

### Phase 3: Analytics UI (Week 5-6)
1. Build analytics dashboard
2. Implement trend visualization
3. Add assessment comparison features
4. Create ML prediction UI

### Phase 4: Enhancement & Polish (Week 7-8)
1. Add scheduling and automation
2. Implement notifications
3. Enhanced exports
4. Performance optimization
5. Testing and bug fixes

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/fhirspective

# Redis
REDIS_URL=redis://user:pass@host:6379

# Databricks
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=your-access-token
DATABRICKS_CLUSTER_ID=your-cluster-id

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Optional
AWS_S3_BUCKET=fhirspective-exports
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

### Databricks Setup

1. **Create Workspace**: Set up Databricks workspace (AWS/Azure/GCP)
2. **Create Cluster**: Configure cluster for analytics workloads
3. **Import Notebooks**: Upload provided notebooks
4. **Create Delta Database**: `CREATE DATABASE fhirspective;`
5. **Generate Token**: Create personal access token for API
6. **Configure Storage**: Set up external storage (S3/ADLS) if needed

## Success Metrics

### Performance
- Page load time < 2s
- Assessment execution time (same as v1)
- API response time < 500ms (p95)
- Databricks sync time < 5min for 1000 resources

### User Experience
- User satisfaction score > 4.5/5
- Dashboard engagement > 80% of users
- Analytics feature adoption > 50% of users
- Time to insights reduced by 60%

### Technical
- Test coverage > 80%
- Zero-downtime deployments
- Uptime > 99.9%
- Error rate < 0.1%

## Future Enhancements

- **Mobile App**: Native iOS/Android apps
- **API Access**: Public API for integrations
- **Marketplace**: Template and validator marketplace
- **Multi-language**: i18n support
- **White-labeling**: Customizable branding
- **SaaS Features**: Multi-tenancy, billing, usage limits
