# Medplum Demo Server Setup Guide

This guide will help you set up FHIRspective to work with your Medplum account for testing and demonstration purposes.

## What is Medplum?

[Medplum](https://www.medplum.com) is a cloud-based FHIR server and healthcare platform that provides a fully compliant FHIR R4 API. It's perfect for testing and development of FHIR applications.

## Prerequisites

1. A Medplum account (free tier available at [app.medplum.com](https://app.medplum.com))
2. FHIR resources uploaded to your Medplum project

## Quick Setup Instructions

### Step 1: Get Your Medplum Access Token

1. Log in to your Medplum account at [app.medplum.com](https://app.medplum.com)
2. Navigate to **Project Settings** → **Clients**
3. Either create a new Client or select an existing one
4. Copy the **Access Token** (also called Client Secret)
5. Keep this token secure - you'll need it in the next step

### Step 2: Configure FHIRspective

1. Start FHIRspective application (`npm run dev`)
2. On the **Connect** step, click the **"Medplum Demo"** button in the top-right corner
3. This will automatically fill in:
   - **FHIR Server URL**: `https://api.medplum.com/fhir/R4`
   - **Authentication Type**: Bearer Token
   - **Timeout**: 30 seconds
4. The authentication section will expand with instructions
5. Paste your **Access Token** from Step 1 into the **Bearer Token** field
6. Click **"Test Connection & Continue"** to verify the connection

### Step 3: Configure Your Assessment

1. Select the FHIR resources you want to assess (e.g., Patient, Observation, Condition)
2. Choose your **Sample Size**:
   - **100 records** - Quick test (recommended for first run)
   - **500 records** - Medium dataset
   - **1000 records** - Larger dataset
   - **All available records** - Complete analysis (may take longer)
3. Configure other assessment options as needed
4. Continue through the wizard

### Step 4: Run Assessment

1. Click **"Start Assessment"** to begin analyzing your Medplum data
2. Monitor the progress in real-time
3. View results when complete

## Uploading Test Data to Medplum

If you don't have data in your Medplum account yet, you can upload test data:

### Using Medplum UI

1. Go to [app.medplum.com](https://app.medplum.com)
2. Navigate to the **Resources** section
3. Click **"Create"** to add individual resources
4. Or use **"Import"** to upload FHIR Bundles in JSON format

### Using Medplum API

You can also use the FHIR API directly to upload resources:

```bash
curl -X POST https://api.medplum.com/fhir/R4/Patient \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Patient",
    "name": [{
      "given": ["John"],
      "family": "Doe"
    }],
    "gender": "male",
    "birthDate": "1980-01-01"
  }'
```

### Using Synthea Test Data

Medplum works well with [Synthea](https://github.com/synthetichealth/synthea) generated data:

1. Download Synthea and generate synthetic patient data
2. Export as FHIR R4 format
3. Upload the generated bundles to Medplum

## Sample Size Recommendations

- **First-time users**: Start with **100 records** to get familiar with the tool
- **Testing specific scenarios**: Use **100-500 records** for focused analysis
- **Comprehensive assessment**: Use **1000 records** or **All** for production-ready insights
- **Performance testing**: Large datasets (1000+) will help identify performance issues

## Troubleshooting

### Connection Test Fails

**Problem**: "Connection timeout" or "Authentication failed"

**Solutions**:
- Verify your Access Token is correct and hasn't expired
- Check that you have internet connectivity
- Ensure your Medplum project is active

### No Resources Found

**Problem**: Assessment shows 0 resources

**Solutions**:
- Verify you have uploaded resources to your Medplum project
- Check that the resource types you selected actually exist in your project
- Try using the Medplum UI to verify resources are present

### Slow Performance

**Problem**: Assessment takes a long time

**Solutions**:
- Start with a smaller sample size (100 records)
- Reduce the number of resource types being assessed
- Check your internet connection speed

## API Rate Limits

Medplum has rate limits on API requests. If you're assessing large datasets:
- The free tier has request limits
- Consider upgrading to a paid plan for higher limits
- Use appropriate sample sizes to stay within limits

## Security Best Practices

1. **Never commit your access token** to version control
2. **Rotate tokens regularly** through the Medplum dashboard
3. **Use separate projects** for development and production
4. **Limit token permissions** to only what's needed

## Additional Resources

- [Medplum Documentation](https://www.medplum.com/docs)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [Medplum GitHub](https://github.com/medplum/medplum)
- [US Core Implementation Guide](http://hl7.org/fhir/us/core/)

## Support

For issues specific to:
- **FHIRspective**: Open an issue in this repository
- **Medplum**: Contact [Medplum support](https://www.medplum.com/support)
- **FHIR specification**: Refer to [HL7 FHIR chat](https://chat.fhir.org)

---

**Happy FHIR Quality Assessment!** 🎉
