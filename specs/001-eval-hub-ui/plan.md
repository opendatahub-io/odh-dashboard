# Implementation Plan: Eval Hub UI - Model Evaluation Orchestration

**Branch**: `001-eval-hub-ui` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-eval-hub-ui/spec.md`

## Summary

Create a new lm-eval package following the ODH Dashboard modular architecture pattern (similar to gen-ai and maas packages). The package consists of a React frontend with TypeScript and PatternFly components, and a Go Backend for Frontend (BFF) service. The system provides a web-based UI for configuring, launching, monitoring, and analyzing model evaluations using standardized benchmarks and metrics.

**Primary Requirement**: Enable data scientists and ML engineers to orchestrate model evaluations through an intuitive web interface, supporting configuration, execution tracking, results visualization, and comparison across multiple evaluation runs.

**Technical Approach**: Module federation-based micro-frontend architecture integrated into ODH Dashboard, with Go BFF handling API orchestration, state management, and serving static assets. The system will integrate with existing ODH infrastructure for authentication and model registry access.

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.x, Node.js 20+
- Backend: Go 1.24+

**Primary Dependencies**:
- Frontend: React 18, PatternFly 5, Webpack 5 with Module Federation, Jest, Cypress
- Backend: httprouter (HTTP routing), cors, go-cache (caching), ginkgo/gomega (testing)
- Integration: openai-go (if needed for model APIs), kserve (for KServe model integration)

**Storage**:
- Backend state: In-memory caching with go-cache for session/temporary data
- Persistent data: Backend evaluation service (external dependency, accessed via API)
- Frontend state: React Context API + hooks for local UI state

**Testing**:
- Frontend: Jest (unit tests), Cypress (E2E tests), React Testing Library
- Backend: Ginkgo/Gomega (unit and integration tests)
- Contract Tests: BFF consumer contract tests using odh-ct-bff-consumer

**Target Platform**: Kubernetes/OpenShift (containerized deployment), Linux amd64/arm64

**Project Type**: Web application (federated micro-frontend + BFF)

**Performance Goals**:
- Frontend bundle: <500KB gzipped
- API response time: <200ms p95 for list/status endpoints
- UI responsiveness: <100ms for user interactions
- Support 100+ concurrent users per instance

**Constraints**:
- Must integrate with Module Federation for dynamic loading into ODH Dashboard
- Must follow ODH Dashboard extension point patterns
- Must support Kubernetes RBAC for authorization
- Must be deployable as a standalone service or integrated into ODH Dashboard
- API calls to backend evaluation service may have high latency (minutes to hours for job completion)

**Scale/Scope**:
- Expected users: 10-100 data scientists per deployment
- Evaluations: 100s of evaluations per user, 1000s total
- Evaluation history: Retain last 90 days of results
- UI screens: ~8-10 main views (dashboard, create, list, details, results, comparison, templates, settings)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No project-specific constitution file exists yet. The following checks are based on ODH Dashboard best practices observed in gen-ai and maas packages:

### Architecture Compliance
- ✅ **Module Federation**: Package uses Module Federation for integration (matches gen-ai/maas pattern)
- ✅ **Separation of Concerns**: Frontend and BFF are clearly separated
- ✅ **Testing Strategy**: Unit, integration, and E2E tests planned at appropriate layers
- ✅ **Documentation**: Specs, plan, contracts, and quickstart will be provided

### Code Quality Gates
- ✅ **Type Safety**: TypeScript with strict mode for frontend, Go with type safety for backend
- ✅ **Linting**: ESLint for frontend (max-warnings 0), golangci-lint for backend
- ✅ **Test Coverage**: Jest coverage for frontend, Ginkgo for backend
- ✅ **Contract Tests**: BFF consumer contract tests planned

### Integration Requirements
- ✅ **Authentication**: Leverages ODH Dashboard authentication (OAuth/RBAC)
- ✅ **Extension Points**: Will register with ODH Dashboard extension point system
- ✅ **Shared Components**: Uses @odh-dashboard/plugin-core and @odh-dashboard/internal packages

**Status**: ✅ PASSED - No constitution violations. Architecture follows established ODH Dashboard patterns.

## Project Structure

### Documentation (this feature)

```text
specs/001-eval-hub-ui/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (IN PROGRESS)
├── research.md          # Phase 0 output (PENDING)
├── data-model.md        # Phase 1 output (PENDING)
├── quickstart.md        # Phase 1 output (PENDING)
├── contracts/           # Phase 1 output (PENDING)
│   ├── api-spec.yaml    # OpenAPI spec for BFF APIs
│   └── types.ts         # Shared TypeScript type definitions
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist (COMPLETE)
└── tasks.md             # Phase 2 output (run /speckit.tasks)
```

### Source Code (repository root)

```text
packages/lm-eval/                      # New package directory
├── package.json                        # Package metadata with module-federation config
├── Dockerfile                          # Multi-stage build (BFF + frontend)
├── Dockerfile.workspace               # Development workspace
├── Makefile                            # Build, test, deploy targets
├── .env.local.example                 # Environment variable template
├── .eslintrc.js                        # ESLint configuration
├── tsconfig.json                       # TypeScript configuration
├── CONTRIBUTING.md                     # Contribution guide
├── README.md                           # Package documentation
│
├── bff/                                # Backend for Frontend (Go)
│   ├── cmd/
│   │   └── main.go                     # Application entry point
│   ├── internal/
│   │   ├── api/                        # HTTP API handlers
│   │   │   ├── handlers/               # Request handlers
│   │   │   │   ├── evaluations.go      # Evaluation CRUD operations
│   │   │   │   ├── templates.go        # Template management
│   │   │   │   ├── tasks.go            # Evaluation task catalog
│   │   │   │   └── health.go           # Health check endpoints
│   │   │   ├── middleware/             # HTTP middleware
│   │   │   │   ├── auth.go             # Authentication middleware
│   │   │   │   ├── cors.go             # CORS configuration
│   │   │   │   └── logging.go          # Request logging
│   │   │   └── router.go               # Route registration
│   │   ├── models/                     # Domain models
│   │   │   ├── evaluation.go           # Evaluation entity
│   │   │   ├── template.go             # Template entity
│   │   │   ├── task.go                 # Evaluation task entity
│   │   │   └── result.go               # Result entity
│   │   ├── services/                   # Business logic
│   │   │   ├── evaluation_service.go   # Evaluation orchestration
│   │   │   ├── template_service.go     # Template management
│   │   │   ├── backend_client.go       # External evaluation backend client
│   │   │   └── cache_service.go        # Caching layer
│   │   ├── config/                     # Configuration management
│   │   │   └── config.go               # Config loading and validation
│   │   └── static/                     # Embedded static files (frontend build)
│   ├── go.mod                          # Go module definition
│   ├── go.sum                          # Dependency checksums
│   ├── Makefile                        # BFF build targets
│   └── tests/                          # BFF tests
│       ├── unit/                       # Unit tests (Ginkgo)
│       ├── integration/                # Integration tests
│       └── contract/                   # Contract tests
│
├── frontend/                           # React frontend application
│   ├── src/
│   │   ├── odh/                        # ODH Dashboard integration
│   │   │   ├── extension-points/       # Extension point exports
│   │   │   │   └── index.ts            # Module federation exports
│   │   │   ├── routes/                 # Route definitions
│   │   │   └── AppLayout.tsx           # Main layout component
│   │   ├── pages/                      # Page components
│   │   │   ├── Dashboard/              # Landing/dashboard page
│   │   │   ├── CreateEvaluation/       # Evaluation creation flow
│   │   │   ├── EvaluationsList/        # List all evaluations
│   │   │   ├── EvaluationDetails/      # Single evaluation detail view
│   │   │   ├── Results/                # Results visualization
│   │   │   ├── Comparison/             # Multi-evaluation comparison
│   │   │   └── Templates/              # Template management
│   │   ├── components/                 # Reusable components
│   │   │   ├── EvaluationCard/         # Evaluation card display
│   │   │   ├── TaskSelector/           # Task selection component
│   │   │   ├── ModelSelector/          # Model selection component
│   │   │   ├── StatusBadge/            # Status indicator
│   │   │   ├── ResultsChart/           # Results visualization
│   │   │   ├── ComparisonTable/        # Side-by-side comparison
│   │   │   └── ConfigForm/             # Configuration form components
│   │   ├── services/                   # Frontend services
│   │   │   ├── api/                    # API client
│   │   │   │   ├── evaluations.ts      # Evaluation API calls
│   │   │   │   ├── templates.ts        # Template API calls
│   │   │   │   ├── tasks.ts            # Task catalog API calls
│   │   │   │   └── client.ts           # Base HTTP client
│   │   │   └── hooks/                  # React hooks
│   │   │       ├── useEvaluations.ts   # Evaluation data hooks
│   │   │       ├── useTemplates.ts     # Template hooks
│   │   │       ├── useTasks.ts         # Task catalog hooks
│   │   │       └── usePolling.ts       # Status polling hook
│   │   ├── types/                      # TypeScript types
│   │   │   ├── evaluation.ts           # Evaluation types
│   │   │   ├── template.ts             # Template types
│   │   │   ├── task.ts                 # Task types
│   │   │   └── api.ts                  # API response types
│   │   ├── utils/                      # Utility functions
│   │   │   ├── formatting.ts           # Data formatting
│   │   │   ├── validation.ts           # Form validation
│   │   │   └── constants.ts            # Constants
│   │   ├── __tests__/                  # Tests
│   │   │   ├── unit/                   # Jest unit tests
│   │   │   └── cypress/                # Cypress E2E tests
│   │   │       ├── e2e/                # E2E test specs
│   │   │       ├── support/            # Cypress support files
│   │   │       └── fixtures/           # Test fixtures
│   │   └── App.tsx                     # Root component
│   ├── public/                         # Static assets
│   ├── config/                         # Webpack configuration
│   │   ├── webpack.common.js           # Common webpack config
│   │   ├── webpack.dev.js              # Development config
│   │   └── webpack.prod.js             # Production config
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   └── jest.config.ts                  # Jest configuration
│
├── contract-tests/                     # BFF contract tests
│   └── consumer/                       # Consumer-driven contracts
│
└── docs/                               # Additional documentation
    ├── architecture.md                 # Architecture overview
    ├── api.md                          # API documentation
    └── deployment.md                   # Deployment guide
