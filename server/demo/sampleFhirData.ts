/**
 * Sample FHIR Data for Demo
 *
 * This file contains sample FHIR R4 resources with varying data quality
 * to demonstrate the usability scoring and validation features.
 *
 * Data quality scenarios:
 * - High quality: Complete, conformant, plausible data
 * - Medium quality: Some missing fields, minor issues
 * - Low quality: Missing required fields, implausible values
 */

// High quality patient - complete with US Core extensions
export const highQualityPatient = {
  resourceType: "Patient",
  id: "demo-patient-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
  },
  identifier: [
    {
      system: "http://hospital.example.org/patients",
      value: "PAT001"
    },
    {
      system: "http://hl7.org/fhir/sid/us-ssn",
      value: "123-45-6789"
    }
  ],
  active: true,
  name: [
    {
      use: "official",
      family: "Johnson",
      given: ["Sarah", "Marie"]
    }
  ],
  telecom: [
    {
      system: "phone",
      value: "555-123-4567",
      use: "home"
    },
    {
      system: "email",
      value: "sarah.johnson@email.com"
    }
  ],
  gender: "female",
  birthDate: "1985-03-15",
  address: [
    {
      use: "home",
      type: "physical",
      line: ["123 Main Street", "Apt 4B"],
      city: "Boston",
      state: "MA",
      postalCode: "02101",
      country: "US"
    }
  ],
  maritalStatus: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
        code: "M",
        display: "Married"
      }
    ]
  },
  communication: [
    {
      language: {
        coding: [
          {
            system: "urn:ietf:bcp:47",
            code: "en",
            display: "English"
          }
        ]
      },
      preferred: true
    }
  ],
  extension: [
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            system: "urn:oid:2.16.840.1.113883.6.238",
            code: "2106-3",
            display: "White"
          }
        },
        {
          url: "text",
          valueString: "White"
        }
      ]
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            system: "urn:oid:2.16.840.1.113883.6.238",
            code: "2186-5",
            display: "Not Hispanic or Latino"
          }
        },
        {
          url: "text",
          valueString: "Not Hispanic or Latino"
        }
      ]
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
      valueCode: "F"
    }
  ]
};

// Medium quality patient - missing some optional fields
export const mediumQualityPatient = {
  resourceType: "Patient",
  id: "demo-patient-002",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  identifier: [
    {
      system: "http://hospital.example.org/patients",
      value: "PAT002"
    }
  ],
  name: [
    {
      family: "Smith",
      given: ["John"]
    }
  ],
  gender: "male",
  birthDate: "1978-07-22",
  address: [
    {
      city: "Chicago",
      state: "IL"
    }
  ]
};

// Low quality patient - missing required fields, issues
export const lowQualityPatient = {
  resourceType: "Patient",
  id: "demo-patient-003",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  // Missing identifier
  name: [
    {
      // Missing family and given - just text
      text: "Jane Doe"
    }
  ],
  // Missing gender
  birthDate: "2030-01-01" // Future date - implausible
};

// High quality condition with ICD-10 coding
export const highQualityCondition = {
  resourceType: "Condition",
  id: "demo-condition-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"]
  },
  clinicalStatus: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
        code: "active",
        display: "Active"
      }
    ]
  },
  verificationStatus: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        code: "confirmed",
        display: "Confirmed"
      }
    ]
  },
  category: [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-category",
          code: "problem-list-item",
          display: "Problem List Item"
        }
      ]
    }
  ],
  severity: {
    coding: [
      {
        system: "http://snomed.info/sct",
        code: "24484000",
        display: "Severe"
      }
    ]
  },
  code: {
    coding: [
      {
        system: "http://hl7.org/fhir/sid/icd-10-cm",
        code: "E11.9",
        display: "Type 2 diabetes mellitus without complications"
      },
      {
        system: "http://snomed.info/sct",
        code: "44054006",
        display: "Diabetes mellitus type 2"
      }
    ],
    text: "Type 2 Diabetes"
  },
  subject: {
    reference: "Patient/demo-patient-001",
    display: "Sarah Johnson"
  },
  onsetDateTime: "2020-03-15",
  recordedDate: "2020-03-20",
  recorder: {
    reference: "Practitioner/demo-practitioner-001",
    display: "Dr. Smith"
  },
  evidence: [
    {
      code: [
        {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "166922008",
              display: "Hemoglobin A1c/Hemoglobin.total in Blood"
            }
          ]
        }
      ]
    }
  ]
};

