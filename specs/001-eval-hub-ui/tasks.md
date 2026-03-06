# Tasks: Eval Hub UI - Model Evaluation Orchestration

**Input**: Design documents from `/specs/001-eval-hub-ui/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are EXCLUDED from this breakdown. The implementation will follow the existing ODH Dashboard testing patterns (Jest, Cypress, Ginkgo) as documented in quickstart.md.

**Organization**: Tasks are grouped by user story (US1-US4) to enable independent implementation and testing of each story in priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is a **Web application** with:
- **BFF**: `packages/lm-eval/bff/`
- **Frontend**: `packages/lm-eval/frontend/`
- **Docs**: `packages/lm-eval/docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and package structure following gen-ai/maas patterns

- [ ] T001 Create package directory structure at packages/lm-eval/ with bff/, frontend/, docs/, contract-tests/
- [ ] T002 Create package.json at packages/lm-eval/package.json with module-federation config (port 9105, name "lmEval")
- [ ] T003 [P] Create Dockerfile at packages/lm-eval/Dockerfile for multi-stage build (frontend + BFF)
- [ ] T004 [P] Create Dockerfile.workspace at packages/lm-eval/Dockerfile.workspace for development
- [ ] T005 [P] Create Makefile at packages/lm-eval/Makefile with build, test, deploy targets
- [ ] T006 [P] Create .env.local.example at packages/lm-eval/.env.local.example with all environment variables
- [ ] T007 [P] Create .eslintrc.js at packages/lm-eval/.eslintrc.js matching ODH Dashboard standards
- [ ] T008 [P] Create tsconfig.json at packages/lm-eval/tsconfig.json
- [ ] T009 [P] Create CONTRIBUTING.md at packages/lm-eval/CONTRIBUTING.md
- [ ] T010 [P] Create README.md at packages/lm-eval/README.md with package overview

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### BFF Foundation

- [ ] T011 Initialize Go module at packages/lm-eval/bff/go.mod with Go 1.24+
- [ ] T012 [P] Create BFF main.go at packages/lm-eval/bff/cmd/main.go with HTTP server setup
- [ ] T013 [P] Create config package at packages/lm-eval/bff/internal/config/config.go for environment configuration
- [ ] T014 [P] Create router setup at packages/lm-eval/bff/internal/api/router.go using httprouter
- [ ] T015 [P] Implement CORS middleware at packages/lm-eval/bff/internal/api/middleware/cors.go
- [ ] T016 [P] Implement auth middleware at packages/lm-eval/bff/internal/api/middleware/auth.go for JWT validation
- [ ] T017 [P] Implement logging middleware at packages/lm-eval/bff/internal/api/middleware/logging.go
- [ ] T018 [P] Create cache service at packages/lm-eval/bff/internal/services/cache_service.go using go-cache
- [ ] T019 [P] Create backend client interface at packages/lm-eval/bff/internal/services/backend_client.go for evaluation service
- [ ] T020 [P] Implement health check handler at packages/lm-eval/bff/internal/api/handlers/health.go
- [ ] T021 [P] Create BFF Makefile at packages/lm-eval/bff/Makefile with run, build, test, lint targets

### Frontend Foundation

