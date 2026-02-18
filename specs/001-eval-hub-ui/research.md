# Research Findings: Eval Hub UI Implementation

**Date**: 2026-02-12
**Feature**: Eval Hub UI - Model Evaluation Orchestration
**Status**: COMPLETE

## Overview

This document captures research findings for implementing the lm-eval package following ODH Dashboard patterns. Research focused on understanding existing integration patterns from gen-ai and maas packages, technical dependencies, and architectural decisions.

---

## 1. Backend Evaluation Service Integration

### Decision: HTTP REST API with Polling

**Rationale**: The backend evaluation service (assumed to be a separate microservice) will be accessed via HTTP REST APIs. Long-running evaluation jobs will use a polling pattern similar to how gen-ai integrates with external model services.

**Integration Pattern**:
- BFF acts as a proxy between frontend and backend evaluation service
- BFF caches evaluation metadata and status for faster retrieval
- Frontend polls BFF for status updates at configurable intervals (default: 5 seconds for running jobs)
- Backend service is responsible for actual job execution and results storage

**API Authentication**:
- Use Kubernetes service account tokens for BFF → backend service communication
- Leverage ODH Dashboard's existing RBAC for user authorization
- BFF validates user permissions before forwarding requests

**Reference Implementation**:
- Gen-AI's integration with LlamaStack K8s Operator: `/workspace/repos/odh-dashboard/packages/gen-ai/bff/internal/services/llama_service.go`
- Uses httprouter for routing, similar pattern needed for evaluation service client

**Alternatives Considered**:
- WebSockets for real-time updates: Rejected due to increased complexity, connection management overhead, and incompatibility with Module Federation proxy setup
- Server-Sent Events (SSE): Rejected due to browser connection limits and complexity in Kubernetes environments

---

## 2. Model Registry Integration

### Decision: KServe Integration via ODH Dashboard Internal APIs

**Rationale**: ODH Dashboard already integrates with KServe for model serving. The lm-eval package will leverage existing ODH internal APIs to fetch model information.

**Integration Approach**:
- Use `@odh-dashboard/internal` package APIs for model registry access
- BFF will query KServe InferenceServices to list available models
- Model metadata includes: name, version, runtime, endpoint URL, status

**Code Reference**:
- Gen-AI's KServe integration: uses `github.com/kserve/kserve v0.16.1` in `go.mod`
- Frontend uses `@odh-dashboard/internal` for model listings

**Model Selection UX**:
- Frontend displays models grouped by namespace/project
- Filter models by status (ready, pending, failed)
- Show model runtime and version for disambiguation

**Alternatives Considered**:
- Direct KServe API calls from BFF: Rejected to avoid duplicating existing integration code and to maintain consistency with other ODH Dashboard packages

---

## 3. Evaluation Task Catalog

### Decision: Static Configuration with Future Dynamic API Support

**Rationale**: Initial implementation will use a static catalog of evaluation tasks defined in configuration files. This allows rapid development while leaving room for future enhancement to support dynamic task discovery from backend service.

**Task Definition Schema**:
```typescript
interface EvaluationTask {
  id: string;              // Unique task identifier (e.g., "mmlu", "hellaswag")
  name: string;            // Display name
  description: string;     // Task description for users
  category: string;        // Task category (e.g., "reasoning", "knowledge")
  parameters: {            // Configurable parameters
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    default?: any;
    required: boolean;
    description: string;
    options?: string[];    // For select type
  }[];
  resultSchema: {          // Expected result format
    metrics: string[];     // List of metrics returned
  };
}
```

**Storage**:
- BFF: Static JSON configuration file loaded at startup, served via `/api/tasks` endpoint
- Frontend: Fetches tasks on demand, caches in React Context

**Future Enhancement Path**:
- Replace static configuration with dynamic API call to backend evaluation service
- Backend service maintains authoritative task catalog
- BFF caches tasks with TTL to reduce backend load

**Alternatives Considered**:
- Pure frontend-defined tasks: Rejected due to lack of validation against backend capabilities
- Database-stored tasks: Rejected as unnecessary complexity for initial release

---

## 4. ODH Dashboard Extension Points

### Decision: Module Federation with Extension Point System

**Rationale**: Follow the exact pattern established by gen-ai and maas packages for seamless integration with ODH Dashboard.

**Extension Points to Implement**:

#### Navigation Extensions
```typescript
// Area registration
{
  type: 'app.area',
  properties: {
    id: 'lm-eval',
    requiredComponents: ['odh-dashboard'],
    featureFlags: ['evalHub']
  }
}

// Navigation section
{
  type: 'app.navigation/section',
  flags: { required: ['lm-eval'] },
  properties: {
    id: 'eval-hub',
    title: 'Evaluation Hub',
    group: '5_eval_hub'  // After gen-ai-studio (group 4)
  }
}

// Navigation link
{
  type: 'app.navigation/href',
  flags: { required: ['lm-eval'] },
  properties: {
    id: 'evaluations',
    title: 'Evaluations',
    href: '/eval-hub/evaluations',
    section: 'eval-hub',
    icon: /* PatternFly icon */
  }
}
```

