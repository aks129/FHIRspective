# FHIR Server Setup and Testing Guide

This guide explains how to set up and connect to FHIR servers for testing FHIRspective, including local Aidbox setup and public test servers.

## Table of Contents
1. [In-Memory Resource Caching](#in-memory-resource-caching)
2. [Local Aidbox FHIR Server](#local-aidbox-fhir-server)
3. [Public FHIR Test Servers](#public-fhir-test-servers)
4. [API Endpoints](#api-endpoints)

---

## In-Memory Resource Caching

FHIRspective now caches all fetched FHIR resources in memory during assessments. This provides:

- **Quick Access**: Resources are available for inspection during and after assessment
- **Performance**: No need to re-fetch resources from the FHIR server
- **Testing**: Easy access to sample data for development and testing

### Features

- Automatic caching when resources are fetched during assessment
- Resources organized by assessment ID and resource type
- Cache statistics including total resources and memory usage
- API endpoints to retrieve cached resources

### API Endpoints

#### Get Cached Resources
```bash
GET /api/assessments/:id/cached-resources?resourceType=Patient

# Response
{
  "assessmentId": 1,
  "resourceType": "Patient",
  "count": 50,
  "resources": [
    {
      "resourceType": "Patient",
      "resourceId": "example-patient-1",
      "resource": { /* Full FHIR Patient resource */ },
      "assessmentId": 1,
      "fetchedAt": "2025-11-09T13:00:00.000Z"
    },
    ...
  ]
}
```

#### Get Cache Statistics
```bash
GET /api/assessments/:id/cache-stats

# Response
{
  "assessmentId": 1,
  "totalResources": 150,
  "resourceTypes": {
    "Patient": 50,
    "Observation": 75,
    "Condition": 25
  },
  "cacheSize": "245.67 KB"
}
```

---

## Local Aidbox FHIR Server

[Aidbox](https://docs.aidbox.app/) by Health Samurai is a production-ready FHIR server that's easy to run locally with Docker.

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB of available RAM

### Quick Start

A `docker-compose.yaml` file has been included in the repository. To start Aidbox:

```bash
# From the project root directory
docker compose up -d
```

This will:
1. Start a PostgreSQL database (port 5432)
2. Start Aidbox FHIR server (port 8080)

### Aidbox Configuration

- **Base URL**: `http://localhost:8080`
- **FHIR Endpoint**: `http://localhost:8080/fhir`
- **Admin UI**: `http://localhost:8080/`
- **Admin Password**: `qycsBtJZ2r`
- **FHIR Version**: R4 (4.0.1)
- **Compliance Mode**: Enabled

### Connecting FHIRspective to Local Aidbox

1. Start Aidbox: `docker compose up -d`
2. Wait for Aidbox to be healthy (check with `docker compose ps`)
3. In FHIRspective, add a new FHIR server connection:
   - **URL**: `http://localhost:8080/fhir`
   - **Auth Type**: None (or configure auth in Aidbox if needed)
   - **Timeout**: 30 seconds

### Loading Sample Data into Aidbox

Aidbox doesn't come pre-populated with data. You can load sample data using:

#### Option 1: Upload via Aidbox UI
1. Navigate to `http://localhost:8080/`
2. Log in with admin credentials
3. Use the REST Console to create FHIR resources

#### Option 2: Using curl/Postman
```bash
# Example: Create a Patient resource
curl -X POST http://localhost:8080/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Patient",
    "name": [{
      "family": "Doe",
      "given": ["John"]
    }],
    "gender": "male",
    "birthDate": "1980-01-01"
  }'
```

#### Option 3: Load Synthea Data
[Synthea](https://github.com/synthetichealth/synthea) generates realistic synthetic patient data:

1. Generate Synthea data:
```bash
git clone https://github.com/synthetichealth/synthea.git
cd synthea
./run_synthea -p 10  # Generate 10 patients
```

2. Upload to Aidbox using a script or bulk upload tool

### Stopping Aidbox

```bash
docker compose down           # Stop and remove containers
docker compose down -v        # Stop, remove containers, and delete data volumes
```

---

## Public FHIR Test Servers

For quick testing without local setup, use these public FHIR test servers:

### 1. HAPI FHIR Test Server (Recommended)

**Best for**: Quick testing with pre-populated data

- **Base URL**: `http://hapi.fhir.org/baseR4`
- **FHIR Version**: R4
- **Authentication**: None
- **Sample Data**: Yes (includes Patient, Observation, Condition, etc.)
- **Limitations**:
  - Read-only for most resources
  - Rate limits may apply
  - Data is periodically reset
  - Public server, so don't use real patient data

**FHIRspective Configuration**:
```
URL: http://hapi.fhir.org/baseR4
Auth Type: None
Timeout: 60 seconds (public server may be slower)
```

### 2. test.fhir.org

**Best for**: Testing different FHIR versions

- **Base URL**: `https://test.fhir.org/r4`
- **FHIR Version**: R4 (also R3, R5 available)
- **Authentication**: None
- **Sample Data**: Yes
- **Limitations**: Similar to HAPI

**FHIRspective Configuration**:
```
URL: https://test.fhir.org/r4
Auth Type: None
Timeout: 60 seconds
```

### 3. Logica Sandbox

**Best for**: OAuth testing and realistic healthcare scenarios

- **Base URL**: `https://fhir.logicahealth.org/FHIRspective/open`
- **FHIR Version**: R4
- **Authentication**: Optional OAuth2
- **Sample Data**: Configurable
- **Note**: Requires account creation for private sandboxes

### 4. SMART Health IT Sandbox

**Best for**: SMART on FHIR app testing

- **Base URL**: `https://launch.smarthealthit.org/v/r4/fhir`
- **FHIR Version**: R4
- **Authentication**: OAuth2 (SMART)
- **Sample Data**: Yes
- **Note**: Primarily for SMART app testing

---

## Testing Your Setup

### 1. Test FHIR Server Connection

Use FHIRspective's built-in connection test:

1. Navigate to "Connect" step
2. Enter FHIR server URL
3. Click "Test Connection"
4. Verify successful connection and FHIR version

### 2. Run a Sample Assessment

1. Connect to a FHIR server (e.g., HAPI test server)
2. Configure assessment:
   - **Resources**: Patient, Observation
   - **Sample Size**: 10 or 25
   - **Validator**: US Core
3. Start the assessment
4. Monitor progress in the Execute step
5. View results and cached resources

### 3. Access Cached Resources

After running an assessment, you can retrieve cached resources:

```bash
# Get all Patient resources from assessment 1
curl http://localhost:5000/api/assessments/1/cached-resources?resourceType=Patient

# Get cache statistics
curl http://localhost:5000/api/assessments/1/cache-stats
```

---

## Recommended Workflow

### For Development
1. Use **HAPI FHIR Test Server** for quick testing
2. Resources are cached in memory for fast access
3. No local setup required

### For Production Testing
1. Run **local Aidbox** with realistic data
2. Load Synthea-generated patient data
3. Full control over data and configuration

### For Integration Testing
1. Use **test.fhir.org** or **Logica Sandbox**
2. Test OAuth flows if needed
3. Validate against different FHIR implementations

---

## Troubleshooting

### Aidbox won't start
- Check Docker is running: `docker ps`
- Check ports are available: `netstat -an | grep 8080`
- View logs: `docker compose logs aidbox`

### Connection timeout to public servers
- Increase timeout to 60-90 seconds
- Public servers may have rate limits
- Try a different server

### No resources found
- Verify the FHIR server has data
- Check the resource type is supported
- Review logs in the assessment execution step

### Cache not working
- Verify assessment completed successfully
- Check server logs for errors
- Resources are only cached during assessment execution

---

## Next Steps

1. ✅ Connect to a FHIR server (local or public)
2. ✅ Run your first assessment with sample size 10-25
3. ✅ View cached resources via API
4. 📊 Analyze quality scores and issues
5. 📤 Export results to PDF/CSV

---

## Additional Resources

- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [Aidbox Documentation](https://docs.aidbox.app/)
- [HAPI FHIR](https://hapifhir.io/)
- [Synthea Patient Generator](https://github.com/synthetichealth/synthea)
- [US Core Implementation Guide](http://hl7.org/fhir/us/core/)
