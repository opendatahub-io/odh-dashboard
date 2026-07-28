# Inter-BFF Communication

This document describes the architecture and implementation patterns for communication between Backend-for-Frontend (BFF) services in the ODH Dashboard modular architecture.

## Overview

The ODH Dashboard uses a modular architecture where multiple BFF services run as independent Kubernetes Deployments. Each BFF serves a specific feature module (Gen-AI, MaaS, Model Registry, etc.). Inter-BFF communication enables these services to coordinate and share functionality. Standalone deployment is the primary deployment mode; sidecar mode (all BFFs in one pod) is legacy and deprecated.

### Use Cases

- **Token Management**: Gen-AI BFF requests ephemeral tokens from MaaS BFF for Playground sessions (stub example included)
- **Cross-Module Data**: Retrieving data from another module's domain
- **Service Coordination**: Orchestrating workflows across multiple modules

> **Note**: This PR provides the inter-BFF communication **infrastructure** (client library, service discovery, NetworkPolicy, deployment configuration) along with **stub endpoints on both sides** to verify end-to-end connectivity. The Gen-AI BFF includes a stub handler at `/gen-ai/api/v1/maas/tokens` that calls the MaaS BFF, and the MaaS BFF exposes a stub token endpoint at `/api/v1/tokens`. These stubs demonstrate the full inter-BFF call pattern with authenticated token forwarding and will be replaced with production implementations as feature work progresses.

### Architecture

Two deployment modes affect how inter-BFF calls are made:

**Standalone mode (primary)** -- each BFF is its own pod with its own Kubernetes Service; calls go to K8s service DNS. core-bff remains in the **main dashboard pod** in both modes:

```
┌─────────────────────────────────────────────┐
│  Main Dashboard Pod (odh-dashboard svc)      │
│  ┌─────────────┐  ┌──────────────┐          │
│  │ odh-dashboard│  │  core-bff   │           │
│  │    :8080    │  │    :8943    │           │
│  └─────────────┘  └──────┬──────┘           │
└──────────────────────────┼──────────────────┘
                            │ ← port 8943 on odh-dashboard svc
         ┌──────────────────┼─────────────────┐
         │                  │                 │
┌────────┴──────┐  ┌────────┴──────┐  ┌───────┴───────┐
│  gen-ai pod   │  │   maas pod    │  │  mlflow pod   │
│    :8143      │  │    :8243      │  │    :8343      │
│ odh-dashboard-│  │ odh-dashboard-│  │ odh-dashboard-│
│ gen-ai-ui svc │  │ maas-ui svc   │  │ mlflow-ui svc │
└───────────────┘  └───────────────┘  └───────────────┘
```

In standalone mode, each module has its own Kubernetes Service (e.g., `odh-dashboard-gen-ai-ui`), so inter-BFF calls use the module-specific service name rather than the shared `odh-dashboard` service.

**Sidecar mode (legacy/deprecated)** -- all BFFs share one pod; calls go to `localhost:<port>` or the shared `odh-dashboard` service:

> **Note**: Sidecar mode is deprecated. New modules should target standalone deployment only.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ODH Dashboard Pod                              │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐         │
│  │  Gen-AI BFF  │──│   MaaS BFF   │──│  Model Registry BFF  │   ...   │
│  │    :8143     │  │    :8243     │  │        :8043         │         │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘         │
│         │                 │                                            │
│         └─────────────────┘──────────────────────────────────┐        │
│                        ┌──────────────┐                       │        │
│                        │  core-bff    │◄──── any module ──────┘        │
│                        │    :8943     │                                │
│                        └──────────────┘                                │
│                    odh-dashboard service (port 8943)                   │
└────────────────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Each BFF that needs to call another BFF configures these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MOCK_BFF_CLIENTS` | Enable mock BFF clients for testing | `false` |
| `BFF_<TARGET>_DEV_URL` | Dev override URL (e.g., `http://localhost:4000/api/v1`) | - |
| `BFF_<TARGET>_SERVICE_NAME` | Kubernetes service name | varies by mode (see below) |
| `BFF_<TARGET>_SERVICE_PORT` | Target BFF port | varies by target |
| `BFF_<TARGET>_TLS_ENABLED` | Enable HTTPS for inter-BFF calls | `false` (local) / `true` (prod) |
| `BFF_<TARGET>_AUTH_METHOD` | Authentication method: `user_token` or `internal` | `user_token` |
| `BFF_<TARGET>_AUTH_TOKEN_HEADER` | Header name for auth token | `x-forwarded-access-token` |
| `BFF_<TARGET>_AUTH_TOKEN_PREFIX` | Token prefix (e.g., `Bearer `) | `` (empty) |
| `POD_NAMESPACE` | Kubernetes namespace (auto-injected via downward API) | - |

