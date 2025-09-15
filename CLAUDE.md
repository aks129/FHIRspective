# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the application
```bash
npm run dev       # Start development server on port 5000
```

### Building for production
```bash
npm run build     # Build client and server bundles
npm start         # Run production server
```

### Type checking
```bash
npm run check     # Run TypeScript type checking
```

### Database operations
```bash
npm run db:push   # Push schema changes to database using Drizzle
```

## Architecture Overview

FHIRspective is a FHIR-powered healthcare data quality assessment tool built with:
- **Frontend**: React + TypeScript with Vite, using shadcn/ui components
- **Backend**: Express server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS

### Key Directory Structure
- `/client` - React frontend application
  - `/src/components` - UI components organized by feature (charts, wizard, ui, layout)
  - `/src/pages` - Page components (Home is the main wizard interface)
  - `/src/hooks` - Custom React hooks for API interactions
  - `/src/types` - TypeScript type definitions
- `/server` - Express backend
  - `/services` - Business logic services
    - `assessmentService.ts` - Manages FHIR data quality assessments
    - `fhirService.ts` - FHIR server connections and data fetching
    - `validatorService.ts` - Data validation against FHIR profiles
    - `exportService.ts` - Export assessment results in various formats
  - `/routes.ts` - API endpoint definitions
  - `/storage.ts` - Database access layer
- `/shared` - Shared code between client and server
  - `schema.ts` - Drizzle database schema and Zod validation schemas
- `/api` - Vercel serverless function wrapper

### Application Flow
1. **Connect Step**: User connects to a FHIR server (supports OAuth, Basic Auth, or no auth)
2. **Configure Step**: Select resources to assess, sample size, validation framework
3. **Execute Step**: Run assessment against FHIR server data
4. **Results Step**: View quality scores, issues, and export reports

### Key Technologies & Patterns
- **FHIR Support**: R4/R5 standards, US Core profiles
- **Quality Frameworks**: Kahn's TDQM, ISO 8000, DMBOK dimensions
- **Validation**: Inferno validator, custom rule engine
- **State Management**: React Query for server state, local state for wizard flow
- **Path Aliases**:
  - `@/` → `client/src/`
  - `@shared/` → `shared/`
  - `@assets/` → `attached_assets/`

### API Endpoints
All API routes are prefixed with `/api/`:
- `/fhir-servers` - Manage FHIR server connections
- `/fhir-servers/test-connection` - Test FHIR server connectivity
- `/assessments` - Create and manage assessments
- `/assessments/:id/start` - Start assessment execution
- `/assessments/:id/progress` - Get real-time progress
- `/assessments/:id/results` - Fetch assessment results
- `/export/:format` - Export results (CSV, JSON, PDF)

### Database Schema
Main tables (defined in `shared/schema.ts`):
- `users` - User authentication
- `fhir_servers` - FHIR server connections
- `assessments` - Assessment configurations
- `assessment_results` - Validation results per resource
- `assessment_logs` - Execution logs

### Environment Configuration
The app runs on port 5000 and serves both API and client. Database connection is managed through Drizzle with Neon PostgreSQL.