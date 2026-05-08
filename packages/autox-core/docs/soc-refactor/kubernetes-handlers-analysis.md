# Kubernetes Handlers Analysis: Separation of Concerns

## Overview

This document analyzes the current handler architecture in the `automl` and `autorag` BFF packages to identify what HTTP-layer logic should stay in handlers versus what business logic should move to repositories.

### Current Architecture

Both packages follow a similar pattern:
- **Handlers** (`internal/api/*_handler.go`) - Currently contain both HTTP concerns and business logic
- **Repositories** (`internal/repositories/`) - Currently contain data access and some business logic
- **Middleware** (`internal/api/middleware.go`) - Manages context injection (identity, namespace, clients)

### Design Principle

The goal is to enforce strict **layered separation of concerns**:

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **HTTP Layer** | Request parsing, response formatting, HTTP status codes, routing | `handlers/` |
| **Business Logic Layer** | K8s API calls, data transformations, validation, orchestration | `repositories/` |
| **Integration Layer** | External service clients (K8s, S3, Pipeline Server, etc.) | `integrations/` |

---

## Handler Classification

### ✅ Handlers Following Good Separation (STAY AS-IS)

These handlers correctly delegate business logic to repositories and focus on HTTP concerns:

| Handler | File | Rationale |
|---------|------|-----------|
| `GetNamespacesHandler` | `automl/api/namespaces_handler.go` | ✅ **HTTP Only**: Extracts identity/context, calls repository method, formats response |
| `LlamaStackModelsHandler` | `autorag/api/lsd_models_handler.go` | ✅ **HTTP Only**: Calls repository, wraps in envelope, returns JSON |
| `LlamaStackVectorStoresHandler` | `autorag/api/lsd_vector_stores_handler.go` | ✅ **HTTP Only**: Calls repository, wraps in envelope, returns JSON |
| `GetModelRegistriesHandler` | `automl/api/model_registry_handler.go` | ✅ **HTTP Only**: Delegates to `ListModelRegistries` in repository, handles errors |
| `PipelineRunHandler` | `automl/api/pipeline_runs_handler.go` (single run) | ✅ **HTTP Only**: Uses `resolveOwnedRun` helper, delegates ownership validation |

**Why these are correct:**
- Handler extracts request parameters (query params, path params, headers)
- Handler retrieves context values (identity, namespace, clients) injected by middleware
- Handler calls **one repository method** to perform the operation
- Handler maps repository errors to HTTP status codes
- Handler wraps the result in an envelope and returns JSON
- **Zero K8s API calls, zero business logic in the handler**

---

## ⚠️ Handlers Requiring Refactoring (MOVE LOGIC TO REPOSITORIES)

These handlers contain business logic or K8s interactions that should move to repositories:

### 1. `GetSecretsHandler` (automl)

**File:** `automl/api/secrets_handler.go`

**Current Violations:**
```go
// ❌ HANDLER CONTAINS:
// - Query parameter parsing and validation (secretType)
// - K8s client retrieval
// - Detailed K8s error classification (apierrors.IsNotFound, IsForbidden, etc.)
// - Multiple error mapping branches

secretType := queryParams.Get("type")
if secretType != "" && secretType != "storage" {
    app.badRequestResponse(w, r, fmt.Errorf("query parameter 'type' must be 'storage' or omitted"))
    return
}

client, err := app.kubernetesClientFactory.GetClient(ctx)
// ... then passes client to repository

// ❌ DETAILED K8S ERROR HANDLING IN HANDLER:
var statusErr *apierrors.StatusError
if errors.As(err, &statusErr) {
    if apierrors.IsNotFound(statusErr) { /* ... */ }
    if apierrors.IsForbidden(statusErr) { /* ... */ }
    // ... etc
}
```

**Should Be:**
```go
// ✅ HANDLER SHOULD ONLY:
func (app *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    ctx := r.Context()
    
    // Extract query parameter
    secretType := r.URL.Query().Get("type")
    
    // Call repository - repository handles validation and K8s interactions
    secrets, err := app.repositories.Secret.GetFilteredSecrets(ctx, secretType)
    if err != nil {
        // Map repository error types to HTTP responses
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusOK, SecretsEnvelope{Data: secrets}, nil)
}
```