- [ ] T022 Initialize frontend package.json at packages/lm-eval/frontend/package.json with React 18, PatternFly 5, TypeScript 5
- [ ] T023 [P] Create webpack common config at packages/lm-eval/frontend/config/webpack.common.js
- [ ] T024 [P] Create webpack dev config at packages/lm-eval/frontend/config/webpack.dev.js with dev server on port 9105
- [ ] T025 [P] Create webpack prod config at packages/lm-eval/frontend/config/webpack.prod.js
- [ ] T026 [P] Create module federation config at packages/lm-eval/frontend/config/moduleFederation.js exposing ./extensions and ./extension-points
- [ ] T027 [P] Create TypeScript config at packages/lm-eval/frontend/tsconfig.json with strict mode
- [ ] T028 [P] Create Jest config at packages/lm-eval/frontend/jest.config.ts
- [ ] T029 [P] Create Cypress config at packages/lm-eval/frontend/src/__tests__/cypress/
- [ ] T030 [P] Create bootstrap entry at packages/lm-eval/frontend/src/bootstrap.tsx with router and plugin store setup
- [ ] T031 [P] Create App root component at packages/lm-eval/frontend/src/App.tsx
- [ ] T032 [P] Create PluginStoreContextProvider at packages/lm-eval/frontend/src/odh/PluginStoreContextProvider.tsx
- [ ] T033 [P] Create extension points index at packages/lm-eval/frontend/src/odh/extension-points/index.ts
- [ ] T034 [P] Create extensions registration at packages/lm-eval/frontend/src/odh/extensions.ts with area, navigation, routes
- [ ] T035 [P] Create base API client at packages/lm-eval/frontend/src/services/api/client.ts with axios/fetch setup
- [ ] T036 [P] Copy shared types from contracts/types.ts to packages/lm-eval/frontend/src/types/
- [ ] T037 [P] Create constants file at packages/lm-eval/frontend/src/utils/constants.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure and Launch Model Evaluation (Priority: P1) 🎯 MVP

**Goal**: Enable users to configure evaluation parameters, select models and tasks, and launch evaluation jobs

**Independent Test**: User can navigate to Eval Hub, click "New Evaluation", select a model, choose tasks, configure parameters, submit, and see the evaluation created with pending/running status in the list

### BFF Implementation for US1

- [ ] T038 [P] [US1] Create Evaluation model struct at packages/lm-eval/bff/internal/models/evaluation.go
- [ ] T039 [P] [US1] Create Task model struct at packages/lm-eval/bff/internal/models/task.go
- [ ] T040 [P] [US1] Create Model model struct at packages/lm-eval/bff/internal/models/model.go
- [ ] T041 [US1] Implement evaluation service at packages/lm-eval/bff/internal/services/evaluation_service.go with Create, List, Get methods
- [ ] T042 [P] [US1] Implement task catalog loader at packages/lm-eval/bff/internal/services/task_catalog.go loading from static JSON config
- [ ] T043 [P] [US1] Implement KServe model client at packages/lm-eval/bff/internal/services/kserve_client.go for fetching models
- [ ] T044 [US1] Implement POST /api/evaluations handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (createEvaluation)
- [ ] T045 [P] [US1] Implement GET /api/evaluations handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (listEvaluations)
- [ ] T046 [P] [US1] Implement GET /api/evaluations/{id} handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (getEvaluation)
- [ ] T047 [P] [US1] Implement GET /api/tasks handler at packages/lm-eval/bff/internal/api/handlers/tasks.go (listTasks)
- [ ] T048 [P] [US1] Implement GET /api/tasks/{id} handler at packages/lm-eval/bff/internal/api/handlers/tasks.go (getTask)
- [ ] T049 [P] [US1] Implement GET /api/models handler at packages/lm-eval/bff/internal/api/handlers/models.go (listModels)
- [ ] T050 [P] [US1] Implement GET /api/models/{id} handler at packages/lm-eval/bff/internal/api/handlers/models.go (getModel)
- [ ] T051 [US1] Create static task catalog JSON at packages/lm-eval/bff/config/tasks.json with MMLU, HellaSwag, TruthfulQA definitions
- [ ] T052 [US1] Register US1 routes in router at packages/lm-eval/bff/internal/api/router.go

### Frontend Implementation for US1

