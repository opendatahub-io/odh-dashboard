# Pipeline Handlers Analysis - Separation of Concerns

**Date:** 2026-05-08  
**Packages Analyzed:** `automl/bff/internal/api`, `autorag/bff/internal/api`  
**Goal:** Document which logic should stay in handlers (HTTP layer) vs. move to repositories (business logic layer)

---

## Executive Summary

The current pipeline handlers demonstrate **mixed adherence** to separation of concerns. Some handlers correctly delegate to repositories, while others contain business logic that should be extracted. This analysis identifies specific refactoring opportunities to improve maintainability and testability.

---

## Layered Design Principles

### Handlers (HTTP Layer) - SHOULD:
- Parse HTTP request parameters (query params, path params, headers, body)
- Validate HTTP-specific concerns (missing params, malformed JSON, content-type)
- Extract values from request context (client, namespace, identity)
- Map business errors to appropriate HTTP status codes (400, 404, 500)
- Write HTTP responses with correct status codes and headers
- Handle routing and middleware composition

### Handlers (HTTP Layer) - SHOULD NOT:
- Implement business logic or domain rules
- Call pipeline APIs or Kubernetes APIs directly
- Perform data transformations or aggregations
- Validate business rules (pipeline state, ownership, etc.)
- Contain sorting, filtering, or pagination logic beyond parsing params

### Repositories (Business Logic Layer) - SHOULD:
- Encapsulate all pipeline API interactions
- Implement domain business rules and validation
- Perform data transformations and aggregations
- Handle ownership checks and pipeline matching logic
- Manage state transitions and validations (e.g., "can this run be terminated?")
- Provide reusable, testable business operations

---

## Current Structure Overview

### AutoML BFF (`packages/automl/bff/internal/api/`)

**Pipeline-related handlers:**
- `pipeline_run_handler.go` - POST /api/v1/pipeline-runs (create run)
- `pipeline_runs_handler.go` - GET /api/v1/pipeline-runs (list runs)
- `pipeline_runs_handler.go` - GET /api/v1/pipeline-runs/:runId (get single run)
- `pipeline_runs_handler.go` - POST /api/v1/pipeline-runs/:runId/terminate
- `pipeline_runs_handler.go` - POST /api/v1/pipeline-runs/:runId/retry

**Repository layer:**
- `repositories/pipeline.go` - Pipeline discovery and management
- `repositories/pipeline_runs.go` - Pipeline run operations

### AutoRAG BFF (`packages/autorag/bff/internal/api/`)

**Pipeline-related handlers:**
- `pipeline_run_handler.go` - POST /api/v1/pipeline-runs (create run)
- `pipeline_runs_handler.go` - GET /api/v1/pipeline-runs (list runs)
- `pipeline_runs_handler.go` - GET /api/v1/pipeline-runs/:runId (get single run)
- `pipeline_runs_handler.go` - POST /api/v1/pipeline-runs/:runId/terminate
- `pipeline_runs_handler.go` - POST /api/v1/pipeline-runs/:runId/retry

**Repository layer:**
- `repositories/pipeline.go` - Pipeline discovery and management
- `repositories/pipeline_runs.go` - Pipeline run operations

---

## Handler Function Analysis

### ✅ GOOD: Already Following SOC

| Handler | Package | Lines | Classification | Rationale |
|---------|---------|-------|----------------|-----------|
| `CreatePipelineRunHandler` | AutoML | 52-140 | **STAY** | Correctly delegates business logic to repositories. HTTP concerns only: request parsing, context extraction, error mapping, response writing. |
| `CreatePipelineRunHandler` | AutoRAG | 45-136 | **STAY** | Same as AutoML - clean separation, proper delegation to `app.repositories.PipelineRuns.CreatePipelineRun`. |
| `TerminatePipelineRunHandler` | AutoML | 269-289 | **STAY** | Clean HTTP layer - delegates to `resolveOwnedRun` for business logic, then calls repository method. State validation in handler is acceptable as it's request-specific. |
| `TerminatePipelineRunHandler` | AutoRAG | 240-260 | **STAY** | Same pattern as AutoML. |
| `RetryPipelineRunHandler` | AutoML | 312-332 | **STAY** | Same pattern as terminate handler. |
| `RetryPipelineRunHandler` | AutoRAG | 283-303 | **STAY** | Same pattern as terminate handler. |
| `mapMutationError` | AutoML | 234-245 | **STAY** | Pure HTTP error mapping - converts repository errors to HTTP status codes. |
| `mapMutationError` | AutoRAG | 206-217 | **STAY** | Same as AutoML. |

---

## ⚠️ MIXED: Needs Refactoring