**Move to Repository:**
- K8s client creation and management
- Query parameter validation (`type` must be "storage" or empty)
- K8s error classification (NotFound, Forbidden, Unauthorized, BadRequest)
- Repository should return typed errors that handlers can map to HTTP status codes

---

### 2. `PipelineRunsHandler` (automl)

**File:** `automl/api/pipeline_runs_handler.go`

**Current Violations:**
```go
// ❌ HANDLER CONTAINS:
// - Complex pagination logic (page/pageSize parsing, arithmetic)
// - Data merging across multiple pipelines
// - Sorting logic (sort.Slice with custom comparator)
// - Slice pagination arithmetic

// Parse pagination parameters
pageSize := int32(20)
if pageSizeStr := query.Get("pageSize"); pageSizeStr != "" {
    parsed, err := strconv.ParseInt(pageSizeStr, 10, 32)
    if err != nil || parsed <= 0 || parsed > 100 {
        app.badRequestResponse(w, r, fmt.Errorf("invalid pageSize"))
        return
    }
    pageSize = int32(parsed)
}

// ❌ BUSINESS LOGIC: Merging runs from multiple pipelines
var allRuns []models.PipelineRun
for pipelineType, discovered := range discoveredPipelines {
    runs, err := app.repositories.PipelineRuns.GetAllPipelineRuns(...)
    allRuns = append(allRuns, runs...)
}

// ❌ BUSINESS LOGIC: Sorting
sort.Slice(allRuns, func(i, j int) bool {
    if allRuns[i].CreatedAt != allRuns[j].CreatedAt {
        return allRuns[i].CreatedAt > allRuns[j].CreatedAt
    }
    return allRuns[i].RunID > allRuns[j].RunID
})

// ❌ BUSINESS LOGIC: Pagination arithmetic
start64 := (page - 1) * int64(pageSize)
pagedRuns := allRuns[int(start64):int(end64)]
```

**Should Be:**
```go
// ✅ HANDLER SHOULD ONLY:
func (app *App) PipelineRunsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    ctx := r.Context()
    
    // Extract pagination params
    page := extractPageParam(r) // Simple helper
    pageSize := extractPageSizeParam(r) // Simple helper
    
    // Call repository - repository handles merging, sorting, pagination
    runsData, err := app.repositories.PipelineRuns.ListPaginatedRuns(ctx, page, pageSize)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusOK, PipelineRunsEnvelope{Data: runsData}, nil)
}
```

**Move to Repository:**
- Pagination parameter validation and arithmetic
- Merging runs from multiple discovered pipelines
- Sorting logic (by created_at descending, then run_id)
- Slice pagination calculations
- Repository should accept `page` and `pageSize` and return `PipelineRunsData` with `TotalSize`

---

### 3. `CreatePipelineRunHandler` (automl)

**File:** `automl/api/pipeline_run_handler.go`

**Current Violations:**
```go
// ❌ HANDLER CONTAINS:
// - Pipeline type determination logic
// - Pipeline auto-creation orchestration
// - Pipeline definition mapping

// ❌ BUSINESS LOGIC: Determine pipeline type from task_type
pipelineType, err := repositories.DeterminePipelineType(*req.TaskType)
if err != nil {
    app.badRequestResponse(w, r, err)
    return
}

// ❌ BUSINESS LOGIC: Auto-create pipeline if not discovered
if discovered == nil {
    namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
    pipelineServerBaseURL, _ := ctx.Value(constants.PipelineServerBaseURLKey).(string)
    def := app.pipelineDefinition(pipelineType)
    
    discovered, ensureErr = app.repositories.Pipeline.EnsurePipeline(...)
    if ensureErr != nil {
        app.serverErrorResponseWithMessage(w, r, ...)
        return
    }
}

// ❌ HANDLER METHOD: pipelineDefinition
func (app *App) pipelineDefinition(pipelineType string) repositories.PipelineDefinition {
    switch pipelineType {
    case constants.PipelineTypeTimeSeries: /* ... */
    case constants.PipelineTypeTabular: /* ... */
    }
}
```

**Should Be:**
```go
// ✅ HANDLER SHOULD ONLY:
func (app *App) CreatePipelineRunHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    ctx := r.Context()
    
    var req models.CreateAutoMLRunRequest
    if err := decodeJSONRequest(r, &req, maxRequestBodyBytes); err != nil {
        app.badRequestResponse(w, r, err)
        return
    }
    
    // Call repository - repository handles pipeline type, auto-creation, orchestration
    runResponse, err := app.repositories.PipelineRuns.CreateAutoMLRun(ctx, req)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusOK, CreatePipelineRunEnvelope{Data: runResponse}, nil)
}
```

