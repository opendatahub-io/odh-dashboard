# RHAISTRAT-1134: Eval Hub UI - Epics and Tasks Breakdown

**Feature**: Eval Hub UI - Model Evaluation Orchestration
**Branch**: `001-eval-hub-ui`
**Date**: 2026-02-12
**JIRA**: RHAISTRAT-1134

## Executive Summary

This document provides a comprehensive breakdown of RHAISTRAT-1134 into epics and implementable tasks. The Eval Hub UI is a new lm-eval package for the ODH Dashboard that enables data scientists and ML engineers to orchestrate model evaluations through a web interface.

### Quick Links to Specification Documents

- ✅ [spec.md](./spec.md) - Feature specification with 4 prioritized user stories (P1-P4)
- ✅ [plan.md](./plan.md) - Implementation plan with technical stack and architecture
- ✅ [research.md](./research.md) - Research findings on ODH Dashboard integration patterns
- ✅ [data-model.md](./data-model.md) - 5 core entities (Evaluation, Result, Template, Task, Model)
- ✅ [contracts/api-spec.yaml](./contracts/api-spec.yaml) - OpenAPI 3.0 spec with 20+ endpoints
- ✅ [contracts/types.ts](./contracts/types.ts) - Shared TypeScript types
- ✅ [quickstart.md](./quickstart.md) - Developer setup guide
- ✅ [tasks.md](./tasks.md) - 140 dependency-ordered implementation tasks
- ✅ [checklists/requirements.md](./checklists/requirements.md) - Specification quality validation

### Architecture Overview

**Tech Stack**:
- **Frontend**: React 18 + TypeScript 5 + PatternFly 5 + Webpack Module Federation
- **Backend**: Go 1.24+ with httprouter, go-cache, Ginkgo/Gomega
- **Integration**: KServe for model registry, ODH Dashboard extension points
- **Deployment**: Kubernetes/OpenShift with Docker multi-stage builds

**Package Structure**: `packages/lm-eval/` with `bff/` and `frontend/` following gen-ai/maas patterns

---

## Epic Breakdown

### Epic 1: Infrastructure & Foundation Setup 🏗️
**Priority**: P0 (Blocking)
**Story Points**: 13
**Dependencies**: None
**Status**: Not Started

**Description**: Set up the core infrastructure for the lm-eval package including project structure, build configuration, Module Federation setup, and foundational BFF/frontend architecture.

**Acceptance Criteria**:
- Package directory structure created following gen-ai/maas patterns
- Build pipeline configured (Makefile, Docker, webpack)
- Module Federation integrated with ODH Dashboard
- BFF HTTP server running with middleware (auth, CORS, logging)
- Frontend dev server running with hot reload
- Health check endpoints responding

