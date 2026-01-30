# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the application
```bash
npm run dev       # Start development server on port 5000
```

### Building for production
```bash
npm run build     # Build client, server, and API handler bundles
npm start         # Run production server locally
```

The build process produces three outputs:
1. `dist/public/` - Client bundle (Vite output)
2. `dist/index.js` - Server bundle for local/traditional deployment
3. `api/index.js` - Bundled API handler for Vercel serverless deployment

**Important**: All three outputs are build artifacts (in `.gitignore`). Only `api/index.ts` (source) is committed, not `api/index.js` (bundled).

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
- **Database**: PostgreSQL with Drizzle ORM (with in-memory fallback)
- **Styling**: Tailwind CSS
- **Deployment**: Supports both traditional Node.js hosting and Vercel serverless functions

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
    - `databricksService.ts` - Databricks Delta Lake integration and sync
    - `resourceCacheService.ts` - FHIR resource caching
  - `/routes.ts` - API endpoint definitions
  - `/storage.ts` - Storage abstraction layer (supports in-memory and PostgreSQL)
  - `/app.ts` - Express app factory (used by both local server and Vercel)
- `/shared` - Shared code between client and server
  - `schema.ts` - Drizzle database schema and Zod validation schemas
- `/api` - Vercel serverless function handler
  - `index.ts` - Serverless wrapper (bundled to `index.js` during build)

### Application Flow
1. **Connect Step**: User connects to a FHIR server (supports OAuth, Basic Auth, or no auth)
2. **Configure Step**: Select resources to assess, sample size, validation framework
3. **Execute Step**: Run assessment against FHIR server data
4. **Results Step**: View quality scores, issues, and export reports

### Key Technologies & Patterns
- **FHIR Support**: R4/R5 standards, US Core profiles, works with Medplum and other FHIR servers
- **Quality Frameworks**: Kahn's TDQM, ISO 8000, DMBOK dimensions
- **Validation**: Inferno validator, custom rule engine
- **State Management**: React Query for server state, local state for wizard flow
- **Build Tool**: esbuild for server/API bundling (with `--packages=external` to externalize node_modules)
- **Path Aliases**:
  - `@/` → `client/src/`
  - `@shared/` → `shared/`
  - `@assets/` → `attached_assets/`

### Important Implementation Notes

1. **Serverless-compatible architecture**: `server/app.ts` exports `createApp()` factory used by both local server (`server/index.ts`) and Vercel handler (`api/index.ts`)

2. **Vercel deployment requires bundling**: The API handler must be pre-bundled because Vercel can't resolve TypeScript imports to `../server/app` at runtime. This is why the build script bundles with esbuild.

3. **Demo/testing**: Supports both:
   - In-memory storage (no database required)
   - Medplum demo server connection for quick testing with real FHIR data

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

### Deployment Models

The application supports two deployment models:

1. **Traditional Node.js hosting** (development and self-hosted production)
   - Run `npm run dev` for development (port 5000)
   - Run `npm run build && npm start` for production
   - Serves both static files and API from a single Express server

2. **Vercel serverless deployment**
   - API handler at `/api` is bundled as a serverless function
   - Build creates `api/index.js` (auto-generated, in .gitignore)
   - Client static files served from `dist/public/`
   - Configured via `vercel.json`
   - When deployed to Vercel, `process.env.VERCEL === '1'` disables static file serving in app.ts

### Storage Layer

The app uses a storage abstraction (`server/storage.ts`) that supports:
- **In-memory storage** (default, no DATABASE_URL needed) - good for demos and development
- **PostgreSQL with Drizzle ORM** (when DATABASE_URL is set)

Demo mode uses a hardcoded `userId = 1` for all operations (see `server/routes.ts`).

### Databricks Integration

Optional analytics features via `databricksService.ts`:
- Sync assessment results to Databricks Delta Lake
- Configure via Settings page (workspace URL, access token, cluster ID)
- Tables created in `fhirspective` database
- See `databricks/` directory for setup notebooks

### Environment Variables

```bash
# Database (optional - uses in-memory storage if not set)
DATABASE_URL=postgresql://user:pass@host:5432/fhirspective

# Databricks (optional - for analytics features)
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=dapi...
DATABRICKS_CLUSTER_ID=0123-456789-abc123

# Vercel (auto-set by Vercel platform)
VERCEL=1
```