**Move to Repository:**
- Pipeline type determination from `task_type`
- Pipeline definition mapping (timeseries vs tabular)
- Auto-creation orchestration (check discovered, call EnsurePipeline if needed)
- Namespace and pipeline server URL extraction from context
- Repository should accept the request and return the created run

---

### 4. `resolveOwnedRun` Helper (automl)

**File:** `automl/api/pipeline_runs_handler.go`

**Current Violations:**
```go
// ❌ HANDLER HELPER CONTAINS:
// - Run ownership verification logic
// - Pipeline version matching logic
// - Context value extraction

func (app *App) resolveOwnedRun(...) (ps.PipelineServerClientInterface, *models.PipelineRun, bool) {
    // ... extracts client from context
    // ... fetches run from repository
    
    // ❌ BUSINESS LOGIC: Ownership verification
    discoveredPipelines, dpOk := ctx.Value(constants.DiscoveredPipelinesKey).(...)
    matchedPipelineType := ""
    for pipelineType, discovered := range discoveredPipelines {
        if run.PipelineVersionReference.PipelineID == discovered.PipelineID &&
            run.PipelineVersionReference.PipelineVersionID == discovered.PipelineVersionID {
            matchedPipelineType = pipelineType
            break
        }
    }
    if matchedPipelineType == "" {
        app.notFoundResponse(w, r)
        return nil, nil, false
    }
    
    run.PipelineType = matchedPipelineType
    return client, run, true
}
```

**Should Be:**
```go
// ✅ MOVE TO REPOSITORY:
// Repository method: GetOwnedPipelineRun(ctx, runID) (*models.PipelineRun, error)
// - Fetches run
// - Validates ownership against discovered pipelines in context
// - Sets PipelineType field
// - Returns typed error (ErrRunNotFound, ErrRunNotOwned)

// Handler becomes:
func (app *App) PipelineRunHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
    ctx := r.Context()
    runID := params.ByName("runId")
    
    run, err := app.repositories.PipelineRuns.GetOwnedPipelineRun(ctx, runID)
    if err != nil {
        app.handleRepositoryError(w, r, err) // Maps to 404 or 500
        return
    }
    
    app.WriteJSON(w, http.StatusOK, PipelineRunEnvelope{Data: run}, nil)
}
```

**Move to Repository:**
- Run fetching
- Ownership verification against discovered pipelines
- Pipeline type assignment
- Return typed errors for not-found vs not-owned scenarios

---

### 5. `RegisterModelHandler` (automl)

**File:** `automl/api/register_model_handler.go`

**Current Violations:**
```go
// ❌ HANDLER CONTAINS:
// - Model Registry URL resolution logic
// - HTTP client creation
// - DSPA discovery orchestration
// - URL validation

// ❌ BUSINESS LOGIC: Resolve registry by UID
reg, err := app.repositories.ModelRegistry.ResolveModelRegistryByUID(...)

// ❌ BUSINESS LOGIC: URL selection (external vs internal)
baseURL := ""
if strings.TrimSpace(reg.ExternalURL) != "" {
    baseURL = strings.TrimSuffix(strings.TrimSpace(reg.ExternalURL), "/")
    logger.Debug("Using external URL for model registry", "url", baseURL)
} else {
    baseURL = strings.TrimSuffix(strings.TrimSpace(reg.ServerURL), "/")
    logger.Warn("Using internal URL for model registry; may fail due to NetworkPolicy restrictions", "url", baseURL)
}

// ❌ BUSINESS LOGIC: URL validation
if err := validateResolvedModelRegistryURL(baseURL, app.config.AuthMethod); err != nil {
    app.badRequestResponse(w, r, err)
    return
}

// ❌ BUSINESS LOGIC: Create HTTP client
client, err := app.newModelRegistryHTTPClient(logger, baseURL, r)

// ❌ BUSINESS LOGIC: DSPA discovery
dspaStorage, _ := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
if dspaStorage == nil && app.kubernetesClientFactory != nil {
    ctx = app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)
    r = r.WithContext(ctx)
    dspaStorage, _ = ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
}
```