- [ ] T053 [P] [US1] Create Evaluation types at packages/lm-eval/frontend/src/types/evaluation.ts
- [ ] T054 [P] [US1] Create Task types at packages/lm-eval/frontend/src/types/task.ts
- [ ] T055 [P] [US1] Create Model types at packages/lm-eval/frontend/src/types/model.ts
- [ ] T056 [P] [US1] Create evaluations API client at packages/lm-eval/frontend/src/services/api/evaluations.ts with create, list, get functions
- [ ] T057 [P] [US1] Create tasks API client at packages/lm-eval/frontend/src/services/api/tasks.ts with list, get functions
- [ ] T058 [P] [US1] Create models API client at packages/lm-eval/frontend/src/services/api/models.ts with list, get functions
- [ ] T059 [P] [US1] Create useEvaluations hook at packages/lm-eval/frontend/src/services/hooks/useEvaluations.ts
- [ ] T060 [P] [US1] Create useTasks hook at packages/lm-eval/frontend/src/services/hooks/useTasks.ts
- [ ] T061 [P] [US1] Create useModels hook at packages/lm-eval/frontend/src/services/hooks/useModels.ts
- [ ] T062 [US1] Create Dashboard page at packages/lm-eval/frontend/src/pages/Dashboard/Dashboard.tsx with "New Evaluation" button
- [ ] T063 [US1] Create CreateEvaluation page at packages/lm-eval/frontend/src/pages/CreateEvaluation/CreateEvaluation.tsx with wizard flow
- [ ] T064 [P] [US1] Create ModelSelector component at packages/lm-eval/frontend/src/components/ModelSelector/ModelSelector.tsx
- [ ] T065 [P] [US1] Create TaskSelector component at packages/lm-eval/frontend/src/components/TaskSelector/TaskSelector.tsx with category grouping
- [ ] T066 [P] [US1] Create ConfigForm component at packages/lm-eval/frontend/src/components/ConfigForm/ConfigForm.tsx for task parameters
- [ ] T067 [US1] Create EvaluationsList page at packages/lm-eval/frontend/src/pages/EvaluationsList/EvaluationsList.tsx with table view
- [ ] T068 [P] [US1] Create EvaluationCard component at packages/lm-eval/frontend/src/components/EvaluationCard/EvaluationCard.tsx
- [ ] T069 [P] [US1] Create StatusBadge component at packages/lm-eval/frontend/src/components/StatusBadge/StatusBadge.tsx
- [ ] T070 [US1] Create routes configuration at packages/lm-eval/frontend/src/odh/routes/index.ts mapping /eval-hub paths
- [ ] T071 [US1] Create EvalHubWrapper at packages/lm-eval/frontend/src/odh/EvalHubWrapper.tsx as main app wrapper
- [ ] T072 [US1] Update extensions.ts to register navigation items and routes for US1 pages

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can create evaluations, see them in the list, and view basic status.

---

## Phase 4: User Story 2 - Monitor Running Evaluations (Priority: P2)

**Goal**: Enable users to track evaluation progress with real-time status updates and view detailed execution information

**Independent Test**: User can view a running evaluation's details page showing current status, start time, progress indicators, and refresh to see status changes. Failed evaluations display error messages.

### BFF Implementation for US2

- [ ] T073 [P] [US2] Implement polling service at packages/lm-eval/bff/internal/services/polling_service.go for backend status updates
- [ ] T074 [P] [US2] Add status caching logic to evaluation service in packages/lm-eval/bff/internal/services/evaluation_service.go
- [ ] T075 [US2] Implement DELETE /api/evaluations/{id} handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (cancelEvaluation)
- [ ] T076 [US2] Add error handling and logging for US2 operations in packages/lm-eval/bff/internal/api/handlers/evaluations.go
- [ ] T077 [US2] Register US2 routes in router at packages/lm-eval/bff/internal/api/router.go

### Frontend Implementation for US2

