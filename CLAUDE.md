# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FHIRspective v2** is a FHIR-powered healthcare data quality assessment tool that enables data aggregators, payers, providers, and health IT vendors to measure, monitor, and improve the trustworthiness of healthcare data using modern, standards-aligned approaches.

### Core Capabilities
- Validate FHIR R4/R5 resources against US Core and other implementation guides
- Assess data quality using TDQM, DMBOK, and ISO 8000 frameworks
- Integrate with Databricks for advanced analytics and historical trending
- Generate comprehensive quality scorecards with exportable reports
- Support multiple authentication methods for FHIR servers (OAuth, Basic Auth, Token)

---

## Development Commands

### Starting the application
```bash
npm run dev          # Start both API server (port 3001) and client dev server (port 5000)
npm run dev:api      # Start only the API server
npm run dev:client   # Start only the client dev server
```

### Building for production
```bash
npm run build        # Build client bundle (outputs to dist/public)
npm run build:client # Same as above (explicit client build)
```

### Type checking
```bash
npm run check        # Run TypeScript type checking across all code
```

### Database operations
```bash
npm run db:push      # Push schema changes to database using Drizzle Kit
```

### Testing
```bash
npm test             # Currently no tests configured (returns placeholder)
```

---

## Architecture Overview

FHIRspective follows a full-stack TypeScript architecture optimized for both local development and serverless deployment.

### Tech Stack
- **Frontend**: React 18 + TypeScript with Vite bundler
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (supports Neon serverless)
- **State Management**:
  - TanStack Query (React Query) for server state
  - React hooks for local UI state
- **Routing**:
  - React Router DOM for multi-page client routing
  - Wouter for lightweight routing fallback
- **Deployment**: Vercel serverless functions

### Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │   Types     │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (Express.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Routes  │→ │ Services │→ │ Storage  │→ │  Database   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│       ↓             ↓                                        │
│  ┌──────────┐  ┌──────────┐                                 │
│  │  Utils   │  │   FHIR   │  (External FHIR servers)        │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS (Production)                  │
│  api/handler.ts → wraps Express app for serverless          │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
/home/user/FHIRspective/
├── api/                          # Vercel serverless function handlers
│   ├── handler.ts               # Main serverless wrapper for Express app
│   ├── health.ts                # Health check endpoint
│   ├── test-fhir-server.ts      # FHIR server connection testing
│   └── validate-resources.ts    # Resource validation endpoint
│
├── client/                       # Frontend React application
│   └── src/
│       ├── components/          # React components organized by feature
│       │   ├── charts/         # Data visualization components (Bar, Pie, Line, Radar, etc.)
│       │   ├── export/         # Export functionality (ExportButton)
│       │   ├── layout/         # Layout components (Navbar, Footer, AppLayout)
│       │   ├── resource/       # Resource-specific components (Viewer, Remediation)
│       │   ├── ui/             # shadcn/ui primitives (40+ reusable components)
│       │   └── wizard/         # Assessment wizard step components
│       │       ├── ConnectStep.tsx         # Step 1: FHIR server connection
│       │       ├── ConfigureStep.tsx       # Step 2: Assessment configuration
│       │       ├── ExecuteStep.tsx         # Step 3: Run assessment
│       │       ├── ResultsStep.tsx         # Step 4: View results
│       │       └── [other wizard components]
│       ├── hooks/              # Custom React hooks
│       │   ├── use-toast.ts   # Toast notification hook
│       │   └── use-mobile.tsx # Responsive design hook
│       ├── lib/                # Utility functions for client
│       ├── pages/              # Page-level components (router views)
│       │   ├── Home.tsx       # Main assessment wizard interface
│       │   ├── Dashboard.tsx  # Overview dashboard
│       │   ├── Analytics.tsx  # Analytics and trends page
│       │   ├── Settings.tsx   # Application settings
│       │   ├── NewAssessment.tsx         # New assessment creation
│       │   ├── AssessmentDetails.tsx     # Individual assessment details
│       │   └── not-found.tsx  # 404 page
│       ├── types/              # TypeScript type definitions for client
│       ├── App.tsx             # Root React component
│       └── main.tsx            # Client entry point
│
├── server/                       # Backend Express.js application
│   ├── services/                # Business logic services
│   │   ├── assessmentService.ts      # Core assessment orchestration
│   │   ├── fhirService.ts            # FHIR server communication
│   │   ├── validatorService.ts       # FHIR resource validation (Inferno/HAPI/Custom)
│   │   ├── exportService.ts          # Export to CSV/JSON/PDF
│   │   ├── databricksService.ts      # Databricks integration for analytics
│   │   └── resourceCacheService.ts   # Resource caching layer
│   ├── utils/                   # Server utilities
│   │   ├── logger.ts           # Structured logging utility
│   │   └── errors.ts           # Error handling utilities
│   ├── app.ts                   # Express app configuration
│   ├── index.ts                 # Development server entry point
│   ├── routes.ts                # API route definitions
│   ├── storage.ts               # Database access layer (abstraction over Drizzle)
│   ├── db.ts                    # Database connection setup
│   └── vite.ts                  # Vite dev server integration
│
├── shared/                       # Shared code between client and server
│   └── schema.ts                # Drizzle ORM schemas + Zod validation schemas
│
├── databricks/                   # Databricks-specific configurations
│
├── attached_assets/              # Static assets (images, etc.)
│
├── lib/                          # Shared library code
│
├── .claude/                      # Claude Code configuration
│
├── package.json                  # NPM dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite bundler configuration
├── vercel.json                   # Vercel deployment configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── drizzle.config.ts             # Drizzle ORM configuration
└── CLAUDE.md                     # This file
```

---

## Application Flow

FHIRspective follows a 4-step wizard pattern for assessments:

### Step 1: Connect
- User connects to a FHIR server by providing URL and authentication
- Supports OAuth, Basic Auth, Bearer Token, or no authentication
- Connection is tested before saving
- Previously used servers are stored for quick access
- **Key Files**: `client/src/components/wizard/ConnectStep.tsx`, `server/services/fhirService.ts`

### Step 2: Configure
- User selects FHIR resource types to assess (Patient, Observation, etc.)
- Choose sample size (10, 50, 100, 500, or ALL resources)
- Select validation framework (Inferno, HAPI, or Custom rules)
- Pick implementation guide (US Core, C-CDA on FHIR, etc.)
- Configure quality framework (Kahn's TDQM, ISO 8000, DMBOK dimensions)
- **Key Files**: `client/src/components/wizard/ConfigureStep.tsx`

### Step 3: Execute
- System fetches resources from FHIR server
- Validates each resource against selected profiles
- Calculates quality scores across multiple dimensions
- Shows real-time progress updates via WebSocket/polling
- **Key Files**: `client/src/components/wizard/ExecuteStep.tsx`, `server/services/assessmentService.ts`

### Step 4: Results
- Displays comprehensive quality dashboard with charts and metrics
- Shows issues by severity (error, warning, information)
- Allows drill-down into specific resource issues
- Provides export options (JSON, CSV, PDF)
- Optional sync to Databricks for long-term analytics
- **Key Files**: `client/src/components/wizard/ResultsStep.tsx`, `client/src/components/wizard/QualityDashboard.tsx`

---

## Key Technologies & Patterns

### Path Aliases
The project uses TypeScript path aliases configured in `tsconfig.json` and `vite.config.ts`:
- `@/` → `client/src/` (client-side code)
- `@shared/` → `shared/` (shared schemas and types)
- `@assets/` → `attached_assets/` (static assets)

**Usage Example**:
```typescript
import { Button } from "@/components/ui/button";
import { insertAssessmentSchema } from "@shared/schema";
```

### FHIR Support
- **Standards**: R4 and R5 FHIR versions
- **Profiles**: US Core, C-CDA on FHIR, and custom profiles
- **Resources**: Patient, Observation, Condition, MedicationRequest, DiagnosticReport, Procedure, Encounter, and more
- **Authentication**: OAuth 2.0, Basic Auth, Bearer Token, or anonymous access

### Quality Frameworks
- **Kahn's TDQM**: Completeness, Conformity, Plausibility, Timeliness
- **ISO 8000**: Data quality management standards
- **DMBOK**: Data Management Body of Knowledge dimensions
- **Custom**: User-defined quality rules

### Validation Approaches
1. **Inferno Validator**: Standards-based validation using Inferno test suite
2. **HAPI FHIR Validator**: Java-based FHIR validation server
3. **Custom Rules Engine**: JavaScript-based validation with configurable rules

### State Management Patterns
- **Server State**: TanStack Query (React Query) with automatic caching and refetching
- **Form State**: React Hook Form with Zod validation
- **UI State**: React hooks (useState, useReducer)
- **Global UI**: Toast notifications via custom hook

### Component Patterns
- **shadcn/ui**: Copy-paste component library (not npm package)
- **Compound Components**: Used for complex UI like wizards and dialogs
- **Render Props**: For data visualization components
- **Controlled Components**: Forms use react-hook-form for control

---

## API Endpoints

All API routes are prefixed with `/api/` and defined in `server/routes.ts`:

### Health & System
- `GET /api/health` - System health check and storage status

### FHIR Server Management
- `GET /api/fhir-servers` - List all saved FHIR servers for current user
- `POST /api/fhir-servers` - Create/save a new FHIR server connection
- `POST /api/fhir-servers/test-connection` - Test connection to a FHIR server
- `PUT /api/fhir-servers/:id/last-used` - Update last used timestamp

### Assessment Lifecycle
- `GET /api/assessments` - List all assessments for current user
- `GET /api/assessments/:id` - Get specific assessment details
- `POST /api/assessments` - Create a new assessment configuration
- `POST /api/assessments/:id/start` - Start executing an assessment
- `GET /api/assessments/:id/progress` - Get real-time assessment progress
- `GET /api/assessments/:id/results` - Fetch assessment results
- `DELETE /api/assessments/:id` - Delete an assessment

### Results & Export
- `GET /api/assessments/:id/results` - Get detailed results for an assessment
- `GET /api/assessments/:id/export/:format` - Export results (json, csv, pdf)
- `POST /api/export/:format` - Export assessment data in specified format

### Databricks Integration
- `POST /api/databricks/test-connection` - Test Databricks workspace connection
- `POST /api/databricks/sync` - Sync assessment results to Delta Lake
- `GET /api/databricks/sync-status/:id` - Get sync operation status

### Resource Operations
- `GET /api/resources/:resourceType` - Fetch resources from connected FHIR server
- `POST /api/validate` - Validate FHIR resources against profiles

---

## Database Schema

Database schema is defined in `shared/schema.ts` using Drizzle ORM:

### Tables

#### `users`
User authentication and authorization
- `id` (serial, PK)
- `username` (text, unique, not null)
- `password` (text, not null)

#### `fhir_servers`
Saved FHIR server connections
- `id` (serial, PK)
- `url` (text, not null)
- `authType` (text, default: "none")
- `username` (text, nullable)
- `password` (text, nullable)
- `token` (text, nullable)
- `timeout` (integer, default: 30)
- `lastUsed` (timestamp, default: now)
- `userId` (FK → users.id)

#### `assessments`
Assessment configurations and metadata
- `id` (serial, PK)
- `serverId` (FK → fhir_servers.id, not null)
- `userId` (FK → users.id)
- `name` (text, default: "FHIR Assessment")
- `resources` (jsonb, not null) - Array of resource types
- `sampleSize` (text, default: "100")
- `validator` (text, default: "inferno")
- `implementationGuide` (text, default: "uscore")
- `qualityFramework` (text, default: "kahn")
- `dimensions` (jsonb, not null) - Selected quality dimensions
- `purpose` (jsonb, not null) - Assessment purpose metadata
- `remediationOptions` (jsonb, not null) - Auto-fix configurations
- `exportFormat` (text, default: "json")
- `createdAt` (timestamp, default: now)
- `completedAt` (timestamp, nullable)
- `status` (text, default: "pending")

#### `assessment_results`
Validation results per resource type
- `id` (serial, PK)
- `assessmentId` (FK → assessments.id, not null)
- `resourceType` (text, not null)
- `resourcesEvaluated` (integer, not null)
- `issuesIdentified` (integer, not null)
- `autoFixed` (integer, not null)
- `qualityScore` (integer, not null) - Overall score 0-100
- `completenessScore` (integer, not null)
- `conformityScore` (integer, not null)
- `plausibilityScore` (integer, not null)
- `timelinessScore` (integer, nullable)
- `calculabilityScore` (integer, nullable)
- `issues` (jsonb, not null) - Array of validation issues
- `createdAt` (timestamp, default: now)

#### `assessment_logs`
Execution logs and audit trail
- `id` (serial, PK)
- `assessmentId` (FK → assessments.id, not null)
- `level` (text, not null) - info, warn, error
- `message` (text, not null)
- `metadata` (jsonb, nullable)
- `createdAt` (timestamp, default: now)

#### `databricks_configs`
Databricks workspace configurations
- `id` (serial, PK)
- `userId` (FK → users.id, not null)
- `workspaceUrl` (text, not null)
- `accessToken` (text, not null)
- `clusterId` (text, nullable)
- `catalogName` (text, default: "hive_metastore")
- `schemaName` (text, default: "fhirspective")
- `isActive` (boolean, default: true)
- `createdAt` (timestamp, default: now)
- `updatedAt` (timestamp, default: now)

---

## Environment Configuration

### Development
The application runs in development mode with hot module reloading:
- **Client**: Vite dev server on port 5000 (default)
- **API**: Express server on port 3001
- **Proxy**: Vite proxies `/api/*` requests to Express server

### Production (Vercel)
In production, the app runs as serverless functions:
- **Static Assets**: Client bundle served from `dist/public`
- **API**: Express app wrapped in `api/handler.ts` serverless function
- **Database**: Neon PostgreSQL serverless database recommended
- **Functions**: All TypeScript files in `api/` directory become serverless endpoints

### Environment Variables
Create a `.env` file (not tracked in git):
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Databricks (optional)
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=your-access-token
DATABRICKS_CLUSTER_ID=your-cluster-id

# Server
PORT=3001
NODE_ENV=development
```

---

## Development Workflows

### Adding a New UI Component
1. Use shadcn CLI to add pre-built components:
   ```bash
   npx shadcn@latest add [component-name]
   ```
2. Components are copied to `client/src/components/ui/`
3. Customize as needed - these are your components to own

### Adding a New Page
1. Create page component in `client/src/pages/[PageName].tsx`
2. Add route to `client/src/App.tsx` or router configuration
3. Add navigation link to `client/src/components/layout/Navbar.tsx`

### Adding a New API Endpoint
1. Define route handler in `server/routes.ts`
2. If complex logic, create service in `server/services/[feature]Service.ts`
3. Add database operations to `server/storage.ts` if needed
4. Update schema in `shared/schema.ts` if new tables/columns required
5. Run `npm run db:push` to sync database schema

### Adding a New Validation Rule
1. Edit `server/services/validatorService.ts`
2. Add rule logic to appropriate validation method
3. Define issue format following `ValidationIssue` interface
4. Test against sample FHIR resources

### Working with Database Schema
1. Edit `shared/schema.ts` to modify tables
2. Use Drizzle's schema definition API
3. Run `npm run db:push` to apply changes
4. Schema is shared between client and server via `@shared/schema`

---

## Important Conventions

### Code Style
- **TypeScript**: Strict mode enabled, all code must type-check
- **Imports**: Use ES modules (`.js` extension in import paths for Node files)
- **Async/Await**: Preferred over callbacks and raw promises
- **Error Handling**: Use try/catch with structured error objects

### Naming Conventions
- **Files**: camelCase for utilities, PascalCase for components
- **Components**: PascalCase (e.g., `DataQualityDashboard.tsx`)
- **Hooks**: Prefix with `use` (e.g., `useToast.ts`)
- **Services**: Suffix with `Service` (e.g., `fhirService.ts`)
- **Types**: PascalCase interfaces and types

### Component Organization
```typescript
// 1. Imports (external first, then internal)
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface Props { ... }

// 3. Component definition
export function ComponentName({ props }: Props) {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Event handlers
  const handleClick = () => { ... };

  // 6. Effects
  useEffect(() => { ... }, []);

  // 7. Render
  return (
    <div>...</div>
  );
}
```

### Service Layer Pattern
Services should:
- Export a singleton instance (e.g., `export const fhirService = new FhirService()`)
- Handle all business logic for their domain
- Throw AppError instances for known error cases
- Log operations using the logger utility
- Be stateless when possible

### Database Access Pattern
- Always use `server/storage.ts` as the data access layer
- Never import Drizzle ORM directly in routes or services
- Use Zod schemas from `@shared/schema` for validation
- Handle database errors gracefully

---

## Testing & Quality

### Type Checking
Run type checking before committing:
```bash
npm run check
```

This validates TypeScript across the entire project, including:
- Client code
- Server code
- Shared schemas
- API handlers

### Manual Testing Workflow
1. Start dev server: `npm run dev`
2. Test FHIR server connection using public test servers:
   - HAPI FHIR: `http://hapi.fhir.org/baseR4`
   - UHN Test Server: `https://fhir.aidbox.app/fhir`
3. Run assessment with small sample size (10-50 resources)
4. Verify results display correctly
5. Test export functionality

### Debugging
- **Client**: Use browser DevTools, React DevTools extension
- **Server**: Use `console.log` or attach debugger to tsx process
- **Database**: Check Neon dashboard or use Drizzle Studio
- **API**: Use Postman or curl to test endpoints directly

---

## Deployment

### Vercel Deployment
The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist/public",
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

**Deployment Steps**:
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Vercel automatically builds and deploys on push

**Important Notes**:
- Client bundle is built to `dist/public`
- All `api/**/*.ts` files become serverless functions
- Function timeout is 30 seconds (max for Hobby plan)
- Database connection pooling handled by Neon

### Manual Deployment
For other platforms:
1. Build client: `npm run build:client`
2. Serve `dist/public` as static files
3. Run `server/index.ts` with `tsx` or compile to JS first
4. Set `NODE_ENV=production`

---

## Common Tasks for AI Assistants

### When Asked to Debug Validation Issues
1. Check `server/services/validatorService.ts` for validation logic
2. Review FHIR resource structure in assessment results
3. Verify implementation guide and validator selection
4. Look at `issues` JSONB field in `assessment_results` table

### When Asked to Add a New Chart
1. Create component in `client/src/components/charts/`
2. Use Recharts library (already installed)
3. Follow existing chart component patterns
4. Import and use in `QualityDashboard.tsx` or `ResultsStep.tsx`

### When Asked to Improve Performance
1. Check database queries in `server/storage.ts`
2. Consider adding indexes to Drizzle schema
3. Review FHIR server fetch logic in `fhirService.ts`
4. Implement caching via `resourceCacheService.ts`
5. Optimize React re-renders (useMemo, useCallback)

### When Asked About Authentication
1. Current implementation uses demo user (ID: 1)
2. Auth infrastructure exists in schema but not fully implemented
3. For production, implement passport.js strategies
4. See commented auth code in `server/routes.ts`

### When Asked to Add Databricks Features
1. Review `server/services/databricksService.ts`
2. Use Databricks REST API for queries and jobs
3. Sync schema defined in `databricks_configs` table
4. Test connection before syncing data

---

## Troubleshooting

### Build Errors
- **"Cannot find module '@/...'"**: Check `tsconfig.json` and `vite.config.ts` path aliases
- **"Type error in client code"**: Run `npm run check` to see all errors
- **Drizzle schema errors**: Ensure `shared/schema.ts` exports are correct

### Runtime Errors
- **"Failed to connect to FHIR server"**: Check URL format and authentication
- **"Database connection failed"**: Verify `DATABASE_URL` environment variable
- **CORS errors**: Ensure Vite proxy is configured correctly in development
- **Validation fails silently**: Check console logs in `validatorService.ts`

### Development Issues
- **Port already in use**: Kill process on port 3001 or 5000
- **Hot reload not working**: Restart dev server
- **Changes not reflected**: Clear Vite cache (`rm -rf node_modules/.vite`)

---

## Additional Resources

### Documentation
- **FHIR Specification**: https://hl7.org/fhir/
- **US Core Implementation Guide**: https://hl7.org/fhir/us/core/
- **Drizzle ORM**: https://orm.drizzle.team/
- **shadcn/ui**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/

### Related Files
- `README.md` - Project overview and features
- `V2_DESIGN.md` - Version 2 design documentation
- `IMPLEMENTATION_PLAN.md` - Implementation roadmap
- `FHIR_SERVER_SETUP.md` - FHIR server setup guide
- `MEDPLUM_SETUP.md` - Medplum server configuration

---

## Summary for AI Assistants

When working on this project:
1. **Always run type checking** before major changes
2. **Follow the service layer pattern** - don't put business logic in routes
3. **Use the existing component library** - shadcn/ui provides most UI needs
4. **Respect the wizard flow** - don't bypass the 4-step assessment process
5. **Handle errors gracefully** - FHIR servers can be unreliable
6. **Test with real FHIR servers** - use public test servers for validation
7. **Consider serverless constraints** - 30 second timeout on Vercel
8. **Use path aliases** - keep imports clean with `@/` and `@shared/`
9. **Document complex logic** - especially in validation and scoring
10. **Preserve data quality focus** - this is a healthcare compliance tool

For questions or issues, refer to this file first, then examine the relevant service or component code.