// Medium quality condition - missing some fields
export const mediumQualityCondition = {
  resourceType: "Condition",
  id: "demo-condition-002",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  clinicalStatus: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
        code: "active"
      }
    ]
  },
  // Missing verificationStatus
  // Missing category
  code: {
    coding: [
      {
        system: "http://snomed.info/sct",
        code: "38341003",
        display: "Hypertensive disorder"
      }
    ],
    text: "Hypertension"
  },
  subject: {
    reference: "Patient/demo-patient-002"
  },
  onsetDateTime: "2019-06-10"
};

// Low quality condition - multiple issues
export const lowQualityCondition = {
  resourceType: "Condition",
  id: "demo-condition-003",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  // Missing clinicalStatus (recommended)
  // Missing verificationStatus
  code: {
    text: "Some condition" // Missing proper coding
  },
  subject: {
    reference: "Patient/demo-patient-003"
  },
  onsetDateTime: "2025-12-01" // Future date - implausible
};

// High quality observation - vital signs with LOINC
export const highQualityObservation = {
  resourceType: "Observation",
  id: "demo-observation-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs"]
  },
  status: "final",
  category: [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "vital-signs",
          display: "Vital Signs"
        }
      ]
    }
  ],
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: "8480-6",
        display: "Systolic blood pressure"
      }
    ],
    text: "Systolic Blood Pressure"
  },
  subject: {
    reference: "Patient/demo-patient-001",
    display: "Sarah Johnson"
  },
  effectiveDateTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  issued: new Date().toISOString(),
  performer: [
    {
      reference: "Practitioner/demo-practitioner-001",
      display: "Dr. Smith"
    }
  ],
  valueQuantity: {
    value: 120,
    unit: "mmHg",
    system: "http://unitsofmeasure.org",
    code: "mm[Hg]"
  },
  interpretation: [
    {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          code: "N",
          display: "Normal"
        }
      ]
    }
  ],
  referenceRange: [
    {
      low: {
        value: 90,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      },
      high: {
        value: 140,
        unit: "mmHg",
        system: "http://unitsofmeasure.org",
        code: "mm[Hg]"
      }
    }
  ]
};

// Medium quality observation
export const mediumQualityObservation = {
  resourceType: "Observation",
  id: "demo-observation-002",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  status: "final",
  // Missing category
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: "8310-5",
        display: "Body temperature"
      }
    ]
  },
  subject: {
    reference: "Patient/demo-patient-002"
  },
  effectiveDateTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  valueQuantity: {
    value: 37.2,
    unit: "C"
  }
};

// Low quality observation - implausible values
export const lowQualityObservation = {
  resourceType: "Observation",
  id: "demo-observation-003",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  status: "final",
  code: {
    coding: [
      {
        system: "http://loinc.org",
        code: "8480-6",
        display: "Systolic blood pressure"
      }
    ]
  },
  subject: {
    reference: "Patient/demo-patient-003"
  },
  effectiveDateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow - future date
  valueQuantity: {
    value: 350, // Implausible value
    unit: "mmHg"
  }
};

// High quality medication request
export const highQualityMedicationRequest = {
  resourceType: "MedicationRequest",
  id: "demo-medication-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"]
  },
  status: "active",
  intent: "order",
  medicationCodeableConcept: {
    coding: [
      {
        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
        code: "860975",
        display: "Metformin hydrochloride 500 MG Oral Tablet"
      }
    ],
    text: "Metformin 500mg"
  },
  subject: {
    reference: "Patient/demo-patient-001",
    display: "Sarah Johnson"
  },
  encounter: {
    reference: "Encounter/demo-encounter-001"
  },
  authoredOn: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
  requester: {
    reference: "Practitioner/demo-practitioner-001",
    display: "Dr. Smith"
  },
  reasonCode: [
    {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10-cm",
          code: "E11.9",
          display: "Type 2 diabetes mellitus without complications"
        }
      ]
    }
  ],
  dosageInstruction: [
    {
      sequence: 1,
      text: "Take 500mg twice daily with meals",
      timing: {
        repeat: {
          frequency: 2,
          period: 1,
          periodUnit: "d"
        }
      },
      route: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "26643006",
            display: "Oral route"
          }
        ]
      },
      doseAndRate: [
        {
          doseQuantity: {
            value: 500,
            unit: "mg",
            system: "http://unitsofmeasure.org",
            code: "mg"
          }
        }
      ]
    }
  ],
  dispenseRequest: {
    numberOfRepeatsAllowed: 3,
    quantity: {
      value: 60,
      unit: "tablets"
    },
    expectedSupplyDuration: {
      value: 30,
      unit: "days"
    }
  }
};

