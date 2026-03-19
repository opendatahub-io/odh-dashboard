---
description: BFF (Backend For Frontend) API patterns and Go conventions for ODH Dashboard packages
globs: "packages/*/bff/**,packages/*/upstream/bff/**"
alwaysApply: false
---

# BFF API Patterns & Go Conventions

## Which packages have BFFs

gen-ai, model-registry, maas, automl, autorag, mlflow, eval-hub — each with a `bff/` directory containing Go code.

## Directory structure

```text
bff/
├── cmd/
│   ├── main.go            # Entry point, flag parsing, server setup
│   └── helpers.go         # getEnvAsInt, getEnvAsString, parseLevel
├── internal/
│   ├── api/               # HTTP handlers and routing
│   │   ├── app.go         # App struct, NewApp(), Routes()
│   │   ├── *_handler.go   # Per-endpoint handlers
│   │   ├── middleware.go  # Auth, CORS, logging, client attachment
│   │   └── errors.go      # Error response helpers
│   ├── config/            # EnvConfig struct
│   ├── constants/         # Path constants, header keys
│   ├── integrations/      # External service clients
│   │   ├── kubernetes/    # K8s client, SAR, identity
│   │   └── httpclient/    # HTTP client for upstream APIs
│   ├── models/            # DTOs
│   ├── repositories/      # Business logic layer
│   └── mocks/             # Mock implementations
├── openapi/src/*.yaml     # OpenAPI specs
├── go.mod
├── go.sum
└── Makefile
```

## Router and handlers

All BFFs use `julienschmidt/httprouter`. Handler signature:

```go
func (app *App) MyHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params)
```

### Route registration

```go
apiRouter := httprouter.New()
apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

apiRouter.GET(constants.ModelsListPath,
  app.AttachNamespace(
    app.RequireAccessToService(
      app.AttachLlamaStackClient(app.LlamaStackModelsHandler))))
```

## Middleware

Middleware wraps handlers — composed inside-out:

| Middleware | Purpose |
|---|---|
| `InjectRequestIdentity` | Extract user identity from headers |
| `AttachNamespace` | Extract and validate namespace param |
| `RequireAccessToService` | SAR/SSAR check for namespace access |
| `AttachLlamaStackClient` / `AttachClient` | Create service client per request |

Chain: `AttachNamespace → RequireAccess → AttachClient → handler`.

## Authentication

### Auth methods

| Method | Header | Usage |
|---|---|---|
| `internal` | `kubeflow-userid` + `kubeflow-groups` | Kubeflow/ODH deployments |
| `user_token` | `Authorization: Bearer <token>` | RHOAI deployments |
| `disabled` | N/A | Mock/testing |

Identity stored in `RequestIdentity` (UserID, Groups, Token) via `context.WithValue`.

### RBAC

SubjectAccessReview / SelfSubjectAccessReview for namespace-level permission checks (e.g., `CanListServicesInNamespace`).

## Configuration

CLI flags + environment variables via `EnvConfig`:

| Flag | Env Var | Description |
|---|---|---|
| `-port` | `PORT` | Listen port (default 8080) |
| `-auth-method` | `AUTH_METHOD` | `internal`, `user_token`, `disabled` |
| `-auth-token-header` | `AUTH_TOKEN_HEADER` | Token header (default `Authorization`) |
| `-mock-k8s-client` | `MOCK_K8S_CLIENT` | Enable K8s mocks |
| `-allowed-origins` | `ALLOWED_ORIGINS` | CORS origins |
| `-log-level` | `LOG_LEVEL` | Log level |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip TLS verification (default `false`, **local dev only** — forbidden in production/CI) |

> **Security**: `INSECURE_SKIP_VERIFY=true` is permitted only for local debugging against non-production endpoints. Production and CI profiles must fail configuration validation at startup if this flag is enabled.

## Error handling

Standard error envelope:

```go
type ErrorEnvelope struct {
    Error *integrations.HTTPError `json:"error"`
}

type HTTPError struct {
    StatusCode int `json:"-"`
    ErrorResponse
}

type ErrorResponse struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}
```

Response helpers: `badRequestResponse`, `unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`, `serverErrorResponse`, `serviceUnavailableResponse`.

## Request/Response helpers

```go
func (app *App) WriteJSON(w http.ResponseWriter, status int, data any, headers http.Header) error
```

## Upstream service calls

BFFs call upstream services via HTTP clients — not generic proxies:

1. Create `httpclient.NewHTTPClient(logger, baseURL, headers, ...)`
2. Forward user token as `Authorization: Bearer <token>`
3. Service URLs from K8s status (e.g., `LlamaStackDistribution.Status.ServiceURL`) or env vars

## Testing

### Unit tests

- `*_test.go` adjacent to implementation
- `httptest.NewRecorder()` + `http.NewRequest()` for handler tests
- Mock factories for K8s, service clients
- Table-driven tests:

```go
tests := []struct {
    name    string
    input   Request
    wantErr bool
}{...}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) { ... })
}
```

### envtest

gen-ai and model-registry use K8s `envtest` for integration tests.

### Contract tests

- Framework: `@odh-dashboard/contract-tests`
- BFF must expose `/healthcheck`, accept mock flags, and have OpenAPI spec
- Tests run against mock BFF and validate with `toMatchContract(apiSchema, { ref, status })`
- OpenAPI spec in `bff/openapi/src/*.yaml`
- Run: `npm run test:contract` (starts mock BFF, runs Jest)

## Go conventions

- Standard `cmd/` + `internal/` layout
- `internal/api/` for all HTTP concerns
- `internal/integrations/` for external service clients
- `internal/repositories/` for business logic
- `internal/models/` for DTOs
- `slog` for structured logging
- `flag` package for CLI flags with env var fallbacks
