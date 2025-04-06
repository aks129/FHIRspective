import { AssessmentStatus, AssessmentLog } from "@/types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface AssessmentProgressProps {
  status?: AssessmentStatus;
}

export default function AssessmentProgress({ status }: AssessmentProgressProps) {
  if (!status) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[50px]" />
            </div>
            <Skeleton className="h-2.5 w-full" />
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { progress, logs } = status;
  const overallProgress = progress?.overallProgress || 0;
  const resourceProgress = progress?.resourceProgress || {};
  const sortedLogs = [...(logs || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'complete': return 'Complete';
      case 'in-progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'complete': return 'text-green-600';
      case 'in-progress': return 'text-primary';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-700';
    }
  };

  const getProgressColor = (status: string) => {
    switch(status) {
      case 'complete': return 'bg-green-500';
      case 'in-progress': return 'bg-primary';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-medium text-gray-700">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2.5" />
      </div>
      
      <div className="space-y-4">
        {Object.entries(resourceProgress).map(([resource, data]) => (
          <div key={resource}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                {resource} ({data.completed}/{data.total})
              </span>
              <span className={`text-sm font-medium ${getStatusColor(data.status)}`}>
                {getStatusText(data.status)}
              </span>
            </div>
            <Progress 
              value={(data.completed / data.total) * 100} 
              className={`h-2.5 ${getProgressColor(data.status)}`}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-gray-50 p-4 rounded-md border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Activity Log</h3>
        <ScrollArea className="max-h-48">
          <div className="space-y-2 text-sm text-gray-600">
            {sortedLogs.length > 0 ? (
              sortedLogs.map((log) => (
                <div key={log.id} className="flex items-start">
                  <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5 mr-2">
                    {formatTime(log.timestamp)}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No activity logs yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
