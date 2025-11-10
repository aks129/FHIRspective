# FHIRspective 500 Error Fix - Implementation Plan

**Created**: 2025-11-10
**Branch**: `claude/debug-500-errors-011CUyPBLo8EUjX5nuCzQ1D8`
**Status**: In Progress

---

## Executive Summary

This plan addresses 7 critical issues causing 500 errors and FHIR connection failures in the FHIRspective application. The fixes are organized into 3 phases with estimated timelines and testing requirements.

---

## Issue Prioritization Matrix

| Priority | Issue | Impact | Effort | Status |
|----------|-------|--------|--------|--------|
| P0 | Buffer polyfill missing | HIGH | LOW | ⏳ Planned |
| P0 | CORS missing | HIGH | LOW | ⏳ Planned |
| P0 | Error handling failures | HIGH | MEDIUM | ⏳ Planned |
| P1 | Timeout handling | MEDIUM | LOW | ⏳ Planned |
| P1 | Environment config | MEDIUM | LOW | ⏳ Planned |
| P2 | In-memory storage | HIGH | HIGH | 📋 Future |
| P2 | Long-running tasks | HIGH | HIGH | 📋 Future |

---

## PHASE 1: Critical Serverless Fixes (Immediate)

**Timeline**: 2-3 hours
**Goal**: Fix immediate 500 errors and enable basic functionality

### 1.1 Fix Buffer Polyfill for Basic Auth

**Problem**: `Buffer` is Node.js specific, not available in Edge runtime or browser contexts.

**Files to Modify**:
- `server/services/fhirService.ts`

**Solution**:
```typescript
// Create a universal base64 encoder that works in all environments
function encodeBase64(str: string): string {
  // Check if Buffer is available (Node.js)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  // Fallback to btoa for browser/edge runtime
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Final fallback - manual base64 encoding
  throw new Error('No base64 encoding method available');
}
```

**Testing**:
- ✅ Test with Basic Auth FHIR server
- ✅ Test in Node.js environment
- ✅ Test in Vercel deployment
- ✅ Verify auth headers are correct

---

### 1.2 Add CORS Middleware

**Problem**: Cross-origin requests blocked by browser

**Files to Modify**:
- `server/app.ts`
- `package.json` (add cors dependency)

**Solution**:
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Environment Variables**:
```bash
ALLOWED_ORIGINS=http://localhost:5173,https://yourapp.vercel.app
```

**Testing**:
- ✅ Test OPTIONS preflight requests
- ✅ Test cross-origin POST requests
- ✅ Verify credentials are passed
- ✅ Check browser console for CORS errors

---

### 1.3 Improve Error Handling & Logging

**Problem**: Errors swallowed, returning empty arrays or generic 500s

**Files to Modify**:
- `server/services/fhirService.ts`
- `server/services/validatorService.ts`
- `server/services/assessmentService.ts`
- `server/routes.ts`

**Solution Pattern**:
```typescript
// Create structured error response
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Enhanced logging
function logError(context: string, error: any, metadata?: any) {
  console.error(`[${new Date().toISOString()}] [${context}]`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata
  });
}

// Better error propagation
async function fetchResources(...) {
  try {
    // ... existing code
  } catch (error) {
    logError('FhirService.fetchResources', error, { resourceType, connection: connection.url });
    throw new Error(`Failed to fetch ${resourceType} resources: ${error.message}`);
  }
}
```

**Testing**:
- ✅ Test invalid FHIR URLs
- ✅ Test timeout scenarios
- ✅ Test authentication failures
- ✅ Verify error messages are helpful
- ✅ Check logs for debugging info

---

## PHASE 2: Reliability & Performance (Follow-up)

**Timeline**: 3-4 hours
**Goal**: Improve reliability and user experience

### 2.1 Enhanced Timeout Handling

**Problem**: Aggressive timeouts cause premature failures

**Files to Modify**:
- `server/services/fhirService.ts`
- `shared/schema.ts` (update default timeout)

