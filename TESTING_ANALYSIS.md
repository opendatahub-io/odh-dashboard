# AutoRAG/AutoML Testing Analysis
## RHOAIENG-58993

Date: 2026-04-21
Analyst: Claude Code

---

## Executive Summary

Analysis of `packages/autorag/contract-tests/__tests__/testAutoRagContract.test.ts` reveals:
- **Total tests**: 111
- **Proper contract tests** (using `toMatchContract()`): 45 (~40%)
- **Business logic/manual validation tests**: 66 (~60%)

The contract test file is **misnamed** and contains a significant amount of business logic testing that belongs in dedicated unit tests.

---

## Phase 1 Analysis: Contract Tests Categorization

### KEEP (Proper Contract Tests) - ~45 tests

These tests properly validate API responses against OpenAPI schemas using `toMatchContract()`:

#### Health Check (1 test)
- Lines 27-30: Basic health check (though missing schema validation)

#### User Endpoint (1 test)
- Lines 34-40: GET /api/v1/user with schema validation

#### Namespaces (1 test)
- Lines 44-47: GET /api/v1/namespaces (minimal validation, should add schema)

#### LSD Models (2 tests)
- Lines 52-60: GET /api/v1/lsd/models - proper schema validation
- Error cases with schema validation

#### LSD Vector Store Providers (2 tests)  
- Lines 128-136: GET /api/v1/lsd/vector-store-providers - proper schema validation
- Error cases with schema validation

#### Secrets Endpoint (3 tests)
- Lines 253-261: GET /api/v1/secrets (all secrets)
- Lines 263-271: GET /api/v1/secrets?type=storage
- Lines 273-282: GET /api/v1/secrets?type=lls

#### S3 File Endpoint (2 tests)
- Lines 567-576: GET /api/v1/s3/file - successful download with schema validation
- Lines 698-702: Bucket parameter fallback with schema validation

#### S3 Files Endpoint (multiple tests)
- Success cases with schema validation for listing files

#### Pipeline Runs (multiple tests)
- Lines 1072-1078: GET /api/v1/pipeline-runs with schema validation
- Lines 1122-1130: GET /api/v1/pipeline-runs/:id with schema validation
- Lines 1144-1159: POST /api/v1/pipeline-runs with schema validation
- Lines 1257-1265: POST /api/v1/pipeline-runs/:id/terminate with schema validation
- Lines 1289-1297: POST /api/v1/pipeline-runs/:id/retry with schema validation

#### S3 Upload (1 test)
- Lines 1506-1518: POST /api/v1/s3/file with schema validation

### MOVE TO UNIT TESTS (Business Logic) - ~66 tests

These tests validate business rules, data transformations, and BFF behavior. They should be moved to appropriate unit test locations:

#### 1. Manual Structure Validation (REDUNDANT) - ~15 tests
**Location**: Remove or consolidate into unit tests
**Examples**:
- Lines 62-81: "should return models with expected data structure" - manually checks model object structure
- Lines 138-164: "should return vector store providers with expected data structure" - redundant manual validation
- Lines 168-181: "should return a valid array in vector_store_providers field" - redundant array validation
- Lines 389-417: "Field Type Validation" - manually validates field types (redundant with schema validation)
- Lines 512-525: "should return data as object, not array" - redundant type validation
- Lines 1007-1016: "should return response with expected S3 list objects structure" - manual structure validation

**Action**: **DELETE** these tests - if `toMatchContract()` works correctly, manual validation is unnecessary.

#### 2. Secret Sanitization Logic (BUSINESS LOGIC) - ~4 tests
**Move to**: `packages/autorag/bff/internal/api/__tests__/secrets_sanitization_test.go`
**Lines 420-526**: "Secret Value Sanitization" tests
- Lines 421-462: "should return actual values only for AWS_S3_BUCKET keys"
- Lines 464-489: "should sanitize all secret values except AWS_S3_BUCKET"  
- Lines 491-510: "should only allow uppercase AWS_S3_BUCKET key"

**Rationale**: These test the BFF's secret sanitization business rules (AWS_S3_BUCKET redaction logic), not the API contract.