#### Route Extensions
```typescript
{
  type: 'app.route',
  flags: { required: ['lm-eval'] },
  properties: {
    path: '/eval-hub/*',
    component: () => import('./EvalHubWrapper')
  }
}
```

**File Structure** (following gen-ai pattern):
- `/packages/lm-eval/frontend/src/odh/extension-points/index.ts` - Extension point type definitions
- `/packages/lm-eval/frontend/src/odh/extensions.ts` - Extension registrations
- `/packages/lm-eval/frontend/src/odh/PluginStoreContextProvider.tsx` - Plugin store setup

**Reference Files**:
- Gen-AI Extensions: `/workspace/repos/odh-dashboard/packages/gen-ai/frontend/src/odh/extensions.ts`
- MaaS Extensions: `/workspace/repos/odh-dashboard/packages/maas/frontend/src/odh/extensions.ts`

**Alternatives Considered**:
- Standalone application: Rejected to maintain integration with ODH Dashboard navigation and authentication

---

## 5. Module Federation Configuration

### Decision: Webpack Module Federation with Shared Dependencies

**Rationale**: Use Module Federation to enable dynamic loading of the lm-eval package into ODH Dashboard at runtime, following the established pattern.

**Configuration**:
```javascript
// packages/lm-eval/frontend/config/moduleFederation.js
const moduleFederationConfig = {
  name: 'lmEval',
  filename: 'remoteEntry.js',
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    'react-router': { singleton: true },
    'react-router-dom': { singleton: true },
    '@patternfly/react-core': { singleton: true, requiredVersion: '^5.0.0' },
    '@openshift/dynamic-plugin-sdk': { singleton: true },
    '@odh-dashboard/plugin-core': { singleton: true, requiredVersion: '0.0.0' },
    '@odh-dashboard/internal': { singleton: true, requiredVersion: '0.0.0' },
  },
  exposes: {
    './extensions': './src/odh/extensions',
    './extension-points': './src/odh/extension-points',
  },
  runtime: false,
  dts: true,  // Generate TypeScript definitions
};
```

**Package.json Metadata**:
```json
{
  "module-federation": {
    "name": "lmEval",
    "remoteEntry": "/remoteEntry.js",
    "authorize": true,
    "tls": false,
    "proxy": [
      {
        "path": "/lm-eval/api",
        "pathRewrite": "/api"
      }
    ],
    "local": {
      "host": "localhost",
      "port": 9105  // Next available port after maas (9104)
    },
    "service": {
      "name": "odh-dashboard",
      "port": 8043
    }
  },
  "exports": {
    "./extension-points": "./frontend/src/odh/extension-points/index.ts"
  }
}
```

**Proxy Configuration**: The dashboard will proxy `/lm-eval/api/*` requests to the BFF's `/api/*` endpoints, enabling frontend API calls through the dashboard's authentication layer.

**Reference Files**:
- Gen-AI Module Federation: `/workspace/repos/odh-dashboard/packages/gen-ai/frontend/config/moduleFederation.js`
- MaaS Module Federation: `/workspace/repos/odh-dashboard/packages/maas/frontend/config/moduleFederation.js`

**Alternatives Considered**:
- Webpack DLL plugin: Deprecated and replaced by Module Federation
- Script injection: Rejected due to lack of dependency management and isolation

---

## 6. State Management Patterns

### Decision: React Context API + Custom Hooks with Polling

**Rationale**: Lightweight state management following gen-ai patterns. Avoid heavy state libraries (Redux, MobX) as they add unnecessary complexity for this use case.

**State Management Architecture**:

#### Context Providers
- `EvaluationsContext`: Manages list of evaluations and CRUD operations
- `TemplatesContext`: Manages evaluation templates
- `TasksContext`: Caches task catalog
- `ConfigContext`: Application configuration (polling intervals, feature flags)

#### Custom Hooks Pattern
```typescript
// packages/lm-eval/frontend/src/services/hooks/useEvaluations.ts
export const useEvaluations = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await evaluationsApi.list();
      setEvaluations(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { evaluations, loading, error, fetchEvaluations };
};
```

#### Polling Hook for Long-Running Jobs
```typescript
// packages/lm-eval/frontend/src/services/hooks/usePolling.ts
export const usePolling = (
  callback: () => Promise<void>,
  interval: number,
  enabled: boolean
) => {
  useEffect(() => {
    if (!enabled) return;

    const pollInterval = setInterval(callback, interval);
    callback(); // Initial call

    return () => clearInterval(pollInterval);
  }, [callback, interval, enabled]);
};

// Usage in evaluation details page
const { evaluation } = useEvaluation(id);
const isRunning = evaluation?.status === 'running';

usePolling(
  async () => {
    await refetchEvaluation();
  },
  5000, // Poll every 5 seconds
  isRunning // Only poll while running
);
```

**Optimistic Updates**:
- Create evaluation: Immediately add to list with "pending" status
- Update status based on polling responses
- Handle errors by reverting optimistic changes

