import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ServerConnection, 
  AssessmentConfig, 
  AssessmentStatus,
  AssessmentSummary,
  ResourceSelection,
  QualityDimensions,
  PurposeOfUse,
  RemediationOptions,
  ExportFormat
} from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Default values for a new assessment
const defaultAssessmentConfig: AssessmentConfig = {
  name: "FHIR Assessment",
  resources: {
    Patient: true,
    Encounter: true,
    Observation: true,
    Condition: false,
    Procedure: false,
    MedicationRequest: false,
    AllergyIntolerance: false,
    Immunization: false
  },
  sampleSize: "100",
  validator: "inferno",
  implementationGuide: "uscore",
  qualityFramework: "kahn",
  dimensions: {
    completeness: true,
    conformity: true,
    plausibility: true,
    timeliness: false,
    calculability: false
  },
  purpose: {
    product: true,
    consumer: false,
    provider: false,
    analytics: true,
    quality: false
  },
  remediationOptions: {
    autoFix: true,
    flagIssues: true,
    writeBack: false
  },
  exportFormat: "json"
};

// Default empty server connection
const defaultServerConnection: ServerConnection = {
  url: "",
  authType: "none",
  timeout: 30
};

// Poll interval for assessment status (ms)
const STATUS_POLL_INTERVAL = 2000;

export function useAssessment() {
  const { toast } = useToast();
  
  // State for the current server connection and assessment configuration
  const [serverConnection, setServerConnection] = useState<ServerConnection>(defaultServerConnection);
  const [assessmentConfig, setAssessmentConfig] = useState<AssessmentConfig>(defaultAssessmentConfig);
  
  // State for tracking the current assessment
  const [currentAssessmentId, setCurrentAssessmentId] = useState<number | null>(null);

  // Create a new assessment
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { config: AssessmentConfig, serverId: number }) => {
      const { config, serverId } = data;
      const payload = {
        ...config,
        serverId
      };
      
      const response = await apiRequest('POST', '/api/assessments', payload);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assessment Created",
        description: "Your assessment has been created successfully.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Assessment",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Start an assessment
  const startAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      const response = await apiRequest('POST', `/api/assessments/${assessmentId}/start`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assessment Started",
        description: "Your assessment is now running.",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Assessment",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Fetch assessment status (with polling if assessment is running)
  const { 
    data: assessmentStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery<AssessmentStatus | null>({
    queryKey: ['/api/assessments', currentAssessmentId, 'status'],
    queryFn: async () => {
      if (!currentAssessmentId) return null;
      const response = await apiRequest('GET', `/api/assessments/${currentAssessmentId}/status`);
      return response.json();
    },
    enabled: currentAssessmentId !== null,
    refetchInterval: (query) => {
      // Only poll if the assessment is running
      const data = query.state.data as AssessmentStatus | null;
      return (data?.status === 'running') ? STATUS_POLL_INTERVAL : false;
    },
  });

  // Fetch assessment results
  const { 
    data: assessmentResults,
    isLoading: isLoadingResults
  } = useQuery<AssessmentSummary>({
    queryKey: ['/api/assessments', currentAssessmentId, 'results'],
    queryFn: async () => {
      if (!currentAssessmentId) throw new Error("No assessment ID");
      const response = await apiRequest('GET', `/api/assessments/${currentAssessmentId}/results`);
      return response.json();
    },
    enabled: currentAssessmentId !== null && assessmentStatus?.status === 'completed',
  });

  // Update server connection
  const updateServerConnection = useCallback((connection: ServerConnection) => {
    setServerConnection(connection);
  }, []);

  // Update assessment configuration
  const updateAssessmentConfig = useCallback((
    field: keyof AssessmentConfig, 
    value: string | ResourceSelection | QualityDimensions | PurposeOfUse | RemediationOptions | ExportFormat
  ) => {
    setAssessmentConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Start a new assessment with the current configuration
  const startAssessment = useCallback(async () => {
    try {
      // If an assessment is already in progress, don't start a new one
      if (currentAssessmentId) {
        return currentAssessmentId;
      }
      
      if (!serverConnection.id) {
        toast({
          title: "Server Connection Required",
          description: "Please select or create a server connection first.",
          variant: "destructive",
        });
        return null;
      }
      
      // Verify that at least one resource is selected
      const hasSelectedResources = Object.values(assessmentConfig.resources).some(isSelected => isSelected);
      if (!hasSelectedResources) {
        toast({
          title: "No Resources Selected",
          description: "Please select at least one resource to include in the assessment.",
          variant: "destructive",
        });
        return null;
      }

      // Create the assessment
      const assessment = await createAssessmentMutation.mutateAsync({
        config: assessmentConfig,
        serverId: serverConnection.id
      });

      // Set the current assessment ID
      setCurrentAssessmentId(assessment.id);

      // Start the assessment
      await startAssessmentMutation.mutateAsync(assessment.id);
      
      // After starting the assessment, trigger a refresh of the status
      queryClient.invalidateQueries({ queryKey: ['/api/assessments', assessment.id, 'status'] });

      // Return the assessment ID
      return assessment.id;
    } catch (error) {
      console.error("Failed to start assessment:", error);
      toast({
        title: "Assessment Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      return null;
    }
  }, [currentAssessmentId, serverConnection, assessmentConfig, createAssessmentMutation, startAssessmentMutation, toast, queryClient]);

  return {
    // Server connection
    serverConnection,
    updateServerConnection,
    
    // Assessment configuration
    assessmentConfig,
    updateAssessmentConfig,
    
    // Assessment actions
    startAssessment,
    isCreatingAssessment: createAssessmentMutation.isPending,
    isStartingAssessment: startAssessmentMutation.isPending,
    
    // Assessment status and results
    currentAssessmentId,
    assessmentStatus,
    isLoadingStatus,
    assessmentResults,
    isLoadingResults,
    
    // Reset for a new assessment
    resetAssessment: () => {
      setCurrentAssessmentId(null);
      setAssessmentConfig(defaultAssessmentConfig);
    }
  };
}
