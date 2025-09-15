import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ServerConnection } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useFhirServer() {
  const { toast } = useToast();
  const [selectedServer, setSelectedServer] = useState<ServerConnection | null>(null);

  // Fetch the list of recent FHIR servers
  const { 
    data: recentServers = [], 
    isLoading: isLoadingServers,
    refetch: refetchServers
  } = useQuery({
    queryKey: ['/api/fhir-servers'],
    staleTime: 60000, // 1 minute
  });

  // Test a FHIR server connection
  const testConnectionMutation = useMutation({
    mutationFn: async (serverConnection: ServerConnection) => {
      const response = await apiRequest(
        'POST',
        '/api/fhir-servers/test-connection',
        serverConnection
      );
      const data = await response.json();

      // Check if the connection test was successful
      if (!data.success) {
        throw new Error(data.error || "Connection test failed");
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: data.message || "Successfully connected to FHIR server",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to FHIR server",
        variant: "destructive",
      });
      throw error;
    },
  });

  // Save a FHIR server connection
  const saveServerMutation = useMutation({
    mutationFn: async (serverConnection: ServerConnection) => {
      const response = await apiRequest(
        'POST',
        '/api/fhir-servers',
        serverConnection
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Server Saved",
        description: "FHIR server connection has been saved",
      });
      refetchServers();
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Update the last used timestamp for a server
  const updateLastUsedMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await apiRequest(
        'PUT',
        `/api/fhir-servers/${serverId}/last-used`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      refetchServers();
    },
  });

  // Select a server to use
  const selectServer = useCallback((server: ServerConnection) => {
    setSelectedServer(server);
    if (server.id) {
      updateLastUsedMutation.mutate(server.id);
    }
  }, [updateLastUsedMutation]);

  // Test and then save a server if connection is successful
  const testAndSaveServer = async (server: ServerConnection) => {
    try {
      // First test the connection
      const testResult = await testConnectionMutation.mutateAsync(server);

      // Only save if test was successful
      if (testResult && testResult.success) {
        // If successful, save the server
        const savedServer = await saveServerMutation.mutateAsync(server);

        // Update the selected server with the saved version (including ID)
        setSelectedServer(savedServer);

        return savedServer;
      } else {
        console.error("Connection test failed:", testResult);
        return null;
      }
    } catch (error) {
      console.error("Error testing/saving server:", error);
      // Error is already handled by the mutations
      return null;
    }
  };

  return {
    recentServers,
    isLoadingServers,
    selectedServer,
    selectServer,
    testConnection: testConnectionMutation.mutateAsync,
    saveServer: saveServerMutation.mutateAsync,
    testAndSaveServer,
    isTestingConnection: testConnectionMutation.isPending,
    isSavingServer: saveServerMutation.isPending,
  };
}