Replace `<TARGET>` with the target BFF name (e.g., `MAAS`, `GENAI`, `MODEL_REGISTRY`).

### Service Discovery

In Kubernetes, BFFs discover each other using DNS:

```
<service-name>.<namespace>.svc.cluster.local:<port>
```

**Standalone mode (primary)**: Each BFF has its own Kubernetes Service, so the service name in `BFF_<TARGET>_SERVICE_NAME` is the module-specific service name. For example, to call the MaaS BFF from the Gen-AI BFF:

```
odh-dashboard-maas-ui.redhat-ods-applications.svc.cluster.local:8243
```

The operator injects these service names automatically via environment variables in each module's `deployment.yaml`, or wires them through the `interBFFDependencies` mechanism in `dashboard-operator/internal/controller/module_deploy.go`.

**Sidecar mode (legacy)**: All BFFs share the `odh-dashboard` service, so the service name is always `odh-dashboard` and only the port differs:

```
odh-dashboard.redhat-ods-applications.svc.cluster.local:8243
```

For local development, use `BFF_<TARGET>_DEV_URL` to override service discovery:

```bash
BFF_MAAS_DEV_URL=http://localhost:4000/api/v1 go run cmd/main.go
```

### Authentication

Inter-BFF calls forward the user's authentication token from the original request. Two authentication methods are supported:

| Method | Header | Use Case |
|--------|--------|----------|
| `user_token` | `x-forwarded-access-token` | ODH/RHOAI (default) |
| `internal` | `kubeflow-userid`, `kubeflow-groups` | Kubeflow deployments |

The calling BFF extracts the token from the incoming request's `RequestIdentity` context and forwards it to the target BFF.

### TLS Configuration

| Environment | `TLS_ENABLED` | Notes |
|-------------|---------------|-------|
| Local development | `false` | HTTP between local processes |
| Production (K8s) | `true` | HTTPS with service mesh certificates |

For production, ensure CA bundles are configured via `BUNDLE_PATHS` environment variable.

## Local Development

### Running Multiple BFFs

**Terminal 1: Start target BFF (e.g., MaaS)**

```bash
cd packages/maas/bff
go run cmd/main.go --port=4000
```

**Terminal 2: Start calling BFF with dev override**

```bash
cd packages/gen-ai/bff
BFF_MAAS_DEV_URL=http://localhost:4000/api/v1 go run cmd/main.go --port=8080
```

### Mock Mode

For single-BFF development without running other services:

```bash
MOCK_BFF_CLIENTS=true go run cmd/main.go --port=8080
```

Mock mode returns predefined responses without making HTTP calls. Useful for:

- Frontend development
- Unit testing in isolation
- CI/CD pipelines

## Kubernetes Deployment

### Standalone Deployment Configuration (Primary)

In standalone mode, each module runs as its own Kubernetes Deployment with its own Service. Inter-BFF environment variables must reference the target module's standalone service name.

Add environment variables to your BFF container in `manifests/modules/<slug>/deployment.yaml`:

```yaml
env:
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  # Inter-BFF: calling MaaS from this module
  - name: BFF_MAAS_SERVICE_NAME
    value: "odh-dashboard-maas-ui"
  - name: BFF_MAAS_SERVICE_PORT
    value: "8243"
  - name: BFF_MAAS_TLS_ENABLED
    value: "true"
  - name: BFF_MAAS_AUTH_METHOD
    value: "user_token"
  - name: BFF_MAAS_AUTH_TOKEN_HEADER
    value: "x-forwarded-access-token"
  - name: BFF_MAAS_AUTH_TOKEN_PREFIX
    value: ""
  # Inter-BFF: calling core-bff (always on main dashboard pod)
  - name: BFF_CORE_BFF_SERVICE_NAME
    value: "odh-dashboard"
  - name: BFF_CORE_BFF_SERVICE_PORT
    value: "8943"
  - name: BFF_CORE_BFF_TLS_ENABLED
    value: "true"
```

