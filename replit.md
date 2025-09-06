# FHIRSpective - FHIR Data Quality Assessor

## Overview

FHIRSpective is a web-based FHIR data quality assessment application that evaluates healthcare data compliance and quality across multiple dimensions. The application connects to FHIR servers, validates resources against implementation guides, and provides comprehensive quality reporting with visualization and remediation capabilities. Built as a full-stack TypeScript application with React frontend and Express backend, it supports the complete data quality assessment workflow from server connection to results export.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, professional UI design
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Charts & Visualization**: Recharts library for interactive data quality visualizations including bar charts, pie charts, and radar charts
- **Form Handling**: React Hook Form with Zod schema validation for robust form management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Database**: PostgreSQL with Neon serverless hosting for scalable data persistence
- **Validation**: Zod schemas shared between frontend and backend for consistent data validation
- **File Processing**: Support for PDF generation (PDFKit) and CSV export for assessment reports

### Data Storage Design
- **Users**: Authentication and user management with username/password
- **FHIR Servers**: Connection configurations with multiple authentication types (none, basic, token, OAuth2)
- **Assessments**: Configuration storage for quality assessment parameters including resource selection, validators, and quality frameworks
- **Assessment Results**: Detailed quality scores and validation outcomes per resource type
- **Assessment Logs**: Audit trail and progress tracking for assessment execution

### Quality Assessment Framework
- **Validator Integration**: Support for multiple FHIR validators (Inferno, HAPI) with extensible architecture
- **Implementation Guide Support**: Validation against standard IGs like US Core, CARIN Blue Button, Da Vinci
- **Quality Dimensions**: Kahn Data Quality Framework implementation measuring completeness, conformity, plausibility, timeliness, and calculability
- **Resource Sampling**: Configurable sample sizes for large datasets to balance thoroughness with performance
- **Remediation Engine**: Automated issue detection and correction capabilities with manual review workflow

### Security & Authentication
- **Connection Security**: Secure FHIR server connections with support for multiple authentication methods
- **Data Privacy**: Assessment results stored securely with user isolation
- **Input Validation**: Comprehensive validation using Zod schemas to prevent injection attacks
- **Error Handling**: Structured error responses with appropriate logging

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for primary data storage
- **Connection Pooling**: PostgreSQL connection pool management for optimal database performance

### FHIR Ecosystem
- **FHIR R4B Specification**: Primary healthcare data standard for resource validation
- **Implementation Guides**: US Core, CARIN Blue Button, Da Vinci profiles for specialized validation
- **FHIR Validators**: Integration endpoints for Inferno and HAPI FHIR validation services
- **Terminology Services**: LOINC, SNOMED CT, and other standard code systems for conformity checking

### Development & Deployment
- **Replit Platform**: Development environment with integrated deployment
- **Vite Plugins**: Replit-specific plugins for theme management and error handling
- **TypeScript Compiler**: Type checking and compilation for both frontend and backend code

### Reporting & Export
- **PDF Generation**: PDFKit for comprehensive assessment report generation
- **CSV Export**: Data export capabilities for integration with external analytics tools
- **Chart Libraries**: Recharts for interactive data visualization and quality metrics display