| Handler | Package | Lines | Issues | Recommendation |
|---------|---------|-------|--------|----------------|
| `PipelineRunsHandler` | AutoML | 35-149 | **MOVE**: Sorting logic (lines 106-111), pagination arithmetic (lines 116-134), merging runs from multiple pipelines (lines 96-103) | Move to repository: `GetAllMergedPipelineRuns(pipelines, pageSize, page) -> PipelineRunsData`. Handler should only parse params and delegate. |
| `PipelineRunsHandler` | AutoRAG | 34-108 | **STAY** | Clean - delegates to repository for pagination and filtering. |
| `PipelineRunHandler` | AutoML | 153-167 | **STAY** | Delegates to `resolveOwnedRun` helper, then writes response. |
| `PipelineRunHandler` | AutoRAG | 126-140 | **STAY** | Same pattern as AutoML. |
| `resolveOwnedRun` | AutoML | 174-229 | **MOVE** (partial) | Ownership validation logic (lines 208-224) should be in repository. Parameter extraction and error response writing should stay. |
| `resolveOwnedRun` | AutoRAG | 146-201 | **MOVE** (partial) | Same issue as AutoML - ownership validation is business logic. |
| `pipelineDefinition` | AutoML | 23-38 | **MOVE** | Configuration mapping logic - should be in repository or config layer, not handler. |

---

## Specific Refactoring Examples

### Example 1: AutoML `PipelineRunsHandler` - Sorting and Pagination

**Current (ANTI-PATTERN):**
```go
// packages/automl/bff/internal/api/pipeline_runs_handler.go:96-134
// Handlers contain sorting, merging, and pagination arithmetic
var allRuns []models.PipelineRun
for pipelineType, discovered := range discoveredPipelines {
    runs, err := app.repositories.PipelineRuns.GetAllPipelineRuns(...)
    allRuns = append(allRuns, runs...)
}

// Sort merged runs by created_at descending
sort.Slice(allRuns, func(i, j int) bool {
    if allRuns[i].CreatedAt != allRuns[j].CreatedAt {
        return allRuns[i].CreatedAt > allRuns[j].CreatedAt
    }
    return allRuns[i].RunID > allRuns[j].RunID
})

// Apply page/pageSize pagination with complex arithmetic
total := len(allRuns)
start64 := (page - 1) * int64(pageSize)
end64 := start64 + int64(pageSize)
// ... bounds checking logic ...
pagedRuns := allRuns[int(start64):int(end64)]
```

**Proposed (GOOD PATTERN):**
```go
// Handler (stays in api/pipeline_runs_handler.go)
func (app *App) PipelineRunsHandler(...) {
    // Parse pagination params (HTTP concern)
    pageSize := parsePaginationParam(r.URL.Query(), "pageSize", 20, 100)
    page := parsePaginationParam(r.URL.Query(), "page", 1, maxInt64)
    
    // Delegate to repository (business logic)
    runsData, err := app.repositories.PipelineRuns.GetMergedPipelineRuns(
        client, ctx, discoveredPipelines, pageSize, page,
    )
    
    // Write response (HTTP concern)
    app.WriteJSON(w, http.StatusOK, PipelineRunsEnvelope{Data: runsData}, nil)
}

// Repository (moves to repositories/pipeline_runs.go)
func (r *PipelineRunsRepository) GetMergedPipelineRuns(
    client ps.PipelineServerClientInterface,
    ctx context.Context,
    discoveredPipelines map[string]*DiscoveredPipeline,
    pageSize int32,
    page int64,
) (*models.PipelineRunsData, error) {
    // Fetch from all pipelines
    var allRuns []models.PipelineRun
    for pipelineType, discovered := range discoveredPipelines {
        runs, err := r.GetAllPipelineRuns(client, ctx, discovered.PipelineVersionID, pipelineType)
        if err != nil {
            return nil, err
        }
        allRuns = append(allRuns, runs...)
    }
    
    // Sort by created_at descending
    sort.Slice(allRuns, func(i, j int) bool {
        if allRuns[i].CreatedAt != allRuns[j].CreatedAt {
            return allRuns[i].CreatedAt > allRuns[j].CreatedAt
        }
        return allRuns[i].RunID > allRuns[j].RunID
    })
    
    // Apply pagination
    return paginateRuns(allRuns, pageSize, page), nil
}
```

**Impact:** Reduces handler from 114 lines to ~20 lines. Business logic becomes unit-testable without HTTP mocking.

---

### Example 2: `resolveOwnedRun` - Ownership Validation

