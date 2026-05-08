# Pipeline Integrations Layer Analysis

**Date**: 2026-05-08  
**Scope**: `packages/automl/bff/internal/integrations/pipelineserver/` and `packages/autorag/bff/internal/integrations/pipelineserver/`

## Executive Summary

This analysis examines the pipeline integration code in both automl and autorag packages to classify what belongs in the integrations layer versus what should move to repositories. The code is **nearly identical** between the two packages, indicating strong duplication and a clear candidate for extraction into autox-core.

**Key Finding**: The current integrations layer is **well-designed** and follows proper separation of concerns. It consists of thin HTTP wrappers around the Kubeflow Pipelines API with minimal business logic. The integration code should **STAY** in its current role.

## Current Structure

Both automl and autorag have identical pipelineserver integration structure:

```
packages/{automl,autorag}/bff/internal/integrations/pipelineserver/
├── client.go           # HTTP client wrapper for KFP v2beta1 API
├── client_factory.go   # Factory for creating configured HTTP clients
└── psmocks/
    └── client_mock.go  # Mock implementation for testing
```

## Code Duplication

The `client.go` and `client_factory.go` files are **100% identical** between automl and autorag except for:
- Import paths (`automl-library` vs `autorag-library`)
- Model package references
- Comments mentioning "AutoML" vs "AutoRAG"

Lines of code: **632 lines** (client.go) + **38 lines** (client_factory.go) = **670 lines duplicated**

## Layered Design Principle

### Integration Layer (integrations/pipelineserver/)
**Purpose**: Thin wrappers around external APIs. Direct translation of HTTP calls to Go methods.

**Responsibilities**:
- HTTP request construction
- Request/response marshaling (JSON encoding/decoding)
- Error handling (HTTP status codes → Go errors)
- Connection management (TLS, timeouts, auth headers)
- API client interface definition

**Anti-patterns to avoid**:
- Business logic or decision-making
- Data transformation beyond simple marshaling
- Workflow orchestration
- Validation rules
- Caching or state management

### Repository Layer (repositories/)
**Purpose**: Business logic that uses the integration layer.

**Responsibilities**:
- Workflow orchestration (e.g., discover-then-create pattern)
- Business rules and validation
- Data transformation and enrichment
- Caching and state management
- Multi-step operations
- Domain-specific logic

## File-by-File Classification

### integrations/pipelineserver/client.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| `HTTPError` struct + methods | 18-31 | **STAY** | Error wrapper for HTTP responses - integration concern |
| `PipelineServerClientInterface` | 34-45 | **STAY** | API contract definition - proper interface |
| Constants (maxPipelineErrorBodySize, maxSuccessBodySize) | 47-53 | **STAY** | HTTP client configuration - integration concern |
| `ListRunsParams` struct | 56-61 | **STAY** | Query parameter DTO - maps directly to API params |
| `RealPipelineServerClient` struct + constructor | 64-83 | **STAY** | HTTP client state - integration concern |
| `ListRuns()` method | 86-147 | **STAY** | Direct KFP API wrapper - proper thin client |
| `GetRun()` method | 150-193 | **STAY** | Direct KFP API wrapper - single resource fetch |
| `GetPipelineVersion()` method | 196-237 | **STAY** | Direct KFP API wrapper - single resource fetch |
| `ListPipelines()` method | 240-318 | **STAY** | Direct KFP API wrapper with pagination - still integration concern |
| `ListPipelineVersions()` method | 320-378 | **STAY** | Direct KFP API wrapper - single resource list |
| `CreateRun()` method | 381-426 | **STAY** | Direct KFP API wrapper - POST with JSON body |
| `TerminateRun()` method | 428-473 | **STAY** | Direct KFP API wrapper - POST action endpoint |
| `RetryRun()` method | 475-520 | **STAY** | Direct KFP API wrapper - POST action endpoint |
| `CreatePipeline()` method | 522-565 | **STAY** | Direct KFP API wrapper - POST with JSON body |
| `UploadPipelineVersion()` method | 567-631 | **STAY** | Direct KFP API wrapper - multipart upload |

