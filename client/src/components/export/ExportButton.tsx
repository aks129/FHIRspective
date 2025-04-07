import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Download, FileSpreadsheet, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  assessmentId: number;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showTooltip?: boolean;
  icon?: boolean;
}

export function ExportButton({
  assessmentId,
  disabled = false,
  variant = 'default',
  size = 'default',
  showTooltip = true,
  icon = false
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);

      // Create a temporary anchor element to trigger download
      const a = document.createElement('a');
      a.href = `/api/assessments/${assessmentId}/export?format=${format}`;
      a.download = `assessment-${assessmentId}-report.${format}`;
      
      // To help debug, show a toast message
      toast({
        title: "Preparing export...",
        description: `Generating ${format.toUpperCase()} report. The download will start automatically.`,
      });

      // Add to the body, click it, and remove it
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Show success toast
      toast({
        title: `${format.toUpperCase()} Export Complete`,
        description: "Your report has been downloaded successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={disabled || isExporting}
          className="gap-2"
        >
          {icon ? <Download className="w-4 h-4" /> : (
            <>
              <FileText className="w-4 h-4" />
              <span>Export</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
          <File className="w-4 h-4 mr-2" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={isExporting}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{exportButton}</TooltipTrigger>
          <TooltipContent>
            <p>Export assessment results as PDF or CSV</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return exportButton;
}