**Current (ANTI-PATTERN):**
```go
// packages/automl/bff/internal/api/pipeline_runs_handler.go:174-229
func (app *App) resolveOwnedRun(...) {
    // HTTP concerns (STAY)
    client := ctx.Value(constants.PipelineServerClientKey)
    runID := params.ByName("runId")
    
    // Repository call (STAY)
    run, err := app.repositories.PipelineRuns.GetPipelineRun(client, ctx, runID)
    
    // Business logic validation (MOVE to repository)
    discoveredPipelines := ctx.Value(constants.DiscoveredPipelinesKey)
    matchedPipelineType := ""
    for pipelineType, discovered := range discoveredPipelines {
        if run.PipelineVersionReference.PipelineID == discovered.PipelineID &&
            run.PipelineVersionReference.PipelineVersionID == discovered.PipelineVersionID {
            matchedPipelineType = pipelineType
            break
        }
    }
    if matchedPipelineType == "" {
        app.notFoundResponse(w, r)  // HTTP concern (STAY)
        return
    }
    run.PipelineType = matchedPipelineType
}
```

**Proposed (GOOD PATTERN):**
```go
// Handler (stays in api/pipeline_runs_handler.go)
func (app *App) resolveOwnedRun(...) {
    client := ctx.Value(constants.PipelineServerClientKey)
    runID := params.ByName("runId")
    if runID == "" {
        app.badRequestResponse(w, r, fmt.Errorf("missing runId parameter"))
        return nil, nil, false
    }
    
    discoveredPipelines := ctx.Value(constants.DiscoveredPipelinesKey)
    
    // Delegate ownership validation to repository
    run, err := app.repositories.PipelineRuns.GetOwnedPipelineRun(
        client, ctx, runID, discoveredPipelines,
    )
    if errors.Is(err, ErrPipelineRunNotFound) {
        app.notFoundResponse(w, r)
        return nil, nil, false
    }
    if errors.Is(err, ErrPipelineRunNotOwned) {
        app.notFoundResponse(w, r) // Same 404 for security
        return nil, nil, false
    }
    if err != nil {
        app.serverErrorResponse(w, r, err)
        return nil, nil, false
    }
    
    return client, run, true
}

// Repository (new method in repositories/pipeline_runs.go)
var ErrPipelineRunNotOwned = errors.New("pipeline run does not belong to any discovered pipeline")

func (r *PipelineRunsRepository) GetOwnedPipelineRun(
    client ps.PipelineServerClientInterface,
    ctx context.Context,
    runID string,
    discoveredPipelines map[string]*DiscoveredPipeline,
) (*models.PipelineRun, error) {
    run, err := r.GetPipelineRun(client, ctx, runID)
    if err != nil {
        return nil, err
    }
    
    if run.PipelineVersionReference == nil {
        return nil, ErrPipelineRunNotFound
    }
    
    // Validate ownership against discovered pipelines
    for pipelineType, discovered := range discoveredPipelines {
        if run.PipelineVersionReference.PipelineID == discovered.PipelineID &&
            run.PipelineVersionReference.PipelineVersionID == discovered.PipelineVersionID {
            run.PipelineType = pipelineType
            return run, nil
        }
    }
    
    return nil, ErrPipelineRunNotOwned
}
```

**Impact:** Ownership logic becomes reusable and testable. Handler focuses purely on HTTP error mapping.

---

### Example 3: `pipelineDefinition` - Configuration Mapping

**Current (ANTI-PATTERN):**
```go
// packages/automl/bff/internal/api/pipeline_run_handler.go:23-38
func (app *App) pipelineDefinition(pipelineType string) repositories.PipelineDefinition {
    switch pipelineType {
    case constants.PipelineTypeTimeSeries:
        return repositories.PipelineDefinition{
            Name:        app.config.AutoMLTimeSeriesPipelineNamePrefix,
            PipelineDir: "autogluon_timeseries_training_pipeline",
        }
    case constants.PipelineTypeTabular:
        return repositories.PipelineDefinition{
            Name:        app.config.AutoMLTabularPipelineNamePrefix,
            PipelineDir: "autogluon_tabular_training_pipeline",
        }
    default:
        return repositories.PipelineDefinition{Name: pipelineType}
    }
}
```

**Proposed (GOOD PATTERN):**
```go
// Move to repositories/pipeline.go or config package
func GetPipelineDefinition(pipelineType string, cfg *config.EnvConfig) repositories.PipelineDefinition {
    switch pipelineType {
    case constants.PipelineTypeTimeSeries:
        return repositories.PipelineDefinition{
            Name:        cfg.AutoMLTimeSeriesPipelineNamePrefix,
            PipelineDir: "autogluon_timeseries_training_pipeline",
        }
    case constants.PipelineTypeTabular:
        return repositories.PipelineDefinition{
            Name:        cfg.AutoMLTabularPipelineNamePrefix,
            PipelineDir: "autogluon_tabular_training_pipeline",
        }
    default:
        return repositories.PipelineDefinition{Name: pipelineType}
    }
}

// Or inject as a map during App initialization:
type App struct {
    pipelineDefinitions map[string]repositories.PipelineDefinition
    // ...
}
```