- [ ] T078 [P] [US2] Create usePolling hook at packages/lm-eval/frontend/src/services/hooks/usePolling.ts for auto-refresh
- [ ] T079 [US2] Create EvaluationDetails page at packages/lm-eval/frontend/src/pages/EvaluationDetails/EvaluationDetails.tsx with polling
- [ ] T080 [P] [US2] Create ProgressIndicator component at packages/lm-eval/frontend/src/components/ProgressIndicator/ProgressIndicator.tsx
- [ ] T081 [P] [US2] Create ErrorDisplay component at packages/lm-eval/frontend/src/components/ErrorDisplay/ErrorDisplay.tsx
- [ ] T082 [US2] Add cancel evaluation function to evaluations API client at packages/lm-eval/frontend/src/services/api/evaluations.ts
- [ ] T083 [US2] Update EvaluationsList page to auto-refresh running evaluations in packages/lm-eval/frontend/src/pages/EvaluationsList/EvaluationsList.tsx
- [ ] T084 [US2] Update routes to include evaluation details page in packages/lm-eval/frontend/src/odh/routes/index.ts
- [ ] T085 [US2] Add filtering by status to EvaluationsList in packages/lm-eval/frontend/src/pages/EvaluationsList/EvaluationsList.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can create evaluations (US1) and monitor their progress (US2).

---

## Phase 5: User Story 3 - View and Compare Evaluation Results (Priority: P3)

**Goal**: Enable users to view detailed evaluation results, compare multiple evaluations side-by-side, and export data

**Independent Test**: User can view completed evaluation results with all metrics displayed, select multiple evaluations for comparison, see differences highlighted, and export results as JSON or CSV

### BFF Implementation for US3

- [ ] T086 [P] [US3] Create EvaluationResult model struct at packages/lm-eval/bff/internal/models/result.go
- [ ] T087 [P] [US3] Create TaskResult model struct at packages/lm-eval/bff/internal/models/result.go
- [ ] T088 [US3] Implement results fetching in evaluation service at packages/lm-eval/bff/internal/services/evaluation_service.go (GetResults method)
- [ ] T089 [US3] Implement GET /api/evaluations/{id}/results handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (getEvaluationResults)
- [ ] T090 [US3] Implement GET /api/evaluations/{id}/export handler at packages/lm-eval/bff/internal/api/handlers/evaluations.go (exportResults) with JSON/CSV support
- [ ] T091 [P] [US3] Add result caching to cache service at packages/lm-eval/bff/internal/services/cache_service.go with 15min TTL
- [ ] T092 [US3] Register US3 routes in router at packages/lm-eval/bff/internal/api/router.go

### Frontend Implementation for US3

- [ ] T093 [P] [US3] Create Result types at packages/lm-eval/frontend/src/types/result.ts
- [ ] T094 [P] [US3] Create results API client functions at packages/lm-eval/frontend/src/services/api/evaluations.ts (getResults, exportResults)
- [ ] T095 [P] [US3] Create useResults hook at packages/lm-eval/frontend/src/services/hooks/useResults.ts
- [ ] T096 [US3] Create Results page at packages/lm-eval/frontend/src/pages/Results/Results.tsx with metrics visualization
- [ ] T097 [P] [US3] Create ResultsChart component at packages/lm-eval/frontend/src/components/ResultsChart/ResultsChart.tsx using PatternFly charts
- [ ] T098 [P] [US3] Create MetricsTable component at packages/lm-eval/frontend/src/components/MetricsTable/MetricsTable.tsx
- [ ] T099 [US3] Create Comparison page at packages/lm-eval/frontend/src/pages/Comparison/Comparison.tsx
- [ ] T100 [P] [US3] Create ComparisonTable component at packages/lm-eval/frontend/src/components/ComparisonTable/ComparisonTable.tsx with diff highlighting
- [ ] T101 [P] [US3] Create ExportButton component at packages/lm-eval/frontend/src/components/ExportButton/ExportButton.tsx
- [ ] T102 [US3] Add multi-select functionality to EvaluationsList for comparison at packages/lm-eval/frontend/src/pages/EvaluationsList/EvaluationsList.tsx
- [ ] T103 [US3] Update routes to include results and comparison pages in packages/lm-eval/frontend/src/odh/routes/index.ts
- [ ] T104 [US3] Update EvaluationDetails to link to results page at packages/lm-eval/frontend/src/pages/EvaluationDetails/EvaluationDetails.tsx