#### 3. Parameter Fallback Behavior (BFF LOGIC) - ~4 tests
**Move to**: `packages/autorag/bff/internal/api/__tests__/s3_parameter_fallback_test.go`
**Examples**:
- Lines 692-714: S3 File - Bucket parameter fallback from secret's AWS_S3_BUCKET
- Lines 704-713: S3 File - Bucket query parameter overrides secret's AWS_S3_BUCKET
- Lines 864-883: S3 Files - Similar bucket parameter fallback tests

**Rationale**: These test complex BFF parameter resolution logic, not the API contract.

#### 4. Display Name Length Limits (BUSINESS RULE) - ~2 tests
**Move to**: `packages/autorag/bff/internal/api/__tests__/pipeline_run_validation_test.go`
**Lines 1183-1214**:
- Line 1183: "display_name 250 chars accepted"
- Line 1200: "display_name 251 chars rejected"

**Rationale**: These test business rule validation (max length constraints), not the OpenAPI schema compliance.

#### 5. Error Cases (PARTIALLY KEEP) - ~40 tests
**Status**: Most error case tests are VALID contract tests and should KEEP using `toMatchContract()` with error response schemas.
**Examples of VALID contract tests**:
- Lines 85-124: Missing/invalid query parameters return 400
- Lines 184-223: Missing/invalid parameters for vector stores
- Lines 529-561: Error cases for secrets endpoint
- Lines 578-689: Error cases for S3 file operations

**Action**: KEEP these but ensure they all use `toMatchContract()` with the error response schema reference.

#### 6. Optional Field Handling (SCHEMA VALIDATION) - ~6 tests
**Status**: KEEP in contract tests
**Lines 284-385**: Optional Fields tests
- Lines 285-302: displayName from annotation
- Lines 304-321: description from annotation  
- Lines 323-339: omit displayName/description when annotations absent
- Lines 342-361: include type field when recognized
- Lines 363-385: omit type field when not recognized

**Action**: These are valid contract tests - they validate that optional fields behave according to the OpenAPI schema.

---

## Phase 2-4: Missing Unit Tests Identified

### Frontend Hooks - Missing 3 Tests
**Location**: `packages/autorag/frontend/src/app/hooks/__tests__/`

**Missing**:
1. `useAutoragResults.spec.ts` - test AutoRAG pattern evaluation results fetching
2. `usePatternEvaluationResults.spec.ts` - test pattern-specific evaluation data
3. `usePreferredNamespaceRedirect.spec.ts` - test namespace navigation logic

**Existing** (good patterns to follow):
- `useNotification.spec.tsx`
- `usePipelineDefinitions.spec.ts`
- `usePipelineRuns.spec.ts`

### Frontend API Layer - Missing 3 Test Files
**Location**: `packages/autorag/frontend/src/app/api/__tests__/` (directory needs creation)

**Missing**:
1. `pipelines.spec.ts` - test pipeline creation, retrieval, deletion
2. `s3.spec.ts` - test S3 file upload, download, listing
3. `k8s.spec.ts` - test Kubernetes secret management

### Frontend Utilities - Missing 2 Tests
**Location**: `packages/autorag/frontend/src/app/utilities/__tests__/`

**Missing**:
1. `schema.spec.ts` - test schema transformation utilities
2. `secretValidation.spec.ts` - test secret validation logic (CRITICAL for security)

**Existing** (good patterns to follow):
- `pipelineServerEmptyState.spec.ts`
- `utils.spec.ts`

### Frontend Component - Missing 1 Test
**Location**: `packages/autorag/frontend/src/app/components/configure/__tests__/` (directory needs creation)

**Missing**:
1. `EvaluationTemplateModal.spec.tsx` - test evaluation template selection modal

---

## Phase 5: BFF Test Issues

### Missing Critical Test
**Location**: `packages/autorag/bff/internal/api/`

**CRITICAL SECURITY GAP**:
- `s3_upload_limit.go` (1659 bytes, lines) - **NO TEST EXISTS**
- This file implements S3 upload size limits (security-critical)
- **MUST** create `s3_upload_limit_test.go`

### Poorly Structured Test to Refactor
**File**: `packages/autorag/bff/internal/api/secrets_handler_test.go`
**Lines**: 1402-1612 (210 lines, ends at EOF)
**Function**: `TestGetSecretsHandler_DoesNotLogCredentials`

