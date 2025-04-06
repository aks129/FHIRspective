import { ServerConnection } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectionHistoryProps {
  recentServers: ServerConnection[];
  isLoading: boolean;
  onSelectServer: (server: ServerConnection) => void;
}

export default function ConnectionHistory({
  recentServers,
  isLoading,
  onSelectServer
}: ConnectionHistoryProps) {
  // Format the last used date
  const formatLastUsed = (date: Date | string | undefined) => {
    if (!date) return "Unknown";
    const parsedDate = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-800">Recent Connections</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
          </div>
        ) : recentServers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentServers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium text-gray-900">
                      {server.url}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatLastUsed(server.lastUsed)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="text-primary hover:text-primary-dark p-0"
                        onClick={() => onSelectServer(server)}
                      >
                        Use
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No recent connections found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