**Summary**: All 632 lines of client.go should **STAY** in integrations layer.

### integrations/pipelineserver/client_factory.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| `PipelineServerClientFactory` interface | 11-13 | **STAY** | Factory pattern interface - proper abstraction |
| `RealClientFactory` struct | 16 | **STAY** | Factory implementation |
| `NewRealClientFactory()` constructor | 19-21 | **STAY** | Factory constructor |
| `CreateClient()` method | 24-37 | **STAY** | HTTP client configuration (TLS, timeouts) - integration concern |

**Summary**: All 38 lines of client_factory.go should **STAY** in integrations layer.

## Violations Found in repositories/

While the integrations layer is well-designed, examining the repositories layer reveals proper separation:

### automl/bff/internal/repositories/pipeline.go (540 lines)

**Business logic correctly in repositories**:
- ✅ `pipelineCache` - in-memory caching with TTL and LRU eviction (lines 79-160)
- ✅ `DiscoverNamedPipelines()` - multi-pipeline discovery workflow (lines 194-236)
- ✅ `discoverOnePipeline()` - discovery logic with name matching, namespace guards (lines 245-323)
- ✅ `buildPipelineNameFilter()` - KFP predicate JSON builder (lines 328-351)
- ✅ `EnsurePipeline()` - discover-or-create workflow with concurrency control (lines 362-433)
- ✅ `ensurePipelineAndVersion()` - multi-step creation orchestration (lines 437-496)
- ✅ `findOrCreatePipeline()` - retry logic for pipeline shell creation (lines 499-539)

**Separation is correct**: The repository uses the integration client as a thin wrapper and adds:
- Caching strategy (5-min TTL, LRU eviction, namespace isolation)
- Discovery algorithms (name matching, version selection)
- Creation workflows (with race condition handling)
- Business rules (default names, version naming conventions)

### automl/bff/internal/repositories/pipeline_runs.go

**Business logic correctly in repositories**:
- ✅ `GetPipelineRuns()` - adds pipelineType enrichment, error handling (lines 50-98)
- ✅ `buildFilter()` - KFP filter construction with business rule (always exclude archived runs) (lines 103-139)
- ✅ `toPipelineRun()` - transformation from KFP model to API model (lines 143-163)
- ✅ Field validation schemas and logic (lines 165-199+)

**Separation is correct**: The repository orchestrates API calls and adds domain logic on top of the thin integration client.

## Patterns That Violate Separation of Concerns

**None found in the current integrations layer**. The code exemplifies proper layering:

### ✅ Good Pattern: Pagination in Integration Layer
```go
// ListPipelines() in client.go - lines 253-318
func (c *RealPipelineServerClient) ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error) {
    var allPipelines []models.KFPipeline
    pageToken := ""
    
    for {
        // Fetch page
        resp, err := c.httpClient.Do(req)
        // ...
        if page.NextPageToken == "" {
            break
        }
        pageToken = page.NextPageToken
    }
    
    return &models.KFPipelinesResponse{
        Pipelines: allPipelines,
        TotalSize: totalSize,
    }, nil
}
```

**Why this is correct**: Pagination is an **API contract concern**, not business logic. The KFP API uses cursor-based pagination and the client must handle it to provide a complete result set. This is similar to an ORM handling SQL cursor pagination - it's part of the integration mechanism.

### ✅ Good Pattern: Error Translation
```go
// HTTPError in client.go - lines 18-31
type HTTPError struct {
    StatusCode int
    Message    string
}

func (e *HTTPError) Error() string {
    return fmt.Sprintf("pipeline server returned %d: %s", e.StatusCode, e.Message)
}
```

**Why this is correct**: Converting HTTP status codes to typed Go errors is an integration concern. It provides a consistent error interface for the repository layer.