**Checkpoint**: All user stories 1, 2, and 3 should now be independently functional. Users can create (US1), monitor (US2), and analyze results (US3).

---

## Phase 6: User Story 4 - Manage Evaluation Templates (Priority: P4)

**Goal**: Enable users to save evaluation configurations as reusable templates and launch evaluations from templates

**Independent Test**: User can save an evaluation configuration as a template, view their templates list, edit/delete templates, and create new evaluations from templates with pre-populated configuration

### BFF Implementation for US4

- [ ] T105 [P] [US4] Create Template model struct at packages/lm-eval/bff/internal/models/template.go
- [ ] T106 [US4] Implement template service at packages/lm-eval/bff/internal/services/template_service.go with CRUD operations
- [ ] T107 [P] [US4] Implement POST /api/templates handler at packages/lm-eval/bff/internal/api/handlers/templates.go (createTemplate)
- [ ] T108 [P] [US4] Implement GET /api/templates handler at packages/lm-eval/bff/internal/api/handlers/templates.go (listTemplates)
- [ ] T109 [P] [US4] Implement GET /api/templates/{id} handler at packages/lm-eval/bff/internal/api/handlers/templates.go (getTemplate)
- [ ] T110 [P] [US4] Implement PUT /api/templates/{id} handler at packages/lm-eval/bff/internal/api/handlers/templates.go (updateTemplate)
- [ ] T111 [P] [US4] Implement DELETE /api/templates/{id} handler at packages/lm-eval/bff/internal/api/handlers/templates.go (deleteTemplate)
- [ ] T112 [US4] Add template usage tracking to evaluation service at packages/lm-eval/bff/internal/services/evaluation_service.go
- [ ] T113 [US4] Register US4 routes in router at packages/lm-eval/bff/internal/api/router.go

### Frontend Implementation for US4

- [ ] T114 [P] [US4] Create Template types at packages/lm-eval/frontend/src/types/template.ts
- [ ] T115 [P] [US4] Create templates API client at packages/lm-eval/frontend/src/services/api/templates.ts with CRUD functions
- [ ] T116 [P] [US4] Create useTemplates hook at packages/lm-eval/frontend/src/services/hooks/useTemplates.ts
- [ ] T117 [US4] Create Templates page at packages/lm-eval/frontend/src/pages/Templates/Templates.tsx with list view
- [ ] T118 [P] [US4] Create TemplateCard component at packages/lm-eval/frontend/src/components/TemplateCard/TemplateCard.tsx
- [ ] T119 [P] [US4] Create TemplateEditor component at packages/lm-eval/frontend/src/components/TemplateEditor/TemplateEditor.tsx for create/edit
- [ ] T120 [US4] Add "Save as Template" button to CreateEvaluation page at packages/lm-eval/frontend/src/pages/CreateEvaluation/CreateEvaluation.tsx
- [ ] T121 [US4] Add template selector to CreateEvaluation page for loading templates at packages/lm-eval/frontend/src/pages/CreateEvaluation/CreateEvaluation.tsx
- [ ] T122 [US4] Update routes to include templates page in packages/lm-eval/frontend/src/odh/routes/index.ts
- [ ] T123 [US4] Update navigation extensions to include Templates menu item at packages/lm-eval/frontend/src/odh/extensions.ts

**Checkpoint**: All user stories should now be independently functional. Full MVP+ feature set is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall quality