Note that `BFF_MAAS_SERVICE_NAME` is `odh-dashboard-maas-ui` (the standalone Service) rather than `odh-dashboard` (the shared sidecar Service). The `BFF_CORE_BFF_SERVICE_NAME` remains `odh-dashboard` because core-bff always runs in the main dashboard pod.

### Sidecar Deployment Configuration (Legacy)

In sidecar mode, all BFFs share the `odh-dashboard` service:

```yaml
env:
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: BFF_MAAS_SERVICE_NAME
    value: "odh-dashboard"
  - name: BFF_MAAS_SERVICE_PORT
    value: "8243"
  - name: BFF_MAAS_TLS_ENABLED
    value: "true"
  - name: BFF_MAAS_AUTH_METHOD
    value: "user_token"
  - name: BFF_MAAS_AUTH_TOKEN_HEADER
    value: "x-forwarded-access-token"
  - name: BFF_MAAS_AUTH_TOKEN_PREFIX
    value: ""
```

### Network Policy

#### Standalone Mode (Primary)

In standalone mode, inter-BFF communication is pod-to-pod between different Deployments. Each module's NetworkPolicy must allow egress to the target module's pods and ingress from calling modules.

**Egress** in `manifests/modules/<slug>/networkpolicy.yaml` -- allow calling other module BFFs:

```yaml
egress:
  # Inter-BFF communication with other standalone modules
  - to:
      - podSelector:
          matchLabels:
            deployment: odh-dashboard-maas-ui
    ports:
      - port: 8243
        protocol: TCP
  # Communication with core-bff on main dashboard pod
  - to:
      - podSelector:
          matchLabels:
            deployment: odh-dashboard
    ports:
      - port: 8943
        protocol: TCP
```

**Ingress** -- allow other modules to call this module's BFF:

```yaml
ingress:
  # Allow calls from main dashboard (Fastify proxy)
  - from:
      - podSelector:
          matchLabels:
            deployment: odh-dashboard
    ports:
      - port: 8143
        protocol: TCP
  # Allow calls from other modules that depend on this one
  - from:
      - podSelector:
          matchLabels:
            deployment: odh-dashboard-autorag-ui
    ports:
      - port: 8143
        protocol: TCP
```

#### Sidecar Mode (Legacy)

In sidecar mode, all BFFs are in the same pod, so NetworkPolicy only needs to cover pod-level rules:

```yaml
egress:
  # Inter-BFF communication within same pod deployment
  - to:
      - podSelector:
          matchLabels:
            deployment: odh-dashboard
    ports:
      - port: 8043  # Gen-AI BFF
        protocol: TCP
      - port: 8143  # Model Registry BFF
        protocol: TCP
      - port: 8243  # MaaS BFF
        protocol: TCP
      - port: 8343  # MLflow BFF
        protocol: TCP
```

For external backends (off-cluster services), add ipBlock rules:

```yaml
  # External egress (off-cluster backends)
  - to:
      - ipBlock:
          cidr: 0.0.0.0/0
    ports:
      - port: 443
        protocol: TCP
      - port: 80
        protocol: TCP
```

## Implementation Guide

To add inter-BFF communication to a new module:

### 1. Copy the BFF Client Package

Copy `packages/gen-ai/bff/internal/integrations/bffclient/` to your module:

```
internal/integrations/bffclient/
├── client.go       # HTTP client with TLS and auth
├── config.go       # Service discovery configuration
├── factory.go      # Client factory (real & mock)
├── middleware.go   # Request context injection
├── errors.go       # Structured error types
└── bffmocks/       # Mock implementation for testing
```

### 2. Add CLI Flags

In `cmd/main.go`:

```go
flag.BoolVar(&cfg.MockBFFClients, "mock-bff-clients",
    getEnvAsBool("MOCK_BFF_CLIENTS", false), "Enable mock BFF clients")
flag.StringVar(&cfg.BFFTargetServiceName, "bff-target-service-name",
    getEnvAsString("BFF_TARGET_SERVICE_NAME", "odh-dashboard"), "Target service name")
flag.IntVar(&cfg.BFFTargetServicePort, "bff-target-service-port",
    getEnvAsInt("BFF_TARGET_SERVICE_PORT", 8243), "Target service port")
flag.BoolVar(&cfg.BFFTargetTLSEnabled, "bff-target-tls-enabled",
    getEnvAsBool("BFF_TARGET_TLS_ENABLED", false), "Enable TLS for target")
flag.StringVar(&cfg.BFFTargetDevURL, "bff-target-dev-url",
    getEnvAsString("BFF_TARGET_DEV_URL", ""), "Dev override URL for target")
```