**Problem**: Combines 4 different test scenarios in one 210-line test:
1. Successful request logging (should not log credentials)
2. K8s error logging (should not log credentials)
3. Forbidden error logging (should not log credentials)
4. Response body sanitization (credentials redacted in response)

**Impact**:
- Violates single responsibility principle
- Makes failures ambiguous (which scenario failed?)
- Complex nested setup duplicated for each sub-test
- Difficult to maintain

**Required Refactoring**: Split into 4 separate focused tests:
```go
func TestGetSecretsHandler_DoesNotLogCredentials_SuccessfulRequest(t *testing.T) { ... }
func TestGetSecretsHandler_DoesNotLogCredentials_K8sError(t *testing.T) { ... }
func TestGetSecretsHandler_DoesNotLogCredentials_ForbiddenError(t *testing.T) { ... }
func TestGetSecretsHandler_SanitizesResponseBodyCredentials(t *testing.T) { ... }
```

---

## Recommendations Summary

### Phase 1: Refactor Contract Tests
1. **DELETE** redundant manual structure validation tests (~15 tests)
2. **MOVE** business logic tests to unit tests:
   - Secret sanitization → `secrets_sanitization_test.go`
   - Parameter fallback → `s3_parameter_fallback_test.go`
   - Display name limits → `pipeline_run_validation_test.go`
3. **KEEP** proper contract tests that use `toMatchContract()` (~45 tests)
4. **ENSURE** all error cases use `toMatchContract()` with error response schemas

**Expected Result**: Contract test file reduced from 1519 lines to ~600-700 lines, focused solely on OpenAPI schema validation.

### Phase 2-4: Add Missing Frontend Tests
1. Add 3 hook tests following existing patterns
2. Add 3 API layer tests (create new `__tests__` directory)
3. Add 2 utility tests (schema, secretValidation)
4. Add 1 component test for EvaluationTemplateModal

**Expected Result**: Comprehensive frontend test coverage following project standards.

### Phase 5: Fix BFF Tests
1. **CREATE** `s3_upload_limit_test.go` (CRITICAL SECURITY)
2. **REFACTOR** `TestGetSecretsHandler_DoesNotLogCredentials` into 4 focused tests
3. Follow Go testing best practices: one test, one assertion

**Expected Result**: Complete BFF test coverage with clear, maintainable tests.

### Phase 6: Apply to AutoML
Apply same analysis and refactoring patterns to `packages/automl/` package.

---

## Testing Standards References

All new tests must follow:
- `.claude/rules/unit-tests.md` - Unit test patterns
- `.claude/rules/testing-standards.md` - Testing strategy
- `.claude/rules/contract-tests.md` - Contract test guidelines
- `.claude/rules/bff-go.md` - Go BFF testing patterns

---

## File Size Impact Estimation

### Contract Test File
- **Current**: 1519 lines
- **After Phase 1**: ~600-700 lines (~53% reduction)
- **Rationale**: Removing ~66 business logic tests and redundant validations

### New Files Created
- Frontend: ~8 new test files
- BFF: ~4 new test files (3 moved from contract tests + 1 new s3_upload_limit_test.go)
- BFF refactor: 1 file split into 4 focused tests

---

## AutoML Package Notes

The Jira states: "Examples in this ticket are from AutoRAG, but the same issues and patterns apply to AutoML."

**Action Required**: After completing AutoRAG, perform identical analysis and refactoring for `packages/automl/`:
1. Analyze `packages/automl/contract-tests/__tests__/testAutoMlContract.test.ts`
2. Apply same categorization (KEEP/MOVE/DELETE)
3. Create missing unit tests for hooks, API, utilities, components
4. Fix BFF tests following same patterns

Expected to find similar issues:
- Contract tests containing business logic
- Missing hook/API/utility tests  
- Missing s3_upload_limit test (if AutoML has same file)
- Poorly structured BFF tests

---

## Next Steps

1. ✅ **COMPLETE**: Analysis documented
2. **TODO**: Begin Phase 1 - Move business logic tests to unit tests
3. **TODO**: Begin Phase 2-4 - Create missing frontend tests
4. **TODO**: Begin Phase 5 - Create/refactor BFF tests
5. **TODO**: Apply to AutoML package
6. **TODO**: Run all tests and validate coverage improvements