**Should Be:**
```go
// ✅ HANDLER SHOULD ONLY:
func (app *App) RegisterModelHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    
    registryId := ps.ByName("registryId")
    
    var req models.RegisterModelRequest
    if err := decodeJSONRequest(r, &req, maxRegisterModelRequestBodyBytes); err != nil {
        app.badRequestResponse(w, r, err)
        return
    }
    
    // Call repository - repository handles registry resolution, validation, DSPA, orchestration
    result, err := app.repositories.ModelRegistry.RegisterModelInRegistry(ctx, registryId, req)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusCreated, RegisterModelEnvelope{Data: result}, nil)
}
```

**Move to Repository:**
- Model registry resolution by UID
- URL selection logic (external vs internal)
- URL validation
- HTTP client creation
- DSPA discovery and injection
- Full model registration orchestration
- Repository should accept `registryId` and `RegisterModelRequest`, return `RegisterModelResponseData`

---

### 6. `S3 Handlers` (automl)

**File:** `automl/api/s3_handler.go`

**Current Violations:**
```go
// ❌ HANDLERS CONTAIN MASSIVE BUSINESS LOGIC:
// - S3 credential resolution (DSPA vs secretName)
// - S3 client creation and factory usage
// - Bucket resolution with security model logic
// - Port-forward rewriting (dev mode)
// - S3 connectivity error detection
// - CSV content-type resolution
// - File name collision resolution algorithm
// - Multipart parsing and validation
// - Schema validation and parsing

// ❌ resolveS3Client method (100+ lines)
func (app *App) resolveS3Client(...) (*resolvedS3, bool) {
    // ... 100+ lines of credential resolution, bucket logic, client creation
}

// ❌ resolveNonCollidingS3Key (business logic)
func resolveNonCollidingS3Key(...) (string, error) {
    // ... collision detection algorithm with HeadObject calls
}

// ❌ GetS3FileHandler
// - Calls resolveS3Client (business logic)
// - Calls s3.client.GetObject (integration call)
// - Calls sanitizeS3ResponseContentType (business logic)
// - Error classification (NoSuchKey, AccessDenied, connectivity)

// ❌ PostS3FileHandler
// - Calls resolveS3Client (business logic)
// - Calls resolveNonCollidingS3Key (business logic)
// - Multipart parsing (lots of error handling)
// - Calls resolveCsvMultipartContentType (business logic)
// - Calls s3.client.UploadObject (integration call)
// - Multiple error classifications
```

**Should Be:**
```go
// ✅ HANDLERS SHOULD ONLY:

func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    key := ps.ByName("key")
    secretName := r.URL.Query().Get("secretName")
    bucket := r.URL.Query().Get("bucket")
    view := r.URL.Query().Get("view")
    
    // Call repository - repository handles all S3 operations
    if view == "schema" {
        schema, err := app.repositories.S3.GetFileSchema(r.Context(), secretName, bucket, key)
        if err != nil {
            app.handleRepositoryError(w, r, err)
            return
        }
        app.WriteJSON(w, http.StatusOK, map[string]interface{}{"data": schema}, nil)
        return
    }
    
    // Repository returns io.ReadCloser + content-type
    fileReader, contentType, err := app.repositories.S3.GetFile(r.Context(), secretName, bucket, key)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    defer fileReader.Close()
    
    // Handler sets headers and streams
    w.Header().Set("Content-Type", contentType)
    if !allowsInlineViewing(contentType) {
        w.Header().Set("Content-Disposition", "attachment")
    }
    io.Copy(w, fileReader)
}

func (app *App) PostS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    key := ps.ByName("key")
    secretName := r.URL.Query().Get("secretName")
    bucket := r.URL.Query().Get("bucket")
    
    // Repository handles multipart parsing, collision resolution, upload
    uploadedKey, err := app.repositories.S3.UploadCSVFile(r.Context(), r.Body, secretName, bucket, key)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusCreated, map[string]interface{}{
        "uploaded": true,
        "key": uploadedKey,
    }, nil)
}

func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    params := extractS3ListParams(r) // Simple helper for query params
    
    result, err := app.repositories.S3.ListFiles(r.Context(), params)
    if err != nil {
        app.handleRepositoryError(w, r, err)
        return
    }
    
    app.WriteJSON(w, http.StatusOK, S3FilesEnvelope{Data: result}, nil)
}
```