### 3. Initialize Client Factory

In `internal/api/app.go`:

```go
// Configure BFF client
bffConfig := bffclient.NewDefaultBFFClientConfig()
bffConfig.MockBFFClients = cfg.MockBFFClients
bffConfig.PodNamespace = namespace

// Apply target-specific config
if targetConfig := bffConfig.GetServiceConfig(bffclient.BFFTargetMaaS); targetConfig != nil {
    targetConfig.ServiceName = cfg.BFFTargetServiceName
    targetConfig.Port = cfg.BFFTargetServicePort
    targetConfig.TLSEnabled = cfg.BFFTargetTLSEnabled
    targetConfig.DevOverrideURL = cfg.BFFTargetDevURL
}

// Create factory
var bffFactory bffclient.BFFClientFactory
if cfg.MockBFFClients {
    bffFactory = bffmocks.NewMockClientFactory(logger)
} else {
    bffFactory = bffclient.NewRealClientFactory(bffConfig, rootCAs, cfg.InsecureSkipVerify, logger)
}
```

### 4. Create Middleware

In `internal/api/middleware.go`:

```go
func (app *App) AttachBFFTargetClient(next httprouter.Handle) httprouter.Handle {
    return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
        ctx := r.Context()

        // Extract auth token from request identity
        var authToken string
        if identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity); ok {
            authToken = identity.Token
        }

        // Create and attach client
        client := app.bffClientFactory.CreateClient(bffclient.BFFTargetMaaS, authToken)
        ctx = context.WithValue(ctx, constants.BFFClientKey("target"), client)
        next(w, r.WithContext(ctx), ps)
    }
}
```

### 5. Create Handler

```go
func (app *App) MyInterBFFHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    ctx := r.Context()

    // Get BFF client from context
    client := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
    if client == nil {
        app.serverError(w, r, errors.New("BFF client not available"))
        return
    }

    // Make inter-BFF call
    var response MyResponseType
    err := client.Call(ctx, "POST", "/endpoint", requestBody, &response)
    if err != nil {
        app.handleBFFClientError(w, r, err)
        return
    }

    // Return response
    app.writeJSON(w, http.StatusOK, response)
}
```

### 6. Wire Up Routes

```go
router.POST("/api/v1/my-endpoint",
    app.AttachNamespace(
        app.RequireAccessToService(
            app.AttachBFFTargetClient(
                app.MyInterBFFHandler))))
```

### 7. Update Manifests

