import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Sample data endpoint - returns sample FHIR resources
 * GET /api/demo/sample-data
 * GET /api/demo/sample-data?resourceType=Patient
 *
 * Self-contained endpoint
 */

const sampleFhirData = {
  patients: [
    {
      resourceType: "Patient",
      id: "demo-patient-001",
      meta: { lastUpdated: new Date().toISOString() },
      identifier: [{ system: "http://hospital.example.org/patients", value: "PAT001" }],
      active: true,
      name: [{ use: "official", family: "Johnson", given: ["Sarah", "Marie"] }],
      telecom: [{ system: "phone", value: "555-123-4567", use: "home" }],
      gender: "female",
      birthDate: "1985-03-15",
      address: [{ use: "home", city: "Boston", state: "MA", postalCode: "02101" }]
    },
    {
      resourceType: "Patient",
      id: "demo-patient-002",
      meta: { lastUpdated: new Date().toISOString() },
      identifier: [{ system: "http://hospital.example.org/patients", value: "PAT002" }],
      name: [{ family: "Smith", given: ["John"] }],
      gender: "male",
      birthDate: "1978-07-22"
    },
    {
      resourceType: "Patient",
      id: "demo-patient-003",
      meta: { lastUpdated: new Date().toISOString() },
      name: [{ text: "Jane Doe" }],
      birthDate: "2030-01-01"
    }
  ],
  conditions: [
    {
      resourceType: "Condition",
      id: "demo-condition-001",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
      code: {
        coding: [
          { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9", display: "Type 2 diabetes mellitus" },
          { system: "http://snomed.info/sct", code: "44054006", display: "Diabetes mellitus type 2" }
        ],
        text: "Type 2 Diabetes"
      },
      subject: { reference: "Patient/demo-patient-001" },
      onsetDateTime: "2020-03-15"
    },
    {
      resourceType: "Condition",
      id: "demo-condition-002",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      code: { coding: [{ system: "http://snomed.info/sct", code: "38341003", display: "Hypertensive disorder" }] },
      subject: { reference: "Patient/demo-patient-002" }
    },
    {
      resourceType: "Condition",
      id: "demo-condition-003",
      code: { text: "Some condition" },
      subject: { reference: "Patient/demo-patient-003" }
    }
  ],
  observations: [
    {
      resourceType: "Observation",
      id: "demo-observation-001",
      status: "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
      code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
      subject: { reference: "Patient/demo-patient-001" },
      effectiveDateTime: new Date(Date.now() - 86400000).toISOString(),
      valueQuantity: { value: 120, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
    },
    {
      resourceType: "Observation",
      id: "demo-observation-002",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
      subject: { reference: "Patient/demo-patient-002" },
      effectiveDateTime: new Date(Date.now() - 172800000).toISOString(),
      valueQuantity: { value: 37.2, unit: "C" }
    },
    {
      resourceType: "Observation",
      id: "demo-observation-003",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
      subject: { reference: "Patient/demo-patient-003" },
      effectiveDateTime: new Date(Date.now() + 86400000).toISOString(),
      valueQuantity: { value: 350, unit: "mmHg" }
    }
  ],
  medicationRequests: [
    {
      resourceType: "MedicationRequest",
      id: "demo-medication-001",
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "860975", display: "Metformin 500mg" }],
        text: "Metformin 500mg"
      },
      subject: { reference: "Patient/demo-patient-001" },
      authoredOn: new Date(Date.now() - 604800000).toISOString()
    }
  ],
  encounters: [
    {
      resourceType: "Encounter",
      id: "demo-encounter-001",
      status: "finished",
      class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
      type: [{ coding: [{ system: "http://www.ama-assn.org/go/cpt", code: "99213", display: "Office visit" }] }],
      subject: { reference: "Patient/demo-patient-001" },
      period: { start: new Date(Date.now() - 604800000).toISOString(), end: new Date(Date.now() - 604800000 + 3600000).toISOString() }
    }
  ],
  immunizations: [
    {
      resourceType: "Immunization",
      id: "demo-immunization-001",
      status: "completed",
      vaccineCode: { coding: [{ system: "http://hl7.org/fhir/sid/cvx", code: "208", display: "COVID-19 Vaccine" }] },
      patient: { reference: "Patient/demo-patient-001" },
      occurrenceDateTime: new Date(Date.now() - 2592000000).toISOString(),
      primarySource: true
    }
  ]
};

function getSampleResourcesByType(resourceType: string): any[] {
  switch (resourceType) {
    case 'Patient': return sampleFhirData.patients;
    case 'Condition': return sampleFhirData.conditions;
    case 'Observation': return sampleFhirData.observations;
    case 'MedicationRequest': return sampleFhirData.medicationRequests;
    case 'Encounter': return sampleFhirData.encounters;
    case 'Immunization': return sampleFhirData.immunizations;
    default: return [];
  }
}

function getAllSampleResources(): any[] {
  return [
    ...sampleFhirData.patients,
    ...sampleFhirData.conditions,
    ...sampleFhirData.observations,
    ...sampleFhirData.medicationRequests,
    ...sampleFhirData.encounters,
    ...sampleFhirData.immunizations
  ];
}

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
    const resourceType = req.query.resourceType as string | undefined;

    if (resourceType) {
      const resources = getSampleResourcesByType(resourceType);
      return res.status(200).json({
        resourceType,
        count: resources.length,
        resources
      });
    } else {
      return res.status(200).json({
        summary: {
          patients: sampleFhirData.patients.length,
          conditions: sampleFhirData.conditions.length,
          observations: sampleFhirData.observations.length,
          medicationRequests: sampleFhirData.medicationRequests.length,
          encounters: sampleFhirData.encounters.length,
          immunizations: sampleFhirData.immunizations.length,
          total: getAllSampleResources().length
        },
        data: sampleFhirData
      });
    }
  } catch (error) {
    console.error('Error fetching sample data:', error);
    return res.status(500).json({
      error: 'Failed to fetch sample data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