**Move to Repository:**
- **Credential Resolution**: DSPA vs secretName paths, K8s secret fetching
- **S3 Client Management**: Factory usage, credential validation, endpoint validation
- **Bucket Resolution**: DSPA bucket preference, security model enforcement
- **Port-Forward Rewriting**: Dev-mode URL rewriting
- **File Operations**:
  - GetFile: ObjectExists, GetObject, content-type sanitization
  - UploadFile: Collision resolution, multipart parsing, CSV validation, UploadObject
  - ListFiles: Pagination, search filtering
  - GetSchema: CSV parsing, column detection
- **Error Classification**: S3 connectivity errors, access denied, not found
- **Business Rules**: CSV-only validation, content-type rules, collision algorithm

**Repository Interface:**
```go
type S3Repository interface {
    GetFile(ctx, secretName, bucket, key) (io.ReadCloser, string, error)
    GetFileSchema(ctx, secretName, bucket, key) (*CSVSchema, error)
    UploadCSVFile(ctx, body io.Reader, secretName, bucket, key) (uploadedKey string, error)
    ListFiles(ctx, params ListFilesParams) (*ListObjectsResponse, error)
}
```

---

## Summary Table: What Should STAY vs MOVE

| Handler Function | Current State | HTTP Logic (STAY) | Business Logic (MOVE) |
|-----------------|---------------|-------------------|----------------------|
| `GetNamespacesHandler` | ✅ Clean | Identity extraction, JSON response | *(none - already clean)* |
| `GetSecretsHandler` | ⚠️ Mixed | Extract query param, return JSON | K8s client creation, error classification |
| `PipelineRunsHandler` | ⚠️ Mixed | Extract pagination params, return JSON | Merging runs, sorting, pagination arithmetic |
| `PipelineRunHandler` | ✅ Clean | Extract runId, return JSON | *(none - already clean)* |
| `CreatePipelineRunHandler` | ⚠️ Mixed | Parse request body, return JSON | Pipeline type determination, auto-creation orchestration |
| `TerminatePipelineRunHandler` | ⚠️ Mixed | Extract runId, return 200 | State validation, ownership check, terminate call |
| `RetryPipelineRunHandler` | ⚠️ Mixed | Extract runId, return 200 | State validation, ownership check, retry call |
| `resolveOwnedRun` (helper) | ❌ Business Logic | *(move entirely to repository)* | Run fetching, ownership verification, pipeline type assignment |
| `RegisterModelHandler` | ⚠️ Mixed | Parse request, return 201 | Registry resolution, URL selection, DSPA discovery, HTTP client creation |
| `GetS3FileHandler` | ❌ Business Logic Heavy | Stream response, set headers | Credential resolution, client creation, GetObject, error classification |
| `PostS3FileHandler` | ❌ Business Logic Heavy | Return upload result | Credential resolution, collision resolution, multipart parsing, UploadObject |
| `GetS3FilesHandler` | ⚠️ Mixed | Extract query params, return JSON | Credential resolution, pagination, ListObjects |
| `handleS3FileSchemaView` | ❌ Business Logic | *(should be part of repository)* | CSV schema parsing, S3 GetObject |
| `GetModelRegistriesHandler` | ✅ Clean | Extract identity, return JSON | *(none - already clean)* |
| `LlamaStackModelsHandler` | ✅ Clean | Return JSON | *(none - already clean)* |
| `LlamaStackVectorStoresHandler` | ✅ Clean | Return JSON | *(none - already clean)* |

---

## Refactoring Recommendations

### Phase 1: Low-Hanging Fruit (Quick Wins)
1. **Move pagination logic** from `PipelineRunsHandler` to repository
2. **Move state validation** from `TerminatePipelineRunHandler` / `RetryPipelineRunHandler` to repository
3. **Move K8s error classification** from `GetSecretsHandler` to repository

### Phase 2: Medium Complexity
4. **Move pipeline orchestration** from `CreatePipelineRunHandler` to repository
5. **Move ownership verification** from `resolveOwnedRun` to repository
6. **Move registry resolution** from `RegisterModelHandler` to repository

