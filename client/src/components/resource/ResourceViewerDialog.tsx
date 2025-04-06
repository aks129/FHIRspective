import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Download } from "lucide-react";

interface ResourceViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: any[];
  issue: {
    description: string;
    dimension: string;
    severity: string;
  };
}

export function ResourceViewerDialog({ 
  open, 
  onOpenChange, 
  resources, 
  issue 
}: ResourceViewerDialogProps) {
  const [activeTab, setActiveTab] = useState("resource-1");

  const handleCopyJson = (resource: any) => {
    navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
  };

  const handleDownloadJson = (resource: any) => {
    const blob = new Blob([JSON.stringify(resource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.resourceType}-${resource.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resources Affected by Issue</DialogTitle>
          <DialogDescription>
            Viewing {resources.length} resources affected by the "{issue.description}" issue
            ({issue.severity}, {issue.dimension})
          </DialogDescription>
        </DialogHeader>
        
        <Separator className="my-2" />
        
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-3 w-full">
              {resources.map((resource, index) => (
                <TabsTrigger key={index} value={`resource-${index + 1}`}>
                  {resource.resourceType} {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {resources.map((resource, index) => (
              <TabsContent 
                key={index} 
                value={`resource-${index + 1}`}
                className="flex-1 flex flex-col min-h-0 border rounded-md p-0 mt-2"
              >
                <div className="flex justify-between items-center p-3 border-b bg-gray-50">
                  <div>
                    <span className="font-semibold">{resource.resourceType}</span> 
                    <span className="text-gray-500 ml-2">ID: {resource.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleCopyJson(resource)}
                    >
                      <ClipboardCopy className="h-4 w-4 mr-1" /> Copy JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadJson(resource)}
                    >
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3 bg-gray-100">
                  <pre className="text-sm bg-white p-4 rounded-md shadow-sm overflow-x-auto">
                    {JSON.stringify(resource, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}