**Impact:** Removes configuration logic from handlers, making it reusable across middleware and other contexts.

---

## State Validation in Handlers - Special Case

**Question:** Should state validation (e.g., "is run terminatable?") stay in handlers or move to repositories?

**Current Implementation:**
```go
// packages/automl/bff/internal/api/pipeline_runs_handler.go:247-252, 276-279
var terminatableStates = map[string]bool{
    "PENDING": true, "RUNNING": true, "PAUSED": true,
}

// In TerminatePipelineRunHandler:
runState := strings.ToUpper(run.State)
if !terminatableStates[runState] {
    app.badRequestResponse(w, r, fmt.Errorf("run %s is in state %s and cannot be terminated", ...))
    return
}
```

**Analysis:** This is **acceptable in handlers** because:
1. It's request-specific validation (HTTP 400 vs 500 decision)
2. The business rule is simple and directly tied to the HTTP operation
3. Moving it to repository would require returning a specific error type

**However**, for better testability and reusability, it **could** be moved:

```go
// Repository option (if we want reusability):
func (r *PipelineRunsRepository) ValidateTerminatable(run *models.PipelineRun) error {
    state := strings.ToUpper(run.State)
    if !terminatableStates[state] {
        return NewValidationError(fmt.Sprintf("run is in state %s and cannot be terminated", state))
    }
    return nil
}

// Handler:
if err := app.repositories.PipelineRuns.ValidateTerminatable(run); err != nil {
    app.badRequestResponse(w, r, err)
    return
}
```

**Recommendation:** **Move to repository** for consistency and testability, even though current implementation is acceptable.

---

## Summary of Refactoring Recommendations

### High Priority (Clear Violations)

1. **AutoML `PipelineRunsHandler`** - Move sorting, merging, and pagination logic to repository
   - New method: `GetMergedPipelineRuns(discoveredPipelines, pageSize, page) -> PipelineRunsData`
   - Impact: 90+ lines of business logic moved out of handler

2. **`resolveOwnedRun` (both packages)** - Move ownership validation to repository
   - New method: `GetOwnedPipelineRun(runID, discoveredPipelines) -> (*PipelineRun, error)`
   - Impact: Reusable ownership logic, better error semantics

3. **`pipelineDefinition` (AutoML)** - Move to repository or config package
   - Options: Static map in App initialization, or utility function in repositories
   - Impact: Remove configuration logic from handlers

### Medium Priority (Consistency Improvements)

4. **State validation** - Move `terminatableStates` and `retryableStates` checks to repository
   - New methods: `ValidateTerminatable(run) error`, `ValidateRetryable(run) error`
   - Impact: Better testability, consistent with other validation patterns

### Low Priority (Already Good)

5. **AutoRAG handlers** - Already demonstrate good SOC in most cases
   - `PipelineRunsHandler` correctly delegates to repository with pagination
   - Can serve as reference implementation for AutoML refactoring

---

## Testing Impact

### Before Refactoring (Current State)

**To test AutoML `PipelineRunsHandler` sorting logic:**
- Requires HTTP test framework (e.g., `httptest`)
- Must mock request context with discovered pipelines
- Must mock repository responses
- Cannot easily test edge cases (empty runs, single run, page boundaries)

**To test ownership validation:**
- Requires full HTTP request setup
- Must mock context values
- Cannot reuse logic in other contexts (e.g., webhooks, batch jobs)

### After Refactoring (Proposed State)

**To test `GetMergedPipelineRuns` (repository):**
- Pure Go unit test with mocked pipeline server client
- No HTTP concerns
- Easy to test edge cases with table-driven tests

**To test `GetOwnedPipelineRun` (repository):**
- Pure function with clear inputs/outputs
- Can be reused in any context that needs ownership validation
- Error semantics are testable (`ErrPipelineRunNotOwned` vs `ErrPipelineRunNotFound`)

---

## Conclusion

The current handlers demonstrate **good fundamentals** but contain **pockets of business logic** that belong in repositories. The refactoring is **incremental and low-risk** - most handlers already delegate correctly.

**Key Takeaways:**
1. ✅ Most create/terminate/retry handlers already follow SOC correctly
2. ⚠️ AutoML's list handler (pagination/sorting) needs refactoring
3. ⚠️ Ownership validation should move to repository for reusability
4. ✅ AutoRAG handlers serve as a good reference implementation
5. 🎯 Post-refactoring: Handlers should be 20-40 lines of HTTP parsing + delegation

**Next Steps:**
1. Implement `GetMergedPipelineRuns` in AutoML repository
2. Extract `GetOwnedPipelineRun` helper in both packages
3. Move `pipelineDefinition` to config or repository initialization
4. Update handler tests to focus on HTTP error mapping
5. Add repository unit tests for extracted business logic