### Phase 3: High Complexity (S3 Handlers)
7. **Extract S3 credential resolution** to repository
8. **Extract S3 file operations** to repository (GetFile, UploadFile, ListFiles)
9. **Extract CSV validation and schema parsing** to repository

---

## Benefits of This Refactoring

1. **Testability**: Handlers become trivial to test (just JSON encoding/decoding and error mapping)
2. **Reusability**: Business logic in repositories can be used by other handlers or background jobs
3. **Clarity**: Clear separation makes the codebase easier to understand and maintain
4. **Type Safety**: Repositories return typed errors that handlers map to HTTP status codes
5. **Consistency**: All handlers follow the same pattern (extract params → call repository → return JSON)
6. **Security**: Business logic (RBAC, validation) lives in one place, not scattered across handlers

---

## Handler Pattern Template

### ✅ Correct Handler Pattern

```go
func (app *App) MyHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()
    
    // 1. Extract request parameters (path, query, body)
    resourceId := ps.ByName("id")
    var req models.MyRequest
    if err := decodeJSONRequest(r, &req, maxBytes); err != nil {
        app.badRequestResponse(w, r, err)
        return
    }
    
    // 2. Call ONE repository method
    result, err := app.repositories.MyRepo.DoOperation(ctx, resourceId, req)
    if err != nil {
        // 3. Map repository errors to HTTP status codes
        app.handleRepositoryError(w, r, err)
        return
    }
    
    // 4. Wrap result in envelope and return JSON
    response := MyEnvelope{Data: result}
    if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
        app.serverErrorResponse(w, r, err)
    }
}
```

### ❌ Anti-Pattern: Business Logic in Handler

```go
// ❌ DON'T DO THIS:
func (app *App) MyHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    // ... extract params ...
    
    // ❌ BAD: Creating K8s client in handler
    client, err := app.kubernetesClientFactory.GetClient(ctx)
    
    // ❌ BAD: K8s API calls in handler
    resource, err := client.Get(ctx, name, namespace)
    
    // ❌ BAD: Data transformation in handler
    transformed := make([]models.Output, 0, len(resource.Items))
    for _, item := range resource.Items {
        transformed = append(transformed, convertToOutput(item))
    }
    
    // ❌ BAD: Sorting in handler
    sort.Slice(transformed, func(i, j int) bool { /* ... */ })
    
    // ❌ BAD: Pagination arithmetic in handler
    start := (page - 1) * pageSize
    end := start + pageSize
    pagedResult := transformed[start:end]
    
    // This should ALL be in a repository method
}
```

---

## Error Mapping Pattern

Handlers should map **typed repository errors** to HTTP status codes:

### Repository Layer (Define Typed Errors)

```go
// repositories/errors.go
var (
    ErrResourceNotFound = errors.New("resource not found")
    ErrResourceForbidden = errors.New("access forbidden")
    ErrResourceConflict = errors.New("resource already exists")
    ErrInvalidInput = errors.New("invalid input")
    ErrServiceUnavailable = errors.New("external service unavailable")
)
```

### Handler Layer (Map Errors to HTTP)

```go
// api/errors.go
func (app *App) handleRepositoryError(w http.ResponseWriter, r *http.Request, err error) {
    switch {
    case errors.Is(err, repositories.ErrResourceNotFound):
        app.notFoundResponse(w, r)
    case errors.Is(err, repositories.ErrResourceForbidden):
        app.forbiddenResponse(w, r, "insufficient permissions")
    case errors.Is(err, repositories.ErrResourceConflict):
        app.conflictResponse(w, r, err.Error())
    case errors.Is(err, repositories.ErrInvalidInput):
        app.badRequestResponse(w, r, err)
    case errors.Is(err, repositories.ErrServiceUnavailable):
        app.serviceUnavailableResponse(w, r, err)
    default:
        app.serverErrorResponse(w, r, err)
    }
}
```

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize refactoring phases** based on complexity and impact
3. **Create shared repository error types** in `autox-core`
4. **Start with Phase 1** (low-hanging fruit) to establish the pattern
5. **Update BFF Go rule** in `.claude/rules/bff-go.md` to enforce this separation

---

## Related Documents

- [BFF Go Conventions](../../.claude/rules/bff-go.md)
- [Architecture Decision Records](../../.claude/rules/architecture.md)
- [Modular Architecture](../../.claude/rules/modular-architecture.md)
