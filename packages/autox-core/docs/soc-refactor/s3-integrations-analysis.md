# S3 Integrations Analysis — Separation of Concerns Refactor

## Overview

This document analyzes the S3 integration code across `automl` and `autorag` packages to identify what belongs in the integration layer versus what should move to the repository/business logic layer.

### Current Structure

Both packages follow a nearly identical pattern:

```
packages/{automl,autorag}/bff/internal/
├── integrations/s3/
│   ├── client.go              (~867 lines in automl, ~451 lines in autorag)
│   ├── client_factory.go      (~79 lines in automl, ~71 lines in autorag)
│   ├── client_test.go
│   └── s3mocks/client_mock.go
├── repositories/
│   ├── s3.go                  (~229 lines in automl, ~229 lines in autorag)
│   ├── s3_interface.go        (~28 lines in automl only)
│   └── s3_mock.go             (automl only)
└── api/
    └── s3_handler.go          (~815 lines in automl, ~821 lines in autorag)
```

### Key Observations

1. **Heavy CSV business logic in integrations/s3/** — `automl/client.go` contains ~400 lines of CSV schema inference logic (type detection, boolean detection, timestamp parsing, line normalization)
2. **Duplicate code** — automl and autorag have nearly identical `repositories/s3.go` files for credential extraction
3. **Clear integration layer** — S3 client factory, AWS SDK wrapping, endpoint validation, SSRF protection
4. **Mixed concerns in client.go** — Low-level S3 operations (GetObject, UploadObject) mixed with high-level CSV processing (GetCSVSchema)

---

## Classification Table

### integrations/s3/client.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| **S3Credentials struct** | 39-46 | ✅ STAY | Low-level credential container for S3 SDK |
| **ListObjectsOptions struct** | 48-54 (automl) | ✅ STAY | Direct mapping to S3 ListObjectsV2 API parameters |
| **ColumnSchema / CSVSchemaResult structs** | 56-67 (automl) | ❌ MOVE | Business domain models for CSV data analysis |
| **S3ClientInterface** | 69-76 (automl) | ⚠️ SPLIT | GetObject/UploadObject/ListObjects/ObjectExists are low-level (STAY), GetCSVSchema is business logic (MOVE) |
| **RealS3Client struct** | 78-82 | ✅ STAY | Thin wrapper around AWS SDK client |
| **buildS3AWSConfig()** | 94-100 | ✅ STAY | Direct AWS SDK configuration |
| **NewRealS3Client()** | 103-155 | ✅ STAY | Client instantiation with TLS, timeouts, endpoint validation |
| **GetObject()** | 158-186 | ✅ STAY | Direct S3 API wrapper with transfer manager |
| **UploadObject()** | 190-210 | ✅ STAY | Direct S3 API wrapper with conditional create |
| **ObjectExists()** | 224-248 | ✅ STAY | Direct S3 HeadObject wrapper |
| **ListObjects()** | 251-307 | ✅ STAY | Direct S3 ListObjectsV2 wrapper with response marshaling |
| **GetCSVSchema()** | 316-472 (automl) | ❌ MOVE | **Business logic**: CSV parsing, type inference, schema detection, validation rules |
| **validateAndNormalizeEndpoint()** | 520-581 | ✅ STAY | Security layer: SSRF protection, endpoint validation |
| **validateIPAddress()** | 591-618 | ✅ STAY | Security layer: IP blocklist validation |
| **isInternalHost()** | 492-504 | ✅ STAY | Security layer: Kubernetes service detection |
| **CSV helper functions** | 620-867 (automl) | ❌ MOVE | **Business logic**: normalizeLineEndings, inferColumnType, isBoolean, isTimestamp, isInteger, isNumber, collectBooleanValues, extractFirstLine, countLines |
| **cloneDefaultTransport()** | 478-483 | ✅ STAY | Low-level HTTP transport utility |

**Key Finding**: In `automl/client.go`, **~400 lines** (lines 316-867) are pure business logic that should move to repositories or a dedicated CSV processing module.

---

### integrations/s3/client_factory.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| **S3ClientFactory interface** | 10-12 | ✅ STAY | Factory pattern for client creation |
| **S3ClientOptions struct** | 22-39 (automl) | ✅ STAY | Infrastructure configuration (TLS, concurrency, retries) |
| **withDefaults()** | 41-55 | ✅ STAY | Default value application for infrastructure settings |
| **RealClientFactory** | 58-78 | ✅ STAY | Factory implementation with dev-mode guards |

**Verdict**: ✅ **All STAY** — Pure factory pattern for client instantiation.

---

### repositories/s3.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| **secretKeyEntry struct** | 17-20 | ✅ STAY | Helper for case-insensitive secret lookup (business logic for secret handling) |
| **newSecretLookup()** | 27-64 | ✅ STAY | **Business logic** for Kubernetes secret key resolution with case-insensitivity and collision detection |
| **S3Credentials type alias** | 68 (automl) | ✅ STAY | Re-export for convenience (avoids extra imports in repositories layer) |
| **ErrAmbiguousSecretKey** | 70 | ✅ STAY | Domain-specific error for secret validation |
| **S3Repository struct** | 72-76 | ✅ STAY | Repository pattern implementation |
| **GetS3Credentials()** | 81-141 | ✅ STAY | **Business logic**: Extract AWS_* fields from K8s secret, validate required fields, handle errors |
| **GetS3CredentialsFromDSPA()** | 148-228 | ✅ STAY | **Business logic**: Extract DSPA-specific fields, apply fallback logic, override endpoint/bucket from secret |

**Verdict**: ✅ **All STAY** — This is legitimate repository-layer business logic. It orchestrates Kubernetes secret retrieval (via integrations/kubernetes) and maps domain-specific conventions (AWS_* keys, DSPA spec) to S3Credentials. This is NOT low-level S3 client work.

---

### api/s3_handler.go

| Component | Lines | Classification | Rationale |
|-----------|-------|----------------|-----------|
| **resolvedS3 struct** | 40-43 | ✅ STAY | HTTP handler state container |
| **resolveS3Client()** | 54-183 | ⚠️ REVIEW | **Orchestration logic** combining credential resolution, client creation, bucket resolution, endpoint rewriting. This IS business logic but belongs in handlers for HTTP context. Consider extracting credential+bucket resolution to a repository method. |
| **isS3ConnectivityError()** | 190-207 | ✅ STAY | HTTP-layer error classification for user-facing responses |
| **GetS3FileHandler()** | 229-308 | ✅ STAY | HTTP handler routing to integration layer, error handling, streaming |
| **PostS3FileHandler()** | 328-466 | ⚠️ REVIEW | **Business logic embedded**: multipart parsing, CSV validation, collision resolution. Consider moving multipart/CSV validation to a repository method. |
| **resolveNonCollidingS3Key()** | 470-503 | ❌ MOVE | **Business logic**: Key collision resolution strategy. Should move to repositories (or a dedicated S3 repository method). |
| **splitS3ObjectPath() / splitNameAndExtension() / splitStemAndNextIndex()** | 505-536 | ❌ MOVE | **Business logic** helpers for key collision resolution. Move with resolveNonCollidingS3Key(). |
| **resolveCsvMultipartContentType()** | 558-586 | ⚠️ MOVE | **Business logic**: CSV-only upload validation. Could move to repositories or a validation module. |
| **sanitizeS3ResponseContentType()** | 591-609 | ✅ STAY | Security layer: sanitize untrusted S3 metadata for HTTP responses |
| **handleS3FileSchemaView()** | 620-684 | ✅ STAY | HTTP handler delegating to client.GetCSVSchema() (which should move to repositories) |
| **GetS3FilesHandler()** | 698-755 | ✅ STAY | HTTP handler delegating to client.ListObjects() |
| **validateGetS3FilesParams()** | 768-814 | ✅ STAY | HTTP-layer input validation |

**Key Finding**: ~150 lines of business logic in handlers should move to repositories:
- Key collision resolution (lines 470-536)
- CSV validation logic (lines 558-586)
- Credential+bucket resolution orchestration in resolveS3Client() (extract to repository)

---

## Violations of Separation of Concerns

### 1. **CSV Schema Inference in integrations/s3/client.go**

**Lines**: 316-867 (automl only, ~400 lines)

**Problem**: The S3 integration layer contains full CSV parsing, type inference, and schema detection logic. This is **domain business logic** for AutoML pipeline validation, not a low-level S3 operation.

**Impact**:
- Cannot reuse CSV schema logic without importing the entire S3 client
- Mixes data processing (CSV) with data transport (S3)
- autorag doesn't need this — it's AutoML-specific, yet lives in a supposedly generic S3 integration

**Proposed Move**: Extract to `repositories/csv_schema.go` or a new `dataprocessing/csv/` module.

```go
// repositories/csv_schema.go
type CSVSchemaService struct {
    s3Client s3int.S3ClientInterface
}

func (s *CSVSchemaService) InferSchemaFromS3Object(
    ctx context.Context,
    bucket, key string,
) (CSVSchemaResult, error) {
    // Current GetCSVSchema implementation moves here
}
```

---

### 2. **Key Collision Resolution in api/s3_handler.go**

**Lines**: 470-536 (automl and autorag)

**Problem**: `resolveNonCollidingS3Key()` and its helpers implement a **business rule** (how to generate unique keys when uploads collide). This is domain logic, not HTTP routing.

**Impact**:
- Cannot reuse collision resolution in other contexts (e.g., batch uploads, CLI tools)
- Business rule changes require editing HTTP handler code
- Unit testing requires HTTP handler setup

**Proposed Move**: Extract to `repositories/s3_upload_strategy.go`.

```go
// repositories/s3_upload_strategy.go
func ResolveNonCollidingKey(
    ctx context.Context,
    s3Client s3int.S3ClientInterface,
    bucket, requestedKey string,
    maxAttempts int,
) (string, error) {
    // Current resolveNonCollidingS3Key implementation
}
```

---

### 3. **CSV Validation in api/s3_handler.go**

**Lines**: 558-586

**Problem**: `resolveCsvMultipartContentType()` enforces a **business rule** (only CSV files are allowed). This is domain policy, not HTTP parsing.

**Impact**:
- Business rule is locked in HTTP handler code
- Cannot easily support other formats (e.g., Parquet) without modifying handlers
- Validation logic is repeated in multiple handlers

**Proposed Move**: Extract to `repositories/upload_validation.go` or fold into a repository upload method.

```go
// repositories/upload_validation.go
func ValidateCSVUpload(part *multipart.Part) (contentType string, err error) {
    // Current resolveCsvMultipartContentType implementation
}
```

---

### 4. **Credential+Bucket Resolution Orchestration**

**Lines**: api/s3_handler.go lines 54-183 (`resolveS3Client`)

**Problem**: The handler orchestrates:
1. Extracting identity from context
2. Choosing between secretName path vs DSPA path
3. Calling repositories.S3.GetS3Credentials*()
4. Applying bucket override security rules (DSPA bucket always wins, secretName bucket is overridable)
5. Dev-mode endpoint rewriting
6. Client creation

Steps 2-4 are **business logic** that should be in a repository method.

**Impact**:
- Business rules scattered across HTTP handler code
- Cannot reuse credential+bucket resolution in other contexts
- Testing requires HTTP handler harness

**Proposed Move**: Extract to `repositories/s3.go` as a new method.

```go
// repositories/s3.go
func (r *S3Repository) ResolveS3ClientAndBucket(
    ctx context.Context,
    k8sClient k8s.KubernetesClientInterface,
    namespace string,
    secretName string,
    bucketOverride string,
    identity *k8s.RequestIdentity,
) (*S3Credentials, string, error) {
    // Orchestration logic from resolveS3Client (credential + bucket resolution)
    // Returns (credentials, resolvedBucket, error)
}
```

Then the handler becomes:

```go
func (app *App) resolveS3Client(...) (*resolvedS3, bool) {
    creds, bucket, err := app.repositories.S3.ResolveS3ClientAndBucket(ctx, k8sClient, namespace, secretName, bucketOverride, identity)
    if err != nil { /* error handling */ }

    // Dev-mode endpoint rewrite (stays in handler — it's infrastructure wiring)
    if app.portForwardManager != nil { /* ... */ }

    s3Client, err := app.s3ClientFactory.CreateClient(creds)
    // ...
}
```

---

## Recommended Refactor Plan

### Phase 1: Extract CSV Schema Logic (AutoML only)

**From**: `automl/bff/internal/integrations/s3/client.go` (lines 316-867)  
**To**: `automl/bff/internal/repositories/csv_schema.go`

**Steps**:
1. Create `CSVSchemaService` struct wrapping an `S3ClientInterface`
2. Move `GetCSVSchema()` and all helper functions (normalizeLineEndings, inferColumnType, etc.)
3. Update `S3ClientInterface` to remove `GetCSVSchema()` (it's no longer a low-level S3 operation)
4. Update handlers to call `repositories.CSVSchema.InferSchemaFromS3Object()` instead of `s3Client.GetCSVSchema()`

**Impact**: Reduces `integrations/s3/client.go` from ~867 to ~470 lines, isolates CSV business logic.

---

### Phase 2: Extract Key Collision Resolution

**From**: `{automl,autorag}/bff/internal/api/s3_handler.go` (lines 470-536)  
**To**: `{automl,autorag}/bff/internal/repositories/s3_upload_strategy.go`

**Steps**:
1. Create `ResolveNonCollidingKey()` function in repositories/
2. Move helper functions (splitS3ObjectPath, splitNameAndExtension, splitStemAndNextIndex)
3. Update handlers to call repository function

**Impact**: Business rule is now reusable and testable without HTTP harness.

---

### Phase 3: Extract CSV Validation

**From**: `{automl,autorag}/bff/internal/api/s3_handler.go` (line 558)  
**To**: `{automl,autorag}/bff/internal/repositories/upload_validation.go`

**Steps**:
1. Create `ValidateCSVUpload()` function in repositories/
2. Update `PostS3FileHandler()` to call validation function

**Impact**: Business rule is decoupled from HTTP layer, easier to extend for other formats.

---

### Phase 4: Extract Credential+Bucket Resolution Orchestration

**From**: `{automl,autorag}/bff/internal/api/s3_handler.go` (lines 54-183)  
**To**: `{automl,autorag}/bff/internal/repositories/s3.go`

**Steps**:
1. Add `ResolveS3ClientAndBucket()` method to `S3Repository`
2. Move credential resolution, bucket override rules, and error handling
3. Keep endpoint rewriting and client creation in handler (infrastructure wiring)

**Impact**: Business logic is in repositories where it belongs, handlers become thinner routing layer.

---

## Summary Table: What Stays vs What Moves

| Component | Current Location | Stay/Move | New Location (if moved) |
|-----------|------------------|-----------|------------------------|
| S3Credentials, ListObjectsOptions | integrations/s3/ | ✅ STAY | — |
| S3ClientInterface (GetObject, Upload, List, ObjectExists) | integrations/s3/ | ✅ STAY | — |
| S3ClientInterface.GetCSVSchema() | integrations/s3/ | ❌ MOVE | repositories/csv_schema.go |
| CSV schema inference logic (~400 lines) | integrations/s3/client.go | ❌ MOVE | repositories/csv_schema.go |
| NewRealS3Client, buildS3AWSConfig | integrations/s3/ | ✅ STAY | — |
| Endpoint/IP validation (SSRF protection) | integrations/s3/ | ✅ STAY | — |
| S3ClientFactory, S3ClientOptions | integrations/s3/ | ✅ STAY | — |
| GetS3Credentials, GetS3CredentialsFromDSPA | repositories/s3.go | ✅ STAY | — |
| resolveNonCollidingS3Key + helpers | api/s3_handler.go | ❌ MOVE | repositories/s3_upload_strategy.go |
| resolveCsvMultipartContentType | api/s3_handler.go | ❌ MOVE | repositories/upload_validation.go |
| Credential+bucket orchestration in resolveS3Client | api/s3_handler.go | ⚠️ EXTRACT | repositories/s3.go (new method) |
| HTTP handlers (Get/Post/List) | api/s3_handler.go | ✅ STAY | — |

---

## Conclusion

**Current State**: ~550 lines of business logic are embedded in the integration and API layers.

**Target State**: Integration layer is a thin wrapper around AWS SDK (GetObject, UploadObject, ListObjects, endpoint validation). All business logic (CSV schema inference, key collision resolution, CSV validation, credential orchestration) lives in repositories/ where it can be:
- Tested independently
- Reused across handlers/contexts
- Extended without modifying low-level integration code

**Next Steps**: Implement Phase 1 (CSV schema extraction) in a proof-of-concept to validate the refactor pattern, then apply to remaining phases.