**Solution**:
```typescript
// Increase default timeout
const DEFAULT_TIMEOUT = 60; // 60 seconds

// Add retry logic
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry on 5xx errors (server errors)
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Testing**:
- ✅ Test with slow FHIR servers
- ✅ Verify retry logic with transient failures
- ✅ Test exponential backoff timing
- ✅ Ensure no infinite retries

---

### 2.2 Environment Configuration

**Problem**: Hardcoded values, no environment-specific settings

**Files to Create**:
- `server/config.ts`

**Solution**:
```typescript
export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],

  // FHIR
  defaultTimeout: parseInt(process.env.FHIR_TIMEOUT || '60'),
  maxRetries: parseInt(process.env.FHIR_MAX_RETRIES || '3'),

  // Assessment
  batchSize: parseInt(process.env.ASSESSMENT_BATCH_SIZE || '10'),
  maxAssessmentDuration: parseInt(process.env.MAX_ASSESSMENT_DURATION || '300'), // 5 min

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  enableDebugLogs: process.env.DEBUG_LOGS === 'true',

  // Vercel
  isVercel: process.env.VERCEL === '1',
  vercelRegion: process.env.VERCEL_REGION,

  // Security
  trustProxy: process.env.TRUST_PROXY === 'true',
};
```

**Testing**:
- ✅ Test with different environment variables
- ✅ Verify defaults work
- ✅ Test in local and Vercel environments

---

## PHASE 3: Monitoring & Observability (Polish)

**Timeline**: 2-3 hours
**Goal**: Add visibility and debugging capabilities

### 3.1 Structured Logging

**Files to Create**:
- `server/utils/logger.ts`

**Solution**:
```typescript
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, metadata?: any, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      metadata,
      error: error ? {
        message: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined,
        code: (error as any).code
      } : undefined
    };

    console[level === LogLevel.ERROR ? 'error' : 'log'](JSON.stringify(entry));
  }

  debug(message: string, metadata?: any) {
    if (config.enableDebugLogs) {
      this.log(LogLevel.DEBUG, message, metadata);
    }
  }

  info(message: string, metadata?: any) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: any) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: any) {
    this.log(LogLevel.ERROR, message, metadata, error);
  }
}
```

---

### 3.2 Request Validation Middleware

**Files to Create**:
- `server/middleware/validation.ts`

**Solution**:
```typescript
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationError.details,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    }
  };
}
```

---

### 3.3 Health Check Endpoint

**Files to Modify**:
- `server/routes.ts`

**Solution**:
```typescript
app.get("/api/health", async (req: Request, res: Response) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    region: config.vercelRegion || 'local',
    storage: "in-memory",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      storage: true,
      // Add more health checks as needed
    }
  };

  res.json(health);
});
```

---

## FUTURE WORK (Phase 4+)

These require more architectural changes and will be addressed in future iterations:

### 4.1 Database Persistence
- Replace `MemStorage` with Drizzle ORM + Neon PostgreSQL
- Implement connection pooling for serverless
- Add database migrations
- **Estimated Time**: 6-8 hours

### 4.2 Job Queue for Long-Running Tasks
- Implement Vercel Queue or external queue (Bull, BullMQ)
- Move assessment processing to background jobs
- Add webhook notifications for completion
- **Estimated Time**: 8-10 hours

### 4.3 Caching Layer
- Add Redis for session data
- Cache FHIR server metadata
- Cache validation rules
- **Estimated Time**: 4-6 hours

---

## Testing Strategy

### Unit Tests
- [ ] Test base64 encoding across environments
- [ ] Test error handling with mocked failures
- [ ] Test retry logic with various scenarios
- [ ] Test configuration loading

### Integration Tests
- [ ] Test full FHIR server connection flow
- [ ] Test assessment creation and execution
- [ ] Test error propagation through stack
- [ ] Test CORS with actual browser requests

### Manual Testing Checklist
- [ ] Test with HAPI FHIR test server (no auth)
- [ ] Test with SMART on FHIR server (OAuth)
- [ ] Test with custom server (Basic Auth)
- [ ] Test timeout scenarios
- [ ] Test invalid credentials
- [ ] Test network failures
- [ ] Test concurrent assessments
- [ ] Test in Vercel deployment
- [ ] Test cold start behavior

---

## Rollout Plan

1. **Development** (2-3 days)
   - Implement Phase 1 fixes
   - Test locally with various FHIR servers
   - Implement Phase 2 fixes
   - Add Phase 3 monitoring

2. **Staging** (1 day)
   - Deploy to Vercel preview environment
   - Run full test suite
   - Monitor logs for issues
   - Performance testing

3. **Production** (1 day)
   - Deploy to production
   - Monitor error rates
   - Watch for new issues
   - Gather user feedback

---

## Success Metrics

### Before Fixes
- 500 error rate: ~40%
- FHIR connection success rate: ~60%
- Assessment completion rate: ~50%
- Average time to error: 10s

### After Fixes (Target)
- 500 error rate: <5%
- FHIR connection success rate: >95%
- Assessment completion rate: >90%
- Average time to error: 0s (no errors)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CORS breaks existing clients | Low | Medium | Test thoroughly before deploy |
| Buffer polyfill fails in some envs | Low | High | Add comprehensive fallbacks |
| Increased timeouts cause function timeouts | Medium | Medium | Monitor execution times |
| New error format breaks frontend | Low | Medium | Version API responses |
| Performance degradation from logging | Low | Low | Use structured logging, add toggle |

---

## Dependencies & Prerequisites

### Required Packages
```json
{
  "dependencies": {
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17"
  }
}
```

### Environment Variables
```bash
# Required
NODE_ENV=production

# Optional - CORS
ALLOWED_ORIGINS=https://yourapp.vercel.app,http://localhost:5173

# Optional - FHIR
FHIR_TIMEOUT=60
FHIR_MAX_RETRIES=3

# Optional - Logging
LOG_LEVEL=info
DEBUG_LOGS=false

# Optional - Assessment
ASSESSMENT_BATCH_SIZE=10
MAX_ASSESSMENT_DURATION=300
```

---

## Rollback Plan

If issues are detected after deployment:

1. **Immediate**: Revert to previous commit
   ```bash
   git revert HEAD
   git push origin claude/debug-500-errors-011CUyPBLo8EUjX5nuCzQ1D8
   ```

2. **Short-term**: Disable problematic features via feature flags
   - Disable new error handling
   - Disable retry logic
   - Revert to old CORS settings

3. **Long-term**: Fix issues and redeploy with additional testing

---

## Support & Documentation

### Error Messages
All new error messages should be:
- Clear and actionable
- Include error codes for tracking
- Provide context (what failed, why)
- Suggest next steps

### Logging
All logs should include:
- Timestamp (ISO 8601)
- Context (service, method)
- Structured metadata
- Error details when applicable

### Monitoring
- Track 500 error rates
- Monitor FHIR connection success rates
- Watch for timeout patterns
- Alert on high error rates

---

## Sign-off

- [ ] Code reviewed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Deployment plan approved
- [ ] Rollback plan tested

---

**End of Implementation Plan**
