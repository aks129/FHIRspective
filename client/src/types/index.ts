// FHIR Server Types
export type AuthType = "none" | "basic" | "token" | "oauth2";

export interface ServerConnection {
  id?: number;
  url: string;
  authType: AuthType;
  username?: string;
  password?: string;
  token?: string;
  timeout: number;
  lastUsed?: Date;
}

// Assessment Configuration Types
export interface ResourceSelection {
  [resource: string]: boolean;
}

export interface QualityDimensions {
  completeness: boolean;
  conformity: boolean;
  plausibility: boolean;
  timeliness: boolean;
  calculability: boolean;
}

export interface PurposeOfUse {
  product: boolean;
  consumer: boolean;
  provider: boolean;
  analytics: boolean;
  quality: boolean;
}

export interface RemediationOptions {
  autoFix: boolean;
  flagIssues: boolean;
  writeBack: boolean;
}

export type ExportFormat = "json" | "ndjson" | "pdf" | "excel";

export interface AssessmentConfig {
  id?: number;
  serverId?: number;
  name: string;
  resources: ResourceSelection;
  sampleSize: string;
  validator: string;
  implementationGuide: string;
  qualityFramework: string;
  dimensions: QualityDimensions;
  purpose: PurposeOfUse;
  remediationOptions: RemediationOptions;
  exportFormat: ExportFormat;
}

// Assessment Progress Types
export interface AssessmentProgress {
  overallProgress: number;
  resourceProgress: {
    [resource: string]: {
      completed: number;
      total: number;
      status: 'pending' | 'in-progress' | 'complete';
    };
  };
}

export interface AssessmentLog {
  id: number;
  message: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

// Assessment Results Types
export interface ResourceQualityScore {
  resourceType: string;
  overallScore: number;
  dimensionScores: {
    completeness: number;
    conformity: number;
    plausibility: number;
    timeliness?: number;
    calculability?: number;
  };
  issuesCount: number;
}

export interface QualityIssue {
  id: number;
  resourceType: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  dimension: string;
  details?: string;
  count?: number;
}

export interface AssessmentSummary {
  totalResourcesEvaluated: number;
  totalIssuesIdentified: number;
  totalAutoFixed: number;
  overallQualityScore: number;
  resourceScores: ResourceQualityScore[];
  topIssues: QualityIssue[];
}

export interface AssessmentStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: AssessmentProgress;
  logs: AssessmentLog[];
  summary?: AssessmentSummary;
}