Add environment variables and network policy rules as shown in the [Kubernetes Deployment](#kubernetes-deployment) section above. For standalone mode, use the module-specific service names in environment variables and add pod-to-pod NetworkPolicy rules.

## Error Handling

The BFF client returns structured errors with these codes:

| Code | Description |
|------|-------------|
| `CONNECTION_FAILED` | Network connectivity issues |
| `TIMEOUT` | Request timeout (30s default) |
| `INVALID_RESPONSE` | Response parsing errors |
| `SERVER_UNAVAILABLE` | 5xx errors or unhealthy service |
| `UNAUTHORIZED` | 401 authentication failures |
| `FORBIDDEN` | 403 permission denials |
| `NOT_FOUND` | 404 endpoint not found |
| `BAD_REQUEST` | 400 validation errors |
| `INTERNAL_ERROR` | Generic 500 errors |

Example error handling:

```go
err := client.Call(ctx, "POST", "/tokens", req, &resp)
if err != nil {
    if bffErr, ok := err.(*bffclient.BFFClientError); ok {
        switch bffErr.Code {
        case bffclient.ErrCodeUnauthorized:
            // Handle auth error
        case bffclient.ErrCodeServerUnavailable:
            // Handle service down
        }
    }
}
```

## Troubleshooting

### Connection Refused

- Verify target BFF is running: `curl http://localhost:<port>/healthcheck`
- Check `BFF_<TARGET>_DEV_URL` is set correctly for local development
- In Kubernetes (standalone): `kubectl get svc odh-dashboard-<slug>-ui -n <namespace>`
- In Kubernetes (sidecar): `kubectl get svc odh-dashboard -n <namespace>`

### Token Forwarding Issues

- Check `BFF_<TARGET>_AUTH_METHOD` matches target BFF configuration
- Verify `BFF_<TARGET>_AUTH_TOKEN_HEADER` header name
- For ODH/RHOAI: use `x-forwarded-access-token` (no prefix)
- For standard Bearer: use `Authorization` with `Bearer ` prefix

### TLS Errors

- Local development: set `BFF_<TARGET>_TLS_ENABLED=false`
- Production: ensure `BFF_<TARGET>_TLS_ENABLED=true`
- Verify CA bundles are mounted and listed in `BUNDLE_PATHS`

### Service Discovery Failures

- Check `POD_NAMESPACE` is set (auto-injected via downward API)
- Standalone mode: verify service exists with `kubectl get svc odh-dashboard-<slug>-ui -n <namespace>`
- Sidecar mode: verify service exists with `kubectl get svc odh-dashboard -n <namespace>`
- Check NetworkPolicy allows egress on target port
- DNS format: `<service>.<namespace>.svc.cluster.local:<port>`

## Calling core-bff from a Module BFF

`core-bff` is the Go-based central BFF (`distributions/core-bff/`) that runs on **port 8943** inside the main dashboard pod (alongside `odh-dashboard` and `kube-rbac-proxy`). It exposes platform-level APIs (connection testing, cluster settings, serving runtimes, etc.) that module BFFs can call instead of duplicating Kubernetes client code.

### Service coordinates

| Mode | Variable | Value |
|---|---|---|
| Both | `BFF_CORE_BFF_SERVICE_NAME` | `odh-dashboard` (ODH) / `rhods-dashboard` (RHOAI) |
| Both | `BFF_CORE_BFF_SERVICE_PORT` | `8943` |
| Both | `BFF_CORE_BFF_TLS_ENABLED` | `true` (K8s) / `false` (local dev) |

In **standalone mode** the service coordinates (`BFF_CORE_BFF_SERVICE_NAME`, `BFF_CORE_BFF_SERVICE_PORT`) must be injected manually via the module's `deployment.yaml` env vars or wired through `interBFFDependencies` in `dashboard-operator/internal/controller/module_deploy.go`.

In **sidecar mode** the same env vars point to the shared `odh-dashboard` service, which works identically since core-bff is just another port on that service.

### federation ConfigMap proxy route

The Fastify backend routes `/core-bff/api/*` requests to core-bff via the `coreBff` `proxyService` entry in `federation-config` ConfigMap (added in PR #8708):

```json
{
  "name": "coreBff",
  "proxyService": [{
    "authorize": true,
    "path": "/core-bff/api",
    "pathRewrite": "/api",
    "tls": true,
    "service": { "name": "odh-dashboard", "namespace": "opendatahub", "port": 8943 }
  }]
}
```

Without this entry, `/core-bff/api/*` requests return 404 from Fastify (no proxy route registered). This is the finding from @DaoDaoNoCode in #8547 that prompted the addition.

### Adding a new module that calls core-bff

1. Add an env var entry for `BFF_CORE_BFF_SERVICE_NAME` / `BFF_CORE_BFF_SERVICE_PORT` in the module's standalone `manifests/modules/<slug>/deployment.yaml`, or wire it via `interBFFDependencies` in `dashboard-operator/internal/controller/module_deploy.go`
2. Add an egress rule to `manifests/modules/<slug>/networkpolicy.yaml`:
   ```yaml
   - to:
       - podSelector:
           matchLabels:
             deployment: odh-dashboard
     ports:
       - port: 8943
         protocol: TCP
   ```
3. Use `BFF_CORE_BFF_SERVICE_NAME` / `BFF_CORE_BFF_SERVICE_PORT` env vars as service coordinates (auto-injected in standalone mode; set manually for local dev with `BFF_CORE_BFF_DEV_URL`)

### Local development

```bash
# Terminal 1 — start core-bff locally
cd distributions/core-bff/bff
go run cmd/main.go --port=8943 --auth-method=disabled

# Terminal 2 — start gen-ai BFF pointing at local core-bff
cd packages/gen-ai/bff
BFF_CORE_BFF_DEV_URL=http://localhost:8943/api go run cmd/main.go --port=8080
```

## Related Documentation

- [Gen-AI BFF Inter-BFF Implementation](../packages/gen-ai/bff/README.md#inter-bff-communication)
- [Modular Architecture Overview](./architecture.md)
- [Module Federation](./module-federation.md)
- [Onboarding a New Module](./onboard-modular-architecture.md)
