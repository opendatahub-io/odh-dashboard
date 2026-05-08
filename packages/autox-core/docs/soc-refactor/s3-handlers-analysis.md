# S3 Handler Logic Analysis - Separation of Concerns

## Overview

This document analyzes S3-related handler logic across AutoML and AutoRAG BFF packages to identify what should remain in handlers (HTTP layer) versus what should move to repositories (business/data layer).

### Current Structure

Both packages follow a similar pattern:
- **Handlers layer** (`internal/api/*_handler.go`): HTTP request/response handling with embedded S3 business logic
- **Repositories layer** (`internal/repositories/`): Currently contains only S3 credential extraction from Kubernetes secrets
- **Integration layer** (`internal/integrations/s3/`): S3 client abstractions (GetObject, UploadObject, ListObjects, etc.)

### Design Principle

**Layered Architecture:**
- **handlers/** = HTTP concerns only (routing, parameter parsing, status codes, response formatting, multipart handling)
- **repositories/** = Business logic including S3 operations, data transformations, validation
- **integrations/** = External service clients (S3, Kubernetes, Pipeline Server)

---

## S3 Handler Analysis

### AutoML: `packages/automl/bff/internal/api/s3_handler.go`

| Handler Function | Current Responsibilities | STAY (HTTP) | MOVE (Business/S3) |
|-----------------|-------------------------|-------------|-------------------|
| `resolveS3Client` | • Extract namespace/identity from context<br>• Call repository to get credentials<br>• Create S3 client via factory<br>• Resolve bucket with security logic<br>• Handle dev mode port forwarding<br>• HTTP error responses | • Context extraction<br>• HTTP error responses | • Bucket resolution security logic<br>• Port forwarding logic<br>• S3 client creation orchestration |
| `GetS3FileHandler` | • Parse query params (secretName, bucket)<br>• Validate path parameter<br>• Call resolveS3Client<br>• **Call s3.client.GetObject**<br>• **Content-Type sanitization**<br>• **Security headers (Content-Disposition, nosniff)**<br>• Stream response with io.Copy<br>• HTTP error mapping (404, 403, 503) | • Query param extraction<br>• HTTP error mapping<br>• Response streaming<br>• HTTP headers | • S3 GetObject operation<br>• Content-Type sanitization logic<br>• Security header determination<br>• Connectivity error detection |
| `handleS3FileSchemaView` | • **Call s3.client.GetCSVSchema**<br>• **Parse CSV validation errors**<br>• Build JSON response envelope<br>• HTTP error mapping | • JSON response writing | • CSV schema extraction<br>• CSV validation<br>• Error classification |
| `PostS3FileHandler` | • Parse/validate secretName, key, bucket<br>• **Resolve collision-free S3 key**<br>• Set up MaxBytesReader for request body<br>• Parse multipart/form-data<br>• **Find 'file' part in multipart**<br>• **Validate CSV content type**<br>• **Call s3.client.UploadObject**<br>• HTTP error mapping (409, 413, 403) | • Query/path param extraction<br>• Multipart boundary parsing<br>• HTTP error mapping<br>• MaxBytesReader setup | • Collision resolution logic<br>• File part extraction<br>• Content-Type validation<br>• S3 upload operation |
| `resolveNonCollidingS3Key` | • **Check ObjectExists with S3 client**<br>• **Filename collision resolution algorithm**<br>• **Loop with maxCollisionAttempts** | None (pure business logic) | **ENTIRE FUNCTION** |
| `GetS3FilesHandler` | • Validate query params<br>• **Call s3.client.ListObjects**<br>• Build response envelope<br>• HTTP error mapping | • Query param validation<br>• Response envelope creation<br>• HTTP error mapping | • S3 ListObjects operation<br>• Pagination logic |
| `validateGetS3FilesParams` | • Parse limit/path/search/next params<br>• Validate DNS-1123 subdomain<br>• Validate string lengths | **ENTIRE FUNCTION** | None (pure input validation) |

**Helper Functions (Pure Business Logic - Should Move):**

| Function | Classification | Rationale |
|----------|---------------|-----------|
| `isS3ConnectivityError` | MOVE | Network error classification logic, not HTTP-specific |
| `s3ConnectivityErrorMessage` | MOVE | User-facing message generation, business logic |
| `sanitizeS3ResponseContentType` | MOVE | Content-Type normalization security logic |
| `s3GetResponseTypeAllowsInlineViewing` | MOVE | Security policy logic for inline viewing |
| `resolveCsvMultipartContentType` | MOVE | CSV validation logic |
| `splitS3ObjectPath` | MOVE | String manipulation utility |
| `splitNameAndExtension` | MOVE | String manipulation utility |
| `splitStemAndNextIndex` | MOVE | Filename parsing logic |
| `isS3PostRequestBodyTooLarge` | STAY | HTTP-specific MaxBytesError check |
| `rejectDeclaredOversizedS3Post` | STAY | HTTP middleware for Content-Length validation |

---

### AutoRAG: `packages/autorag/bff/internal/api/s3_handler.go`

| Handler Function | Current Responsibilities | STAY (HTTP) | MOVE (Business/S3) |
|-----------------|-------------------------|-------------|-------------------|
| `resolveS3Client` | • Extract identity/namespace from context<br>• Branch on secretName vs DSPA path<br>• Call repository to get credentials<br>• **Bucket resolution with security model**<br>• Dev mode port forwarding<br>• Create S3 client<br>• HTTP error responses | • Context extraction<br>• HTTP error responses | • Credential resolution orchestration<br>• Bucket security logic<br>• Port forwarding logic<br>• S3 client creation |
| `GetS3FileHandler` | • Parse/validate secretName, key params<br>• Call resolveS3Client<br>• **Call s3.client.GetObject**<br>• **Content-Type sanitization**<br>• **Security headers (attachment, nosniff)**<br>• Stream response with io.Copy<br>• HTTP error mapping | • Query param parsing<br>• HTTP error mapping<br>• Response streaming<br>• HTTP headers | • S3 GetObject operation<br>• Content-Type sanitization<br>• Security header logic |
| `PostS3FileHandler` | • Parse/validate secretName, key, bucket<br>• **Resolve collision-free S3 key**<br>• Set up MaxBytesReader<br>• Parse multipart/form-data<br>• **Find 'file' part**<br>• **Sanitize Content-Type**<br>• **Call s3.client.UploadObject**<br>• HTTP error mapping | • Multipart parsing<br>• MaxBytesReader setup<br>• HTTP error mapping | • Collision resolution<br>• File part extraction<br>• Content-Type sanitization<br>• S3 upload operation |
| `GetS3FilesHandler` | • Validate parameters<br>• **Call s3.client.ListObjects**<br>• Build response envelope<br>• HTTP error mapping | • Parameter validation<br>• Response envelope<br>• HTTP error mapping | • S3 ListObjects operation |
| `getS3CredentialsFromSecret` | • Call repository.S3.GetS3Credentials<br>• Map K8s errors to HTTP errors | • HTTP error mapping | • Error classification logic |
| `validateGetS3FilesHandlerParameters` | • Parse/validate all query params | **ENTIRE FUNCTION** | None |

**Helper Functions:**

| Function | Classification | Rationale |
|----------|---------------|-----------|
| `isS3ConnectivityError` | MOVE | Network error classification |
| `s3ConnectivityErrorMessage` | MOVE | User-facing message generation |
| `isInlineDangerousContentType` | MOVE | Security policy logic |
| `sanitizeUploadContentType` | MOVE | Content-Type normalization |
| `resolveNonCollidingS3Key` | MOVE | Collision resolution algorithm |
| `splitS3ObjectPath` | MOVE | String utility |
| `splitNameAndExtension` | MOVE | String utility |
| `splitStemAndNextIndex` | MOVE | Filename parsing |
| `isS3PostRequestBodyTooLarge` | STAY | HTTP-specific error check |
| `rejectDeclaredOversizedS3Post` | STAY | HTTP middleware |

---

## Key Violations of Separation of Concerns

### 1. **S3 API Calls Directly in Handlers**

**Problem:** Handlers call `s3.client.GetObject()`, `UploadObject()`, `ListObjects()`, `ObjectExists()`, `GetCSVSchema()` directly.

**Why it's wrong:**
- Handlers are tightly coupled to S3 implementation details
- Cannot test handler HTTP logic without mocking S3
- Business logic (collision resolution, content validation) mixed with HTTP concerns
- Violates single responsibility principle

**Example (AutoML GetS3FileHandler):**
```go
// Line 264-276 - S3 API call in handler
objectReader, contentType, err := s3.client.GetObject(ctx, s3.bucket, key)
if err != nil {
    var noSuchKey *types.NoSuchKey
    var notFound *types.NotFound
    if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
        app.errorResponse(w, r, &integrations.HTTPError{
            StatusCode: http.StatusNotFound,
            // ...
        })
        return
    }
    // ... more error handling
}
```

**Should be:**
```go
// Handler only handles HTTP concerns
result, err := app.repositories.S3.GetFile(ctx, s3ResolvedContext, key)
if err != nil {
    // Map repository error to HTTP status
    app.handleS3Error(w, r, err)
    return
}
app.streamFileResponse(w, result)
```

---

### 2. **Business Logic Embedded in Handlers**

**Problem:** Functions like `resolveNonCollidingS3Key`, `sanitizeS3ResponseContentType`, `isS3ConnectivityError` are pure business logic but live in handler files.

**Example (AutoML PostS3FileHandler):**
```go
// Lines 359-373 - Collision resolution in handler
resolvedKey, err := resolveNonCollidingS3Key(metadataCtx, s3.client, bucket, key, app.effectivePostS3CollisionAttempts())
if err != nil {
    if errors.Is(err, ErrMaxCollisionsExceeded) {
        app.conflictResponse(w, r,
            fmt.Sprintf("unable to find unique filename after %d attempts; try a different base name",
                app.effectivePostS3CollisionAttempts()))
        return
    }
    // ...
}
```

This entire collision resolution logic (including helper functions `splitS3ObjectPath`, `splitNameAndExtension`, `splitStemAndNextIndex`) should be in a repository method:
```go
resolvedKey, err := app.repositories.S3.ResolveNonCollidingKey(ctx, s3Client, bucket, key)
```

---

### 3. **Content-Type Sanitization as Business Logic**

**Problem:** `sanitizeS3ResponseContentType`, `resolveCsvMultipartContentType`, `sanitizeUploadContentType` enforce security policies but are handler-level functions.

**Why it matters:**
- These implement security policies (prevent XSS via Content-Type)
- Should be testable independently of HTTP layer
- Reusable across multiple handlers

**Example (AutoRAG sanitizeUploadContentType):**
```go
// Lines 626-640 - Security policy logic in handler
func sanitizeUploadContentType(v string) string {
    v = strings.TrimSpace(v)
    if v == "" {
        return "application/octet-stream"
    }
    mediaType, _, err := mime.ParseMediaType(v)
    if err != nil {
        return "application/octet-stream"
    }
    mediaType = strings.ToLower(mediaType)
    if _, ok := allowedS3UploadMediaTypes[mediaType]; ok {
        return mediaType
    }
    return "application/octet-stream"
}
```

Should be a repository method that handlers call.

---

### 4. **Multipart File Extraction Logic**

**Problem:** PostS3FileHandler manually iterates multipart parts to find the 'file' part.

**Example (AutoRAG lines 410-437):**
```go
var filePart *multipart.Part
for {
    part, nextErr := mr.NextPart()
    if nextErr == io.EOF {
        break
    }
    if nextErr != nil {
        if isS3PostRequestBodyTooLarge(nextErr) {
            app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
            return
        }
        app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", nextErr))
        return
    }
    if part.FormName() == "file" {
        filePart = part
        break
    }
    // Discard non-file parts
    _, copyErr := io.Copy(io.Discard, part)
    // ...
}
```

**Why it's borderline:**
- Multipart parsing IS HTTP-specific (STAY in handler)
- BUT the logic of "find the 'file' part" could be a handler helper
- The subsequent validation and upload should be in repository

**Better approach:**
```go
filePart, err := extractFilePartFromMultipart(mr) // Handler helper
if err != nil {
    app.handleMultipartError(w, r, err)
    return
}
uploadResult, err := app.repositories.S3.UploadFile(ctx, s3Client, bucket, resolvedKey, filePart)
```

---

### 5. **CSV Schema Extraction**

**Problem:** `handleS3FileSchemaView` calls `s3.client.GetCSVSchema()` and parses CSV-specific errors.

**Example (AutoML lines 620-684):**
```go
schemaResult, err := s3.client.GetCSVSchema(ctx, s3.bucket, key)
if err != nil {
    // ... NoSuchKey handling ...
    
    errMsg := err.Error()
    if strings.Contains(errMsg, "CSV file must contain at least one complete line") ||
        strings.Contains(errMsg, "CSV file is empty") ||
        strings.Contains(errMsg, "CSV file has no columns") ||
        // ... 5 more CSV validation checks
```

**Why it's wrong:**
- CSV validation logic is business logic
- String-matching error messages is fragile
- Should be a repository method that returns structured errors

**Should be:**
```go
schema, err := app.repositories.S3.GetCSVSchema(ctx, s3Client, bucket, key)
if err != nil {
    app.handleS3Error(w, r, err) // Maps repository errors to HTTP
    return
}
app.WriteJSON(w, http.StatusOK, schema, nil)
```

---

## What Should STAY in Handlers

### HTTP Layer Concerns (Properly Belong in Handlers)

1. **Request Parsing**
   - Extract query parameters (`r.URL.Query().Get()`)
   - Extract path parameters (`ps.ByName()`)
   - Parse request body (JSON decoding, multipart parsing)
   - URL unescape path parameters

2. **HTTP Status Code Mapping**
   - Map repository errors to HTTP status codes
   - Call `app.badRequestResponse()`, `app.notFoundResponse()`, `app.serverErrorResponse()`, etc.

3. **Response Writing**
   - Set HTTP headers (Content-Type, Content-Disposition)
   - Stream response body (`io.Copy(w, reader)`)
   - Write JSON envelopes (`app.WriteJSON()`)
   - Set HTTP status codes (`w.WriteHeader()`)

4. **Middleware Integration**
   - Extract values from `r.Context()` (namespace, identity, DSPA config)
   - Apply middleware wrappers (`rejectDeclaredOversizedS3Post`)

5. **HTTP-Specific Validation**
   - Check `Content-Length` header for oversized requests
   - Validate multipart boundary exists
   - DNS-1123 subdomain validation (Kubernetes naming convention for secretName)

6. **Request Body Size Limits**
   - `http.MaxBytesReader()` to cap request body
   - Detect `*http.MaxBytesError`

---

## What Should MOVE to Repositories

### Business/Data Layer Concerns (Should Move to Repositories)

1. **S3 Operations**
   - `GetObject()` - Fetch file from S3
   - `UploadObject()` - Upload file to S3
   - `ListObjects()` - List S3 bucket contents
   - `ObjectExists()` - Check if S3 object exists
   - `GetCSVSchema()` - Extract CSV schema metadata

2. **Business Logic**
   - Collision resolution algorithm (`resolveNonCollidingS3Key`)
   - Bucket resolution with security model (DSPA vs secretName path)
   - Content-Type sanitization and security policies
   - CSV validation and error classification
   - Connectivity error detection
   - Port forwarding orchestration (dev mode)

3. **Data Transformations**
   - Filename parsing (stem, extension, trailing numbers)
   - S3 object path manipulation
   - Content-Type normalization

4. **Security Policies**
   - Determine if Content-Type is dangerous for inline viewing
   - Allowlist for upload media types
   - Content-Disposition header logic

5. **Error Classification**
   - Map S3 errors to domain errors (NotFound, AccessDenied, ConnectivityError)
   - CSV validation error parsing

---

## Proposed Repository Interface

### New S3 Repository Methods (Beyond Current Credential Extraction)

```go
type S3RepositoryInterface interface {
    // Existing methods
    GetS3Credentials(...)
    GetS3CredentialsFromDSPA(...)
    
    // NEW: File operations
    GetFile(ctx context.Context, client S3ClientInterface, bucket, key string) (*S3FileResult, error)
    GetCSVSchema(ctx context.Context, client S3ClientInterface, bucket, key string) (*CSVSchemaResult, error)
    
    // NEW: Upload with collision resolution
    UploadFile(ctx context.Context, client S3ClientInterface, bucket, requestedKey string, 
               reader io.Reader, contentType string, maxCollisionAttempts int) (*S3UploadResult, error)
    
    // NEW: List operations
    ListFiles(ctx context.Context, client S3ClientInterface, bucket string, 
              opts ListObjectsOptions) (*S3ListResult, error)
    
    // NEW: Utilities
    ResolveNonCollidingKey(ctx context.Context, client S3ClientInterface, bucket, key string, 
                           maxAttempts int) (string, error)
    SanitizeContentType(raw string, mode ContentTypeMode) string
    IsConnectivityError(err error) bool
}

// Return types carry business data, not HTTP concerns
type S3FileResult struct {
    Reader      io.ReadCloser
    ContentType string
    RequiresAttachmentDisposition bool
}

type S3UploadResult struct {
    ResolvedKey string
    Uploaded    bool
}

type CSVSchemaResult struct {
    Columns       []string
    ParseWarnings []string
}

type S3ListResult struct {
    Files      []S3FileInfo
    NextToken  string
}
```

---

## Migration Strategy

### Phase 1: Extract Pure Business Logic Functions
- Move string utilities (splitS3ObjectPath, splitNameAndExtension, etc.) to repository package
- Move content-type sanitization functions
- Move error classification functions
- Keep handlers calling them initially (low-risk refactor)

### Phase 2: Create Repository Methods for S3 Operations
- Implement `GetFile()`, `UploadFile()`, `ListFiles()`, `GetCSVSchema()` in repository
- Keep S3 client calls in handlers initially (parallel implementation)
- Add comprehensive tests for repository methods

### Phase 3: Migrate Handlers to Use Repositories
- Update handlers to call repository methods instead of S3 client directly
- Remove direct S3 client usage from handlers
- Simplify handler error mapping (repository returns domain errors)

### Phase 4: Consolidate Credential Resolution
- Move S3 client creation orchestration to repository
- Handlers pass context/params, receive ready-to-use repository methods

---

## Benefits of Refactoring

1. **Testability**
   - Test business logic (collision resolution, CSV validation) without HTTP mocking
   - Test HTTP layer (routing, error mapping) without S3 mocking

2. **Reusability**
   - S3 operations can be reused across handlers (e.g., GetFile used by both GET and schema view)
   - Content-Type sanitization reused for uploads and downloads

3. **Maintainability**
   - Clear boundary: handlers do HTTP, repositories do business logic
   - Changes to S3 operations don't require touching HTTP layer

4. **Single Responsibility**
   - Handlers: HTTP request/response transformation
   - Repositories: S3 data operations and business rules
   - Integrations: S3 client abstractions

5. **Domain Error Handling**
   - Repositories return structured domain errors (NotFoundError, AccessDeniedError, ConnectivityError)
   - Handlers map domain errors to HTTP status codes (simple switch/if-else)

---

## Conclusion

**Current State:** S3 handlers are doing too much — they handle HTTP concerns AND orchestrate S3 operations AND implement business logic (collision resolution, content validation, security policies).

**Target State:** 
- **Handlers:** Parse HTTP requests → call repository → map errors → write HTTP responses
- **Repositories:** Orchestrate S3 operations, implement business rules, return domain data/errors
- **Integrations:** Thin S3 client wrappers

**Next Steps:**
1. Create repository interface with new methods
2. Implement repository methods with existing logic from handlers
3. Write comprehensive repository tests
4. Migrate handlers one at a time
5. Remove S3 client direct usage from handlers