- [ ] T124 [P] Create architecture documentation at packages/lm-eval/docs/architecture.md
- [ ] T125 [P] Create API documentation at packages/lm-eval/docs/api.md
- [ ] T126 [P] Create deployment guide at packages/lm-eval/docs/deployment.md
- [ ] T127 [P] Add comprehensive error handling across all BFF handlers in packages/lm-eval/bff/internal/api/handlers/
- [ ] T128 [P] Add input validation across all BFF handlers in packages/lm-eval/bff/internal/api/handlers/
- [ ] T129 [P] Optimize frontend bundle size in webpack config at packages/lm-eval/frontend/config/webpack.prod.js
- [ ] T130 [P] Add loading states and skeletons to all pages in packages/lm-eval/frontend/src/pages/
- [ ] T131 [P] Add empty states to all list views in packages/lm-eval/frontend/src/pages/
- [ ] T132 [P] Implement responsive design for mobile/tablet in all components
- [ ] T133 [P] Add accessibility (a11y) attributes to all components
- [ ] T134 [P] Add internationalization (i18n) support preparation
- [ ] T135 Verify quickstart.md instructions work end-to-end
- [ ] T136 [P] Create Kubernetes manifests at packages/lm-eval/manifests/ for deployment
- [ ] T137 [P] Update root package.json to include lm-eval in workspaces
- [ ] T138 [P] Configure contract tests at packages/lm-eval/contract-tests/
- [ ] T139 Code cleanup and remove TODOs across all files
- [ ] T140 Final review and validation of all user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - MVP baseline
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Independent of US1 but integrates with it
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion - Requires US1 evaluations to exist for meaningful results
- **User Story 4 (Phase 6)**: Depends on Foundational phase completion - Enhances US1 configuration workflow
- **Polish (Phase 7)**: Depends on completion of desired user stories

### User Story Dependencies

- **User Story 1 (P1) - Configure and Launch**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2) - Monitor Running**: Can start after Foundational - Enhances US1 but independently testable
- **User Story 3 (P3) - View Results**: Can start after Foundational - Uses evaluations from US1 but independently testable
- **User Story 4 (P4) - Templates**: Can start after Foundational - Enhances US1 configuration but independently testable

**Key Insight**: After Foundational phase, all user stories CAN be worked on in parallel by different developers because they touch different files and have minimal interdependencies.

### Within Each User Story

General flow within each story:
1. BFF models first (data structures)
2. BFF services (business logic)
3. BFF handlers (API endpoints)
4. Frontend types and API clients
5. Frontend hooks (data management)
6. Frontend components (UI building blocks)
7. Frontend pages (complete features)
8. Route and navigation updates

### Parallel Opportunities

- **Phase 1 (Setup)**: Most tasks marked [P] can run in parallel
- **Phase 2 (Foundational)**: Most BFF and Frontend foundation tasks marked [P] can run in parallel
- **Across User Stories**: After foundational phase:
  - Developer A: User Story 1 (T038-T072)
  - Developer B: User Story 2 (T073-T085)
  - Developer C: User Story 3 (T086-T104)
  - Developer D: User Story 4 (T105-T123)
- **Within User Stories**: Tasks marked [P] can run in parallel (different files, no dependencies)
- **Phase 7 (Polish)**: Most tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

After Foundational phase is complete, launch all parallelizable US1 tasks together:

