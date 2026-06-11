# autox-core/services

Shared Go library consumed by automl and autorag BFFs. This is a code-only package — no binary, no server, no BFF of its own.

## Build & Linking

`go.work` files link autox-core with consuming packages (automl, autorag) during local development. `go mod tidy` may report that autox-core is not found — this is expected because the module is not published to a registry; the `go.work` replace directive handles resolution.

## Layered Architecture

Follow strict separation of concerns through the handler → service → client stack:

```
Handler → [Product Service] → autox-core Service → Client
```

Each layer has a single responsibility:

- **Handler** — HTTP concerns only: parse requests, call the service, map sentinel errors to HTTP status codes, write responses. No business logic.
- **Service** — Business logic, orchestration, validation beyond simple input parsing. Owns the domain models and sentinel errors. When a consuming BFF needs product-specific logic on top of an autox-core service (e.g. automl-specific orchestration), that logic lives in a product-level service in the consuming package, not in autox-core.
- **Client** — Talks to external systems (S3, Kubernetes, KFP, etc.). Maps external responses to application models (owned by the service layer) using json tags. Maps external errors to sentinel errors. Exception: when the client wraps a well-established third-party module (e.g. `k8s.io/apimachinery`), use that module's sentinel errors directly rather than re-wrapping.

Why: keeping HTTP mechanics out of business logic and business logic out of data access makes each layer independently testable and replaceable. A handler test doesn't need S3 credentials; a service test doesn't need an HTTP server.

## Dependency Injection

Wire dependencies explicitly in `app.go`. Every struct accepts its collaborators through its constructor:

- Clients accept an `*http.Client` (or lower-level transport/SDK client).
- Services accept a client interface.
- Handlers accept a service interface.

Why: explicit wiring makes the dependency graph visible in one place and enables unit testing by mocking at interface boundaries. You can test a service by injecting a fake client without spinning up the real external system.

### Port-Forward Manager

When a port-forward manager is needed (e.g. for local development against a remote cluster), inject it as a dependency and use it during HTTP client construction, typically via `WrapTransport`. Do not embed port-forwarding logic inside services or handlers.

Why: port-forwarding is a transport concern. Injecting it through `WrapTransport` keeps the service layer unaware of whether it's talking to a local port-forward or a direct endpoint.

## Error Handling

### Sentinel Errors

Always use sentinel errors (`var ErrFoo = errors.New("...")`) for classifiable failure conditions. Each layer is responsible for translating errors from the layer below:

- **Client → Service boundary**: Clients map external errors (AWS SDK errors, HTTP status codes, K8s API errors) to sentinel errors defined in the service package. Callers use `errors.Is` to classify failures.
- **Service → Handler boundary**: Handlers map sentinel errors to appropriate HTTP status codes. A `switch` on `errors.Is` in the handler is the expected pattern.

Why: sentinel errors decouple error classification from error origin. The handler doesn't need to know whether a "not found" came from S3, Kubernetes, or an in-memory cache — it just checks `errors.Is(err, ErrNotFound)` and returns 404. This also prevents leaking internal implementation details (SDK error types, raw status codes) to API consumers.

### Error Mapping Direction

Errors flow upward and get translated at each boundary:

```
External system error → Client maps to sentinel → Service propagates (or wraps) → Handler maps to HTTP status
```

Never skip a layer. Don't catch an AWS SDK error in a handler.

## Middleware

Keep business logic out of middleware. Middleware is appropriate for:

- Authentication / identity extraction (e.g. `InjectRequestIdentity`)
- Request-scoped concerns (logging, tracing, request ID injection)
- Transport-level concerns (TLS, timeouts, CORS)

Why: middleware runs on every request and has no knowledge of which endpoint it's serving. Business logic in middleware becomes invisible conditional behavior that's hard to test, hard to reason about, and couples unrelated endpoints.

## HTTP Conventions

### Request & Response Structs

Use json tags on all request and response structs. Wrap responses in envelopes (a top-level object with a named field for the payload) rather than returning bare arrays or primitives.

Why: envelopes allow adding metadata (pagination, request ID, warnings) without breaking the response schema. Bare arrays are a known JSON security concern (historical array hijacking) and make API evolution harder.

### Timeouts

Prefer operation-level timeouts over global timeouts on HTTP clients. Set timeouts via `context.WithTimeout` at the call site or per-operation on the transport (e.g. `ResponseHeaderTimeout`, `DialContext` timeout).

Why: a global client timeout that works for quick metadata lookups will be too short for large file uploads, and one sized for uploads will mask hung connections on fast operations. Operation-level timeouts let each call site express its own latency budget.

## Security

Always double-check for potential security issues when working with HTTP-related code. In particular:

- Validate and sanitize URLs before making outbound requests (SSRF prevention, as seen in the S3 client's endpoint validation).
- Never log or expose credentials, tokens, or secret values in error messages or responses.
- Use TLS with proper certificate verification in production. `InsecureSkipVerify` is development-only.
- Treat user-supplied input (headers, query params, path segments) as untrusted at the handler layer.

## Comments

Never remove existing comments. When modifying code that has comments, preserve them. If a comment becomes inaccurate due to your change, update it — don't delete it.

Why: comments in this codebase capture non-obvious constraints, security rationale, and cross-cutting concerns that aren't derivable from the code alone. Removing them loses institutional knowledge.
