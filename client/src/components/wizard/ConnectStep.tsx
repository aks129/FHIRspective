import { useState, useEffect } from "react";
import { ServerConnection } from "@/types";
import ServerConnectionForm from "./ServerConnectionForm";
import ConnectionHistory from "./ConnectionHistory";
import { useFhirServer } from "@/hooks/useFhirServer";

interface ConnectStepProps {
  serverConnection: ServerConnection;
  onUpdateServerConnection: (connection: ServerConnection) => void;
  onNext: () => void;
}

export default function ConnectStep({ 
  serverConnection, 
  onUpdateServerConnection, 
  onNext 
}: ConnectStepProps) {
  const { 
    recentServers, 
    isLoadingServers, 
    testAndSaveServer,
    isTestingConnection,
    selectServer
  } = useFhirServer();

  // Update parent component when server is selected from history
  const handleSelectServer = (server: ServerConnection) => {
    selectServer(server);
    onUpdateServerConnection(server);
  };

  // Test connection, save server, and then move to next step
  const handleContinue = async () => {
    // If we already have a server ID, just go to next step
    if (serverConnection.id) {
      onNext();
      return;
    }

    // Otherwise, test and save the connection first
    const savedServer = await testAndSaveServer(serverConnection);
    if (savedServer) {
      onUpdateServerConnection(savedServer);
      onNext();
    }
  };

  return (
    <div className="fade-in">
      <ServerConnectionForm 
        serverConnection={serverConnection}
        onUpdateServerConnection={onUpdateServerConnection}
        onTestAndContinue={handleContinue}
        isTestingConnection={isTestingConnection}
      />
      
      <div className="mt-6">
        <ConnectionHistory 
          recentServers={recentServers as ServerConnection[]}
          isLoading={isLoadingServers}
          onSelectServer={handleSelectServer}
        />
      </div>
    </div>
  );
}