```

**Structure Decision**: Selected "Web application" structure (Option 2 from template) because this is a federated micro-frontend with BFF. The structure mirrors gen-ai and maas packages in ODH Dashboard, ensuring consistency and leveraging established patterns. The BFF serves both API endpoints and static frontend assets, following the same multi-stage Docker build approach used in sibling packages.

## Complexity Tracking

**No constitution violations** - this section is not applicable. The architecture follows established ODH Dashboard patterns without introducing complexity beyond what's already accepted in gen-ai and maas packages.

---

## Phase 0: Research & Outline

**Status**: ✅ COMPLETE

Research tasks will investigate:
1. **Backend Evaluation Service Integration**: How to integrate with the backend evaluation orchestration service (API endpoints, authentication, job submission protocols, status polling mechanisms, webhook support)
2. **Model Registry Integration**: How to fetch available models for evaluation (KServe integration, model registry API, model metadata format)
3. **Evaluation Task Catalog**: How evaluation tasks/benchmarks are defined and discovered (static configuration vs. dynamic API, task parameter schemas, result format specifications)
4. **ODH Dashboard Extension Points**: Specific extension points to implement for navigation, routes, and permissions
5. **Module Federation Configuration**: Exact configuration for integrating with ODH Dashboard's federated architecture
6. **State Management Patterns**: Best practices for managing evaluation state with long-running async operations (polling intervals, WebSocket alternatives, optimistic updates)
7. **Results Storage and Retrieval**: Where and how evaluation results are stored (backend service responsibility vs. BFF caching, result data size limits, retention policies)

**Output File**: [research.md](./research.md) ✅

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

**Prerequisites**: research.md complete

### Artifacts to Generate

1. **Data Model** ([data-model.md](./data-model.md)):
   - Evaluation entity: ID, user, model, tasks, parameters, status, timestamps, error details
   - Template entity: ID, user, name, description, configuration snapshot
   - Task entity: ID, name, description, parameter schema, result schema
   - Result entity: ID, evaluation ID, metrics, scores, task results, aggregations
   - State transitions: pending → running → completed/failed

2. **API Contracts** ([contracts/api-spec.yaml](./contracts/api-spec.yaml)):
   - REST endpoints following OpenAPI 3.0 specification
   - Endpoints derived from functional requirements:
     - POST /api/evaluations (create and launch)
     - GET /api/evaluations (list with filtering)
     - GET /api/evaluations/{id} (details and status)
     - GET /api/evaluations/{id}/results (retrieve results)
     - POST /api/templates (create template)
     - GET /api/templates (list templates)
     - PUT /api/templates/{id} (update template)
     - DELETE /api/templates/{id} (delete template)
     - GET /api/tasks (list available tasks)
     - GET /api/models (list available models)

3. **Shared Types** ([contracts/types.ts](./contracts/types.ts)):
   - TypeScript type definitions matching API contracts
   - Ensures frontend-backend type consistency

4. **Quickstart Guide** ([quickstart.md](./quickstart.md)):
   - Local development setup (prerequisites, environment configuration, running BFF and frontend)
   - Running tests (unit, integration, E2E, contract)
   - Building and deploying (Docker build, Kubernetes deployment)
   - Troubleshooting common issues

5. **Agent Context Update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add new technologies specific to lm-eval package
   - Preserve manual additions

**Output Files**:
- ✅ [data-model.md](./data-model.md)
- ✅ [contracts/api-spec.yaml](./contracts/api-spec.yaml)
- ✅ [contracts/types.ts](./contracts/types.ts)
- ✅ [quickstart.md](./quickstart.md)
- ✅ Updated CLAUDE.md (agent context)

---

## Next Steps

After Phase 1 completion, run:
- `/speckit.tasks` to generate dependency-ordered task breakdown in tasks.md
- `/speckit.implement` to begin implementation with task execution tracking