// High quality encounter
export const highQualityEncounter = {
  resourceType: "Encounter",
  id: "demo-encounter-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter"]
  },
  status: "finished",
  class: {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: "AMB",
    display: "ambulatory"
  },
  type: [
    {
      coding: [
        {
          system: "http://www.ama-assn.org/go/cpt",
          code: "99213",
          display: "Office or other outpatient visit"
        }
      ],
      text: "Office Visit"
    }
  ],
  subject: {
    reference: "Patient/demo-patient-001",
    display: "Sarah Johnson"
  },
  participant: [
    {
      type: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              code: "PPRF",
              display: "primary performer"
            }
          ]
        }
      ],
      individual: {
        reference: "Practitioner/demo-practitioner-001",
        display: "Dr. Smith"
      }
    }
  ],
  period: {
    start: new Date(Date.now() - 604800000).toISOString(),
    end: new Date(Date.now() - 604800000 + 3600000).toISOString()
  },
  location: [
    {
      location: {
        reference: "Location/demo-location-001",
        display: "Main Clinic"
      }
    }
  ],
  serviceProvider: {
    reference: "Organization/demo-org-001",
    display: "Demo Healthcare System"
  },
  diagnosis: [
    {
      condition: {
        reference: "Condition/demo-condition-001"
      },
      use: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/diagnosis-role",
            code: "billing",
            display: "Billing"
          }
        ]
      }
    }
  ]
};

// High quality immunization
export const highQualityImmunization = {
  resourceType: "Immunization",
  id: "demo-immunization-001",
  meta: {
    lastUpdated: new Date().toISOString(),
    profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-immunization"]
  },
  status: "completed",
  vaccineCode: {
    coding: [
      {
        system: "http://hl7.org/fhir/sid/cvx",
        code: "208",
        display: "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose"
      }
    ],
    text: "COVID-19 Vaccine"
  },
  patient: {
    reference: "Patient/demo-patient-001",
    display: "Sarah Johnson"
  },
  occurrenceDateTime: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
  primarySource: true,
  lotNumber: "EW0182",
  expirationDate: new Date(Date.now() + 7776000000).toISOString(), // 90 days from now
  site: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActSite",
        code: "LA",
        display: "left arm"
      }
    ]
  },
  route: {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
        code: "IM",
        display: "Injection, intramuscular"
      }
    ]
  },
  performer: [
    {
      function: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0443",
            code: "AP",
            display: "Administering Provider"
          }
        ]
      },
      actor: {
        reference: "Practitioner/demo-practitioner-001",
        display: "Dr. Smith"
      }
    }
  ]
};

// Complete sample data collection
export const sampleFhirData = {
  patients: [
    highQualityPatient,
    mediumQualityPatient,
    lowQualityPatient
  ],
  conditions: [
    highQualityCondition,
    mediumQualityCondition,
    lowQualityCondition
  ],
  observations: [
    highQualityObservation,
    mediumQualityObservation,
    lowQualityObservation
  ],
  medicationRequests: [
    highQualityMedicationRequest
  ],
  encounters: [
    highQualityEncounter
  ],
  immunizations: [
    highQualityImmunization
  ]
};

// Get all resources as a flat array
export function getAllSampleResources(): any[] {
  return [
    ...sampleFhirData.patients,
    ...sampleFhirData.conditions,
    ...sampleFhirData.observations,
    ...sampleFhirData.medicationRequests,
    ...sampleFhirData.encounters,
    ...sampleFhirData.immunizations
  ];
}

// Get resources by type
export function getSampleResourcesByType(resourceType: string): any[] {
  switch (resourceType) {
    case 'Patient':
      return sampleFhirData.patients;
    case 'Condition':
      return sampleFhirData.conditions;
    case 'Observation':
      return sampleFhirData.observations;
    case 'MedicationRequest':
      return sampleFhirData.medicationRequests;
    case 'Encounter':
      return sampleFhirData.encounters;
    case 'Immunization':
      return sampleFhirData.immunizations;
    default:
      return [];
  }
}
