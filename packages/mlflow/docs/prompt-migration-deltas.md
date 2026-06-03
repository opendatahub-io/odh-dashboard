# Prompt BFF Migration: Differences from Gen-AI

This document tracks every intentional difference between the MLflow BFF prompt
implementation and the gen-ai BFF prompt code it was ported from.

**Source:** `packages/gen-ai/bff/` (prompt-related files)
**Target:** `packages/mlflow/bff/` (this package)
**Ticket:** RHOAIENG-65184

---

## Route Paths

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `/api/v1/mlflow/prompts` | `/api/v1/prompts` | No redundant `/mlflow/` prefix — the BFF itself is the mlflow service. The `/mlflow` prefix exists at the mux level (`PathPrefix`), not in route constants. |
| `/api/v1/mlflow/prompts/:name` | `/api/v1/prompts/:name` | Same |
| `/api/v1/mlflow/prompts/:name/versions` | `/api/v1/prompts/:name/versions` | Same |
| `/api/v1/mlflow/prompts/:name/versions/:version` | `/api/v1/prompts/:name/versions/:version` | Same |

## Namespace Parameter

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `?namespace=<ns>` query param | `?workspace=<ns>` query param | MLflow BFF uses `workspace` as its namespace concept. The `AttachWorkspace` middleware reads `?workspace=` and stores it in context under `WorkspaceQueryParameterKey`. Gen-ai uses `AttachNamespace` with `?namespace=`. |

Handler and repository code is unaffected — neither reads the param directly. The middleware injects the MLflow client (already scoped to the namespace) into the context.

## Middleware Chain

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `AttachNamespace → RequireAccessToService → AttachMLflowClient` | `AttachWorkspace → RequireValidIdentity → AttachMLflowClient` | Different middleware names, same purpose. Both exist pre-migration in their respective BFFs. |

## Error Types

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `integrations.HTTPError` with `ErrorResponse{Code, Message}` | `api.HTTPError` with `ErrorPayload{Code, Message}` | Each BFF has its own error envelope type. Handler code calls the same method names (`badRequestResponse`, `handleMLflowClientError`, etc.) but they resolve to different struct types. |

## `conflictResponse` Helper

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| Already existed in gen-ai errors | Added to `errors.go` in this PR | MLflow BFF didn't have a 409 helper until prompts needed one for `create_only` conflict. Uses MLflow BFF's `ErrorPayload` type. |

## `Location` Header (POST response)

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `/api/v1/mlflow/prompts/<name>?version=<n>` | `/api/v1/prompts/<name>?workspace=<ws>&version=<n>` | MLflow BFF includes `workspace` in the Location header so the URL is directly followable. Gen-ai omits `namespace` (a pre-existing gap). |

## Test Framework

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| Ginkgo/Gomega (`Describe`/`It`/`Expect`) | Standard `testing.T` + testify (`assert`/`require`) | Each BFF uses its own test framework. MLflow BFF unit tests follow the pattern established by `experiments_handler_test.go`. |
| `MakeRequest` / `TestRequest` helpers | `httptest.NewRequest` + `requestWithMLflowClient` | Different test infrastructure for injecting mock clients and making requests. |

## Contract Test Paths

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| `/gen-ai/api/v1/mlflow/prompts/...` | `/api/v1/prompts/...` | Gen-ai contract tests use the `/gen-ai` prefix. MLflow contract tests don't use the `/mlflow` prefix, matching the convention of the existing experiments/namespaces/user tests. |

## OpenAPI Spec

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| Paths under `/gen-ai/api/v1/mlflow/prompts` | Paths under `/api/v1/prompts` | Path convention difference (see Route Paths above). |
| `namespace` query param (required) | `workspace` query param (uses shared `$ref: "#/components/parameters/workspace"`) | Reuses existing MLflow OpenAPI workspace parameter definition. |
| `description` required on `MLflowPrompt` | `description` not required on `MLflowPrompt` | Fixed during review — MLflow can return prompts without a description. |
| No `400` on `DELETE /prompts/{name}` | `400` included on `DELETE /prompts/{name}` | Fixed during review — spec consistency with `DELETE /prompts/{name}/versions/{version}`. |
| 204 responses inline | 204 responses use `$ref: "#/components/responses/NoContent"` | Cleaner than inline or escaped path refs. |

## Seed Data

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| Extensive multi-version seed prompts with detailed veterinary-themed content | Simpler seed data (4 prompts, 1 version each) | Sufficient for contract tests and dev mode. Can be expanded later. |

## Static Mock Client

| Gen-AI BFF | MLflow BFF | Reason |
|---|---|---|
| No static mock (uses `mlflowmocks.SetupMLflow` with real Python process or mock factory) | `StaticMockClient` with hardcoded prompt data | MLflow BFF has a static mock pattern for running without Python/uv. Prompt methods were added to match the existing experiments static mock. |

## What Is Identical

The following are verbatim copies (modulo import paths):

- **Models/DTOs** (`prompt.go`) — all 7 types, same field names, same JSON tags
- **Repository logic** (`prompts.go`) — all 6 methods + `toMLflowPromptVersion` helper
- **Handler business logic** (`prompts_handler.go`) — validation rules, request parsing, response wrapping, `create_only` check-then-act pattern
- **Client interface methods** — same 7 method signatures, same SDK delegation
- **`validPromptName` regex** — `^[a-zA-Z0-9][a-zA-Z0-9._-]*$`