```bash
# BFF Models (all independent files):
Task: "Create Evaluation model struct at packages/lm-eval/bff/internal/models/evaluation.go"
Task: "Create Task model struct at packages/lm-eval/bff/internal/models/task.go"
Task: "Create Model model struct at packages/lm-eval/bff/internal/models/model.go"

# BFF Handlers (all independent endpoints):
Task: "Implement GET /api/evaluations handler..."
Task: "Implement GET /api/evaluations/{id} handler..."
Task: "Implement GET /api/tasks handler..."
Task: "Implement GET /api/tasks/{id} handler..."
Task: "Implement GET /api/models handler..."
Task: "Implement GET /api/models/{id} handler..."

# Frontend Types (all independent files):
Task: "Create Evaluation types at packages/lm-eval/frontend/src/types/evaluation.ts"
Task: "Create Task types at packages/lm-eval/frontend/src/types/task.ts"
Task: "Create Model types at packages/lm-eval/frontend/src/types/model.ts"

# Frontend API Clients (all independent files):
Task: "Create evaluations API client at packages/lm-eval/frontend/src/services/api/evaluations.ts"
Task: "Create tasks API client at packages/lm-eval/frontend/src/services/api/tasks.ts"
Task: "Create models API client at packages/lm-eval/frontend/src/services/api/models.ts"

# Frontend Hooks (all independent files):
Task: "Create useEvaluations hook at packages/lm-eval/frontend/src/services/hooks/useEvaluations.ts"
Task: "Create useTasks hook at packages/lm-eval/frontend/src/services/hooks/useTasks.ts"
Task: "Create useModels hook at packages/lm-eval/frontend/src/services/hooks/useModels.ts"

# Frontend Components (all independent files):
Task: "Create ModelSelector component at packages/lm-eval/frontend/src/components/ModelSelector/ModelSelector.tsx"
Task: "Create TaskSelector component at packages/lm-eval/frontend/src/components/TaskSelector/TaskSelector.tsx"
Task: "Create ConfigForm component at packages/lm-eval/frontend/src/components/ConfigForm/ConfigForm.tsx"
Task: "Create EvaluationCard component at packages/lm-eval/frontend/src/components/EvaluationCard/EvaluationCard.tsx"
Task: "Create StatusBadge component at packages/lm-eval/frontend/src/components/StatusBadge/StatusBadge.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimum Viable Product - Fastest path to value:**

1. Complete Phase 1: Setup (T001-T010) - ~1 day
2. Complete Phase 2: Foundational (T011-T037) - ~2-3 days
3. Complete Phase 3: User Story 1 (T038-T072) - ~3-4 days
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready

**Total MVP Time**: ~6-8 days with one developer, 3-4 days with parallel execution

### Incremental Delivery

**Recommended approach for continuous value delivery:**

1. **Iteration 1**: Setup + Foundational → Foundation ready (~3 days)
2. **Iteration 2**: Add User Story 1 → Test independently → Deploy/Demo (MVP! ~4 days)
3. **Iteration 3**: Add User Story 2 → Test independently → Deploy/Demo (~3 days)
4. **Iteration 4**: Add User Story 3 → Test independently → Deploy/Demo (~4 days)
5. **Iteration 5**: Add User Story 4 → Test independently → Deploy/Demo (~3 days)
6. **Iteration 6**: Polish phase → Final release (~2 days)

**Total Time**: ~19 days sequentially, ~11 days with 2 developers in parallel after foundation

### Parallel Team Strategy

With 3-4 developers after Foundational phase:

1. **Week 1**: Team completes Setup + Foundational together
2. **Week 2**: Parallel user story development:
   - Developer A: User Story 1 (T038-T072)
   - Developer B: User Story 2 (T073-T085)
   - Developer C: User Story 3 (T086-T104)
3. **Week 3**:
   - Developer D: User Story 4 (T105-T123)
   - Others: Polish and integration testing
4. Stories complete and integrate independently

---

## Task Statistics

**Total Tasks**: 140

**By Phase**:
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 27 tasks
- Phase 3 (US1): 35 tasks
- Phase 4 (US2): 13 tasks
- Phase 5 (US3): 19 tasks
- Phase 6 (US4): 19 tasks
- Phase 7 (Polish): 17 tasks

**By User Story**:
- User Story 1 (P1): 35 tasks
- User Story 2 (P2): 13 tasks
- User Story 3 (P3): 19 tasks
- User Story 4 (P4): 19 tasks

**Parallel Opportunities**: 94 tasks marked [P] (67% can run in parallel)

**MVP Scope**: 37 tasks (Setup + Foundational + US1)

---

## Notes

- [P] tasks indicate different files with no dependencies - safe to parallelize
- [Story] label maps task to specific user story for traceability and independent testing
- Each user story should be independently completable and testable
- Commit after each task or logical group of tasks
- Stop at any checkpoint to validate story independently
- No test tasks included as tests were not explicitly requested in specification
- Follow existing ODH Dashboard testing patterns as documented in quickstart.md
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
