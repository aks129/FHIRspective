/**
 * Service for exporting assessment results in different formats
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import { FhirServer, Assessment, AssessmentResult } from '@shared/schema';
import { ValidationResult } from './validatorService';

export interface ExportOptions {
  format: 'pdf' | 'csv';
  includeDetails: boolean;
  includeSummary: boolean;
  includeIssues: boolean;
}

class ExportService {
  /**
   * Export assessment results to PDF format
   */
  async exportToPdf(
    assessment: Assessment,
    server: FhirServer,
    results: AssessmentResult[],
    qualityScores: Record<string, number>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a document
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        // Collect PDF data chunks in memory
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // Add document title
        doc.fontSize(18)
          .text('FHIR Data Quality Assessment Report', { align: 'center' })
          .moveDown(0.5);
        
        // Add assessment info
        doc.fontSize(14)
          .text('Assessment Information')
          .moveDown(0.5)
          .fontSize(10)
          .text(`Assessment Name: ${assessment.name}`)
          .text(`Date: ${assessment.createdAt.toISOString().split('T')[0]}`)
          .text(`FHIR Server: ${server.url}`)
          .text(`Assessment Configuration: ${assessment.config ? JSON.stringify(assessment.config) : 'Default'}`)
          .moveDown(1);
        
        // Add quality scores section
        doc.fontSize(14)
          .text('Quality Scores')
          .moveDown(0.5);
        
        // Draw quality score table
        const scoreKeys = Object.keys(qualityScores);
        const scoreTable = [
          ['Dimension', 'Score (%)'],
          ...scoreKeys.map(key => [this.formatDimensionName(key), Math.round(qualityScores[key] * 100).toString()])
        ];
        
        this.drawTable(doc, scoreTable);
        doc.moveDown(1);
        
        // Add resources section
        const resourceTypes = [...new Set(results.map(r => r.resourceType))];
        
        doc.fontSize(14)
          .text('Assessed Resources')
          .moveDown(0.5);
        
        // Draw resources table
        const resourceTable = [
          ['Resource Type', 'Count', 'Issues Found'],
          ...resourceTypes.map(type => {
            const typeResults = results.filter(r => r.resourceType === type);
            const issueCount = typeResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
            return [
              type,
              typeResults.length.toString(),
              issueCount.toString()
            ];
          })
        ];
        
        this.drawTable(doc, resourceTable);
        doc.moveDown(1);
        
        // Add issues section
        doc.fontSize(14)
          .text('Top Issues')
          .moveDown(0.5);
        
        // Group issues by code/diagnostic
        const issueGroups: Record<string, {count: number, example: any}> = {};
        
        results.forEach(result => {
          if (result.issues && Array.isArray(result.issues)) {
            result.issues.forEach(issue => {
              const key = `${issue.code}: ${issue.diagnostics}`;
              if (!issueGroups[key]) {
                issueGroups[key] = { count: 0, example: issue };
              }
              issueGroups[key].count++;
            });
          }
        });
        
        // Sort issues by count
        const sortedIssues = Object.entries(issueGroups)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 10); // Top 10 issues
        
        if (sortedIssues.length > 0) {
          const issueTable = [
            ['Issue', 'Count', 'Severity', 'Dimension'],
            ...sortedIssues.map(([key, { count, example }]) => [
              key,
              count.toString(),
              example.severity,
              example.dimension
            ])
          ];
          
          this.drawTable(doc, issueTable);
        } else {
          doc.text('No issues found.');
        }
        
        // Add recommendations section
        doc.addPage();
        doc.fontSize(14)
          .text('Recommendations')
          .moveDown(0.5)
          .fontSize(10);
        
        // Group recommendations by dimension
        const dimensions = [...new Set(
          results
            .flatMap(r => r.issues || [])
            .map(issue => issue.dimension)
        )].filter(Boolean);
        
        dimensions.forEach(dimension => {
          const dimensionIssues = results
            .flatMap(r => r.issues || [])
            .filter(issue => issue.dimension === dimension);
          
          if (dimensionIssues.length > 0) {
            doc.fontSize(12)
              .text(this.formatDimensionName(dimension))
              .moveDown(0.5)
              .fontSize(10);
            
            // Add recommendations based on severity
            const criticalIssues = dimensionIssues.filter(i => i.severity === 'error');
            const warningIssues = dimensionIssues.filter(i => i.severity === 'warning');
            
            if (criticalIssues.length > 0) {
              doc.text('Critical issues to address:');
              criticalIssues
                .sort((a, b) => (b.fixable ? 1 : 0) - (a.fixable ? 1 : 0))
                .slice(0, 5)
                .forEach(issue => {
                  doc.text(`• ${issue.diagnostics}${issue.fixable ? ' (Fixable)' : ''}`, {
                    indent: 10,
                    continued: false
                  });
                });
              doc.moveDown(0.5);
            }
            
            if (warningIssues.length > 0) {
              doc.text('Suggestions for improvement:');
              warningIssues
                .slice(0, 3)
                .forEach(issue => {
                  doc.text(`• ${issue.diagnostics}`, {
                    indent: 10,
                    continued: false
                  });
                });
              doc.moveDown(0.5);
            }
            
            doc.moveDown(0.5);
          }
        });
        
        // Add footer with page numbers
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          
          // Add footer
          doc.fontSize(8)
            .text(
              `FHIRSpective Quality Report - ${new Date().toLocaleDateString()}`,
              50,
              doc.page.height - 50,
              { align: 'center' }
            );
            
          // Add page number
          doc.text(
            `Page ${i + 1} of ${totalPages}`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          );
        }

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Export assessment results to CSV format
   */
  async exportToCsv(
    assessment: Assessment,
    server: FhirServer,
    results: AssessmentResult[],
    qualityScores: Record<string, number>
  ): Promise<string> {
    // Prepare data for CSV
    const csvData = [];
    
    // Add assessment info as metadata
    csvData.push(['Assessment Name', assessment.name]);
    csvData.push(['Date', assessment.createdAt.toISOString().split('T')[0]]);
    csvData.push(['FHIR Server', server.url]);
    csvData.push(['Assessment Type', assessment.type || 'Default']);
    csvData.push([]);
    
    // Add quality scores
    csvData.push(['QUALITY SCORES']);
    csvData.push(['Dimension', 'Score (%)']);
    
    Object.entries(qualityScores).forEach(([dimension, score]) => {
      csvData.push([this.formatDimensionName(dimension), Math.round(score * 100)]);
    });
    
    csvData.push([]);
    
    // Add resource summary
    csvData.push(['RESOURCE SUMMARY']);
    csvData.push(['Resource Type', 'Count', 'Issues Found']);
    
    const resourceTypes = [...new Set(results.map(r => r.resourceType))];
    resourceTypes.forEach(type => {
      const typeResults = results.filter(r => r.resourceType === type);
      const issueCount = typeResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      
      csvData.push([
        type,
        typeResults.length,
        issueCount
      ]);
    });
    
    csvData.push([]);
    
    // Add issues details
    csvData.push(['DETAILED ISSUES']);
    csvData.push(['Resource Type', 'Resource ID', 'Severity', 'Code', 'Diagnostics', 'Dimension', 'Fixable']);
    
    results.forEach(result => {
      if (result.issues && Array.isArray(result.issues)) {
        result.issues.forEach(issue => {
          csvData.push([
            result.resourceType,
            result.resourceId,
            issue.severity,
            issue.code,
            issue.diagnostics,
            issue.dimension,
            issue.fixable ? 'Yes' : 'No'
          ]);
        });
      }
    });
    
    // Convert to CSV string
    return stringify(csvData);
  }
  
  /**
   * Helper method to format dimension names for display
   */
  private formatDimensionName(dimension: string): string {
    if (!dimension) return 'Unknown';
    
    // Split by camelCase and capitalize each word
    return dimension
      // Insert a space before all uppercase letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize the first letter
      .replace(/^./, str => str.toUpperCase())
      // Trim any leading spaces
      .trim();
  }
  
  /**
   * Helper method to draw a table in the PDF
   */
  private drawTable(doc: PDFKit.PDFDocument, data: string[][]) {
    const TABLE_X = 50;
    const COL_WIDTHS = [200, 100, 100, 100];
    
    // Draw header
    const [headers, ...rows] = data;
    let y = doc.y;
    
    // Calculate row height based on font size
    const rowHeight = doc.currentLineHeight() * 1.5;
    
    // Draw header row with background
    doc.fillColor('#f2f2f2');
    doc.rect(TABLE_X, y, doc.page.width - 100, rowHeight).fill();
    doc.fillColor('black');
    
    headers.forEach((header, i) => {
      doc.text(
        header,
        TABLE_X + (i > 0 ? COL_WIDTHS.slice(0, i).reduce((a, b) => a + b, 0) : 0),
        y + 2,
        { width: COL_WIDTHS[i] || 100 }
      );
    });
    
    y += rowHeight;
    
    // Draw rows
    rows.forEach((row, rowIndex) => {
      // Alternate row background color
      if (rowIndex % 2 === 0) {
        doc.fillColor('#f9f9f9');
        doc.rect(TABLE_X, y, doc.page.width - 100, rowHeight).fill();
        doc.fillColor('black');
      }
      
      row.forEach((cell, i) => {
        doc.text(
          cell,
          TABLE_X + (i > 0 ? COL_WIDTHS.slice(0, i).reduce((a, b) => a + b, 0) : 0),
          y + 2,
          { width: COL_WIDTHS[i] || 100 }
        );
      });
      
      y += rowHeight;
    });
    
    // Reset Y position
    doc.y = y + 10;
  }
}

export const exportService = new ExportService();