### ✅ Good Pattern: Thin Request Construction
```go
// CreateRun() in client.go - lines 381-426
func (c *RealPipelineServerClient) CreateRun(ctx context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
    body, err := json.Marshal(request)
    // ... build HTTP request
    resp, err := c.httpClient.Do(req)
    // ... decode response
    var runResponse models.KFPipelineRun
    if err := json.NewDecoder(...).Decode(&runResponse); err != nil {
        return nil, fmt.Errorf("failed to decode response: %w", err)
    }
    return &runResponse, nil
}
```

**Why this is correct**: The method accepts a model struct, marshals to JSON, makes HTTP call, unmarshals response. No business logic, no decisions - pure API translation.

## Recommendations

### 1. Extract to autox-core (HIGH PRIORITY)

The pipelineserver integration is duplicated 100% between automl and autorag. Extract to:

```
packages/autox-core/integrations/pipelineserver/
├── client.go
├── client_factory.go
└── psmocks/
    └── client_mock.go
```

**Benefits**:
- **DRY**: Eliminate 670 lines of duplication
- **Consistency**: Single source of truth for KFP API client
- **Maintainability**: Bug fixes and features apply to both automl and autorag
- **Testing**: Shared test suite for integration behavior

**Migration Path**:
1. Copy client code to autox-core
2. Update import paths in both automl and autorag to reference autox-core
3. Remove duplicated code from automl and autorag
4. Run integration tests to verify behavior unchanged

### 2. Keep Separation (CURRENT STATE)

**DO NOT MOVE** any code from integrations to repositories or vice versa. The current layering is correct:

- **integrations/pipelineserver/**: HTTP client wrapper ✅
- **repositories/pipeline.go**: Discovery, caching, creation workflows ✅
- **repositories/pipeline_runs.go**: Run listing, filtering, transformation ✅

### 3. Document Interface Boundaries

Add package-level documentation to integrations/pipelineserver/:

```go
// Package pipelineserver provides a thin HTTP client wrapper around the
// Kubeflow Pipelines v2beta1 API. This package contains only integration
// concerns: HTTP request construction, JSON marshaling, error translation,
// and connection management.
//
// Business logic, caching, validation, and workflows belong in the
// repositories layer.
package pipelineserver
```

## Conclusion

The pipelines integration code demonstrates **excellent separation of concerns**:

- Integration layer = thin HTTP wrappers ✅
- Repository layer = business logic and orchestration ✅
- No violations found ✅

The primary issue is **duplication between packages**, not architectural violations. Extract the integration code to autox-core to eliminate duplication while preserving the clean layered design.

## Appendix: Side-by-Side Comparison

Here's a snippet showing the duplication:

**automl/bff/internal/integrations/pipelineserver/client.go:240-318**
```go
// ListPipelines retrieves all pipelines from the Kubeflow Pipelines API v2beta1,
// paging through results until the last page is reached.
//
// An optional filter (KFP predicate JSON) can be passed to narrow results on the
// server side. Each page is fetched with a fixed page size; the next_page_token
// from each response is used to request the following page. All pipelines are
// aggregated into a single response before returning.
//
// Parameters:
//   - filter: KFP predicate JSON, or empty string for no filter
//
// Returns:
//   - *models.KFPipelinesResponse: Combined list of pipelines with IDs, names, and metadata
//   - error: If any request fails or any response cannot be decoded
func (c *RealPipelineServerClient) ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error) {
    // ... identical implementation
}
```

**autorag/bff/internal/integrations/pipelineserver/client.go:381-460**
```go
// ListPipelines retrieves all pipelines from the Kubeflow Pipelines API v2beta1,
// paging through results until the last page is reached.
//
// An optional filter (KFP predicate JSON) can be passed to narrow results on the
// server side. Each page is fetched with a fixed page size; the next_page_token
// from each response is used to request the following page. All pipelines are
// aggregated into a single response before returning.
//
// Parameters:
//   - filter: KFP predicate JSON, or empty string for no filter
//
// Returns:
//   - *models.KFPipelinesResponse: Combined list of pipelines with IDs, names, and metadata
//   - error: If any request fails or any response cannot be decoded
func (c *RealPipelineServerClient) ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error) {
    // ... identical implementation
}
```

The only difference is the import path and the exact same API contract is used.