**Tasks** (from tasks.md):
- T001-T010: Setup phase (10 tasks)
- T011-T037: Foundational phase (27 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 1 - Infrastructure & Foundation Setup"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-1**: Create package structure
   - Create `packages/lm-eval/` with bff/, frontend/, docs/, contract-tests/
   - Create package.json with module-federation config
   - Story Points: 2

2. **RHAISTRAT-1134-2**: Configure build and deployment
   - Create Dockerfiles (multi-stage and workspace)
   - Create Makefile with build, test, deploy targets
   - Create environment config templates
   - Story Points: 3

3. **RHAISTRAT-1134-3**: Setup BFF foundation
   - Initialize Go module with dependencies
   - Create HTTP server with router
   - Implement middleware (CORS, auth, logging)
   - Create cache service and backend client interface
   - Story Points: 5

4. **RHAISTRAT-1134-4**: Setup frontend foundation
   - Initialize React/TypeScript project
   - Configure webpack (common, dev, prod)
   - Setup Module Federation
   - Create bootstrap and plugin store context
   - Configure testing frameworks (Jest, Cypress)
   - Story Points: 5

5. **RHAISTRAT-1134-5**: Create shared types and API client
   - Copy types from contracts to frontend
   - Create base API client with axios/fetch
   - Create extension points and routes structure
   - Story Points: 2

---

### Epic 2: User Story 1 - Configure and Launch Evaluations (MVP) 🎯
**Priority**: P1 (Critical - MVP)
**Story Points**: 21
**Dependencies**: Epic 1
**Status**: Not Started

**Description**: Enable users to configure evaluation parameters, select models and tasks, and launch evaluation jobs against deployed models.

**User Story**: As a data scientist, I want to configure and launch model evaluations so that I can assess model performance using standardized benchmarks.

**Acceptance Criteria**:
- User can navigate to Eval Hub from ODH Dashboard
- User can click "New Evaluation" and see configuration wizard
- User can select a model from KServe registry
- User can select evaluation tasks from catalog
- User can configure task-specific parameters
- User can submit configuration and receive evaluation job ID
- User can view list of evaluations with status (pending/running/completed/failed)
- Evaluation is successfully submitted to backend service

**Tasks** (from tasks.md): T038-T072 (35 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 2 - Configure and Launch Evaluations (MVP)"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-6**: Implement BFF models and services for US1
   - Create Evaluation, Task, Model model structs
   - Implement evaluation service (Create, List, Get)
   - Implement task catalog loader (static JSON)
   - Implement KServe model client
   - Story Points: 5

2. **RHAISTRAT-1134-7**: Implement BFF API handlers for US1
   - POST /api/evaluations (create)
   - GET /api/evaluations (list)
   - GET /api/evaluations/{id} (get)
   - GET /api/tasks (list tasks)
   - GET /api/tasks/{id} (get task)
   - GET /api/models (list models)
   - GET /api/models/{id} (get model)
   - Register routes in router
   - Story Points: 5

3. **RHAISTRAT-1134-8**: Create task catalog configuration
   - Define task catalog JSON with MMLU, HellaSwag, TruthfulQA
   - Include parameter schemas and metadata
   - Story Points: 2

4. **RHAISTRAT-1134-9**: Implement frontend types and API clients for US1
   - Create Evaluation, Task, Model types
   - Create API clients (evaluations, tasks, models)
   - Create custom hooks (useEvaluations, useTasks, useModels)
   - Story Points: 3

5. **RHAISTRAT-1134-10**: Create Dashboard and navigation
   - Create Dashboard page with "New Evaluation" button
   - Create route configuration
   - Create EvalHubWrapper component
   - Update extension registrations for navigation
   - Story Points: 2

6. **RHAISTRAT-1134-11**: Build evaluation creation wizard
   - Create CreateEvaluation page with wizard flow
   - Create ModelSelector component
   - Create TaskSelector component (with category grouping)
   - Create ConfigForm component for task parameters
   - Story Points: 5

7. **RHAISTRAT-1134-12**: Build evaluations list view
   - Create EvaluationsList page with table
   - Create EvaluationCard component
   - Create StatusBadge component
   - Implement pagination and filtering
   - Story Points: 3

---

### Epic 3: User Story 2 - Monitor Running Evaluations 📊
**Priority**: P2 (High)
**Story Points**: 8
**Dependencies**: Epic 2
**Status**: Not Started

**Description**: Enable users to track evaluation progress with real-time status updates and view detailed execution information including errors.

**User Story**: As a data scientist, I want to monitor running evaluations so that I can track progress and identify issues during execution.

**Acceptance Criteria**:
- User can view evaluation details page showing current status
- Status updates automatically via polling (every 5 seconds)
- Progress indicators displayed for running evaluations
- Start time and elapsed time visible
- Failed evaluations show error messages and failure reasons
- User can cancel pending/running evaluations
- Evaluations list auto-refreshes for running jobs

**Tasks** (from tasks.md): T073-T085 (13 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 3 - Monitor Running Evaluations"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-13**: Implement BFF polling and status management
   - Create polling service for backend status updates
   - Add status caching to evaluation service
   - Implement DELETE /api/evaluations/{id} (cancel)
   - Add error handling and logging
   - Story Points: 3

2. **RHAISTRAT-1134-14**: Create polling infrastructure in frontend
   - Create usePolling hook for auto-refresh
   - Add cancel evaluation function to API client
   - Story Points: 2

3. **RHAISTRAT-1134-15**: Build evaluation details page
   - Create EvaluationDetails page with polling
   - Create ProgressIndicator component
   - Create ErrorDisplay component
   - Update routes for details page
   - Story Points: 3

4. **RHAISTRAT-1134-16**: Enhance evaluations list with monitoring
   - Add auto-refresh for running evaluations
   - Add status filtering
   - Add real-time status updates
   - Story Points: 2

---

### Epic 4: User Story 3 - View and Compare Results 📈
**Priority**: P3 (Medium)
**Story Points**: 13
**Dependencies**: Epic 2
**Status**: Not Started

**Description**: Enable users to view detailed evaluation results, compare multiple evaluations side-by-side, and export data for analysis.

**User Story**: As a data scientist, I want to view and compare evaluation results so that I can make informed decisions about model selection and deployment.

**Acceptance Criteria**:
- User can view completed evaluation results with all metrics
- Results organized by task with detailed metrics display
- User can select multiple evaluations for comparison
- Comparison view shows side-by-side metrics with diff highlighting
- User can export results in JSON format
- User can export results in CSV format
- Charts visualize metrics for easy comprehension

**Tasks** (from tasks.md): T086-T104 (19 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 4 - View and Compare Results"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-17**: Implement BFF results models and services
   - Create EvaluationResult and TaskResult model structs
   - Implement GetResults method in evaluation service
   - Add result caching (15min TTL)
   - Story Points: 3

2. **RHAISTRAT-1134-18**: Implement BFF results and export handlers
   - GET /api/evaluations/{id}/results
   - GET /api/evaluations/{id}/export (JSON/CSV support)
   - Register routes
   - Story Points: 3

3. **RHAISTRAT-1134-19**: Create frontend results types and API
   - Create Result types
   - Create results API client functions
   - Create useResults hook
   - Story Points: 2

4. **RHAISTRAT-1134-20**: Build results visualization page
   - Create Results page with metrics visualization
   - Create ResultsChart component (PatternFly charts)
   - Create MetricsTable component
   - Update routes
   - Story Points: 3

5. **RHAISTRAT-1134-21**: Build comparison feature
   - Create Comparison page
   - Create ComparisonTable component with diff highlighting
   - Add multi-select to EvaluationsList
   - Update navigation
   - Story Points: 3

6. **RHAISTRAT-1134-22**: Implement export functionality
   - Create ExportButton component
   - Implement client-side JSON export
   - Implement client-side CSV export
   - Story Points: 2

---

### Epic 5: User Story 4 - Manage Evaluation Templates 📋
**Priority**: P4 (Low)
**Story Points**: 13
**Dependencies**: Epic 2
**Status**: Not Started

**Description**: Enable users to save evaluation configurations as reusable templates to standardize evaluations and reduce configuration time.

**User Story**: As a data scientist, I want to save evaluation configurations as templates so that I can quickly recreate common evaluation scenarios.

**Acceptance Criteria**:
- User can save current evaluation configuration as template
- User provides template name and description
- User can view list of their templates
- User can select template when creating new evaluation
- Template pre-populates configuration form
- User can edit existing templates
- User can delete templates
- Template usage count tracked and displayed

**Tasks** (from tasks.md): T105-T123 (19 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 5 - Manage Evaluation Templates"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-23**: Implement BFF template models and services
   - Create Template model struct
   - Implement template service with CRUD operations
   - Add template usage tracking to evaluation service
   - Story Points: 3

2. **RHAISTRAT-1134-24**: Implement BFF template handlers
   - POST /api/templates (create)
   - GET /api/templates (list)
   - GET /api/templates/{id} (get)
   - PUT /api/templates/{id} (update)
   - DELETE /api/templates/{id} (delete)
   - Register routes
   - Story Points: 3

3. **RHAISTRAT-1134-25**: Create frontend template types and API
   - Create Template types
   - Create templates API client (CRUD)
   - Create useTemplates hook
   - Story Points: 2

4. **RHAISTRAT-1134-26**: Build templates management page
   - Create Templates page with list view
   - Create TemplateCard component
   - Create TemplateEditor component (create/edit)
   - Update routes and navigation
   - Story Points: 3

5. **RHAISTRAT-1134-27**: Integrate templates with evaluation creation
   - Add "Save as Template" button to CreateEvaluation
   - Add template selector to CreateEvaluation
   - Implement template loading logic
   - Story Points: 3

---

### Epic 6: Polish, Documentation & Deployment 🚀
**Priority**: P5 (Nice to Have)
**Story Points**: 8
**Dependencies**: Epic 2 (Minimum - MVP)
**Status**: Not Started

**Description**: Final polish, comprehensive documentation, production readiness, and deployment artifacts.

**Acceptance Criteria**:
- All UI components responsive (mobile/tablet)
- All components accessible (WCAG 2.1 AA)
- Comprehensive error handling across all endpoints
- Input validation on all API endpoints
- Loading states and empty states for all views
- Architecture, API, and deployment documentation complete
- Kubernetes manifests ready for deployment
- Contract tests passing
- Quickstart guide validated end-to-end
- Bundle size optimized (<500KB gzipped)

**Tasks** (from tasks.md): T124-T140 (17 tasks)

**JIRA Epic**: Create as "RHAISTRAT-1134: Epic 6 - Polish, Documentation & Deployment"

**Sub-Tasks for JIRA**:

1. **RHAISTRAT-1134-28**: Create comprehensive documentation
   - Architecture documentation
   - API documentation
   - Deployment guide
   - Validate quickstart guide
   - Story Points: 3

2. **RHAISTRAT-1134-29**: Enhance error handling and validation
   - Add comprehensive error handling to all BFF handlers
   - Add input validation to all BFF handlers
   - Add loading states to all frontend pages
   - Add empty states to all list views
   - Story Points: 3

3. **RHAISTRAT-1134-30**: Optimize and polish frontend
   - Optimize bundle size in webpack config
   - Implement responsive design for all components
   - Add accessibility attributes
   - Add i18n preparation
   - Story Points: 3

4. **RHAISTRAT-1134-31**: Prepare deployment artifacts
   - Create Kubernetes manifests
   - Update root package.json workspaces
   - Configure contract tests
   - Final code cleanup
   - Story Points: 2

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-3) - Minimum Viable Product

**Goal**: Deliver core evaluation orchestration capability

**Epics**:
- Epic 1: Infrastructure & Foundation Setup (Week 1)
- Epic 2: User Story 1 - Configure and Launch (Weeks 2-3)

**Deliverable**: Users can configure evaluations, launch them, and see basic status

**Story Points**: 34 points

**Team Size**: 2-3 developers

**Timeline**: 3 weeks

### Phase 2: Enhanced Monitoring (Week 4)

**Goal**: Add real-time monitoring and progress tracking

**Epics**:
- Epic 3: User Story 2 - Monitor Running Evaluations

**Deliverable**: Users can track evaluation progress in real-time

**Story Points**: 8 points

**Timeline**: 1 week

### Phase 3: Results & Analysis (Weeks 5-6)

**Goal**: Enable results viewing and comparison

**Epics**:
- Epic 4: User Story 3 - View and Compare Results

**Deliverable**: Users can view detailed results and compare evaluations

**Story Points**: 13 points

**Timeline**: 2 weeks

### Phase 4: Templates & Productivity (Week 7)

**Goal**: Add template management for power users

**Epics**:
- Epic 5: User Story 4 - Manage Templates

**Deliverable**: Users can save and reuse evaluation configurations

**Story Points**: 13 points

**Timeline**: 1 week

### Phase 5: Production Ready (Week 8)

**Goal**: Polish and production readiness

**Epics**:
- Epic 6: Polish, Documentation & Deployment

**Deliverable**: Production-ready package with full documentation

**Story Points**: 8 points

**Timeline**: 1 week

---

## Total Effort Estimate

**Total Story Points**: 76 points

**Total Tasks**: 140 tasks

**Estimated Timeline**:
- **Sequential**: 8 weeks (1 team)
- **Parallel**: 5-6 weeks (2-3 teams working on independent epics after foundation)

**Team Composition Recommendation**:
- 1 Backend Developer (Go/BFF)
- 1 Frontend Developer (React/TypeScript)
- 1 Full-Stack Developer (can work on either)
- 0.5 DevOps Engineer (deployment/infrastructure)

---

## Epic Dependencies Diagram

```
Epic 1: Infrastructure & Foundation Setup (P0)
    │
    ├──> Epic 2: User Story 1 - Configure & Launch (P1 - MVP) ─┐
    │                                                           │
    ├──> Epic 3: User Story 2 - Monitor Running (P2) ──────────┤
    │                                                           │
    ├──> Epic 4: User Story 3 - View & Compare Results (P3) ───┤
    │                                                           │
    ├──> Epic 5: User Story 4 - Manage Templates (P4) ─────────┤
    │                                                           │
    └──> Epic 6: Polish & Deployment (P5) <────────────────────┘
         (Depends on minimum Epic 2, ideally all epics)
```

**Key Insight**: After Epic 1 completes, Epics 2-5 can be worked on in parallel by different teams as they have minimal interdependencies.

---

## Risk Assessment

### High Risk Items

1. **KServe Integration** (Epic 2)
   - Risk: KServe API changes or availability issues
   - Mitigation: Mock KServe client for development, comprehensive error handling

2. **Backend Evaluation Service** (Epics 2-3)
   - Risk: Backend service not available or unstable
   - Mitigation: Mock backend client, define clear API contract

3. **Module Federation Integration** (Epic 1)
   - Risk: ODH Dashboard compatibility issues
   - Mitigation: Follow gen-ai/maas patterns exactly, early integration testing

### Medium Risk Items

1. **Long-Running Evaluations** (Epic 3)
   - Risk: Polling overhead, connection stability
   - Mitigation: Configurable polling intervals, connection retry logic

2. **Results Size** (Epic 4)
   - Risk: Large result sets impacting performance
   - Mitigation: Pagination, result caching, progressive loading

### Low Risk Items

1. **Template Management** (Epic 5)
   - Risk: Minimal - straightforward CRUD operations
   - Mitigation: Standard validation and error handling

---

## Success Metrics

### MVP Success Criteria (After Epic 2)

- [ ] Users can create evaluations in <3 minutes
- [ ] 90% of users successfully complete first evaluation without support
- [ ] Evaluation submission success rate >95%
- [ ] UI loads in <2 seconds

### Full Feature Success Criteria (All Epics)

- [ ] Support 100+ concurrent users
- [ ] API response time <200ms p95
- [ ] Frontend bundle <500KB gzipped
- [ ] Zero critical security vulnerabilities
- [ ] Test coverage >80% (frontend and backend)
- [ ] All accessibility requirements met (WCAG 2.1 AA)

---

## JIRA Epic Creation Checklist

When creating epics in JIRA, include:

- [ ] Epic link to parent issue RHAISTRAT-1134
- [ ] All sub-tasks created with story point estimates
- [ ] Dependencies documented in epic description
- [ ] Acceptance criteria clearly defined
- [ ] Link to specification documents in this repo
- [ ] Priority and labels set correctly
- [ ] Assigned to appropriate sprint/release

---

## Next Steps

1. **Review this breakdown** with product and engineering teams
2. **Create JIRA epics** using the structure above
3. **Prioritize MVP scope** (Epics 1-2 minimum)
4. **Assign teams** to epics based on dependencies
5. **Begin Epic 1** (Infrastructure & Foundation Setup)
6. **Set up CI/CD pipeline** for automated testing
7. **Schedule regular demos** after each epic completion

---

## References

- **Feature Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Technical Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/api-spec.yaml](./contracts/api-spec.yaml)
- **Task Breakdown**: [tasks.md](./tasks.md)
- **Development Guide**: [quickstart.md](./quickstart.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Maintained By**: Claude Code