**Reference Implementation**:
- Gen-AI uses similar pattern with `@odh-dashboard/plugin-core` hooks
- No Redux/MobX dependencies in gen-ai or maas packages

**Alternatives Considered**:
- Redux: Rejected as overkill for this scope, adds bundle size and complexity
- React Query/SWR: Rejected to avoid additional dependencies, custom hooks provide needed functionality
- WebSockets: Rejected (see Backend Integration section)

---

## 7. Results Storage and Retrieval

### Decision: Backend Service Owns Results, BFF Provides Caching Layer

**Rationale**: Evaluation results can be large (MB-scale for comprehensive benchmarks). Backend service is responsible for persistent storage, while BFF provides a thin caching layer for recently accessed results.

**Storage Architecture**:

#### Backend Service (External)
- **Primary Storage**: Backend evaluation service stores results in object storage (S3-compatible) or database
- **Retention Policy**: Configurable retention period (default: 90 days)
- **API**: Provides REST endpoints for results retrieval

#### BFF Caching
- **Cache Type**: In-memory LRU cache using `github.com/patrickmn/go-cache`
- **Cache TTL**: 15 minutes for results, 5 minutes for status
- **Cache Size**: Limit to 100 most recent results (configurable)
- **Cache Key**: `evaluation:{id}:results`

```go
// packages/lm-eval/bff/internal/services/cache_service.go
type CacheService struct {
    cache *cache.Cache
}

func (s *CacheService) GetResults(evaluationID string) (*models.Result, bool) {
    key := fmt.Sprintf("evaluation:%s:results", evaluationID)
    if val, found := s.cache.Get(key); found {
        return val.(*models.Result), true
    }
    return nil, false
}

func (s *CacheService) SetResults(evaluationID string, result *models.Result) {
    key := fmt.Sprintf("evaluation:%s:results", evaluationID)
    s.cache.Set(key, result, 15*time.Minute)
}
```

#### Frontend Handling
- **Initial Load**: Fetch from BFF (which fetches from backend if not cached)
- **Display**: Stream large results progressively (show summary first, then detailed metrics)
- **Export**: Generate CSV/JSON export client-side to avoid backend load

**Result Size Limits**:
- BFF cache: Max 10MB per result (reject larger results from cache)
- Frontend display: Paginate results if >1000 data points
- Export: No size limit (client-side generation)

**Reference Implementation**:
- Gen-AI BFF uses `github.com/patrickmn/go-cache v2.1.0` for caching
- Similar pattern for caching model information

**Alternatives Considered**:
- BFF persistent storage: Rejected to avoid data duplication and sync issues
- Frontend direct access to object storage: Rejected due to security concerns (requires pre-signed URLs, additional complexity)
- No caching: Rejected due to performance concerns (backend service may be slow, results are immutable)

---

## Technology Stack Summary

### Frontend
- **Language**: TypeScript 5.x
- **Framework**: React 18.x
- **UI Library**: PatternFly 5.x
- **Build**: Webpack 5 with Module Federation
- **Testing**: Jest (unit), Cypress (E2E), React Testing Library
- **Linting**: ESLint with `--max-warnings 0`
- **Type Checking**: TypeScript strict mode

### Backend (BFF)
- **Language**: Go 1.24+
- **HTTP Router**: `julienschmidt/httprouter`
- **CORS**: `rs/cors`
- **Caching**: `patrickmn/go-cache`
- **Testing**: Ginkgo/Gomega
- **Linting**: golangci-lint
- **KServe Integration**: `github.com/kserve/kserve`

### Shared
- **Module Federation**: Webpack Module Federation Plugin
- **Plugin System**: `@openshift/dynamic-plugin-sdk`, `@odh-dashboard/plugin-core`
- **Deployment**: Kubernetes/OpenShift, Docker multi-stage builds

---

## Implementation Phases

Based on research findings, the recommended implementation phases are:

### Phase 1: Foundation (Weeks 1-2)
- Package structure setup (bff/, frontend/, configs)
- Module Federation configuration
- Extension point registration
- Basic routing and navigation

### Phase 2: Core Features (Weeks 3-5)
- Evaluation CRUD operations (create, list, view)
- Model selector component (KServe integration)
- Task selector component (static catalog)
- Status polling and progress tracking

### Phase 3: Results & Analysis (Weeks 6-7)
- Results visualization (charts, tables)
- Comparison view (side-by-side, diff highlighting)
- Export functionality (CSV, JSON)

### Phase 4: Templates & Polish (Week 8)
- Template management (save, edit, reuse configurations)
- UX refinements (loading states, error handling)
- Documentation and testing

---

## Open Questions (None Remaining)

All technical unknowns from the plan have been resolved through research:

✅ Backend Evaluation Service Integration - HTTP REST with polling
✅ Model Registry Integration - KServe via ODH internal APIs
✅ Evaluation Task Catalog - Static configuration with future API support
✅ ODH Dashboard Extension Points - Following gen-ai/maas patterns
✅ Module Federation Configuration - Established configuration documented
✅ State Management Patterns - React Context + custom hooks with polling
✅ Results Storage and Retrieval - Backend owns data, BFF caches
