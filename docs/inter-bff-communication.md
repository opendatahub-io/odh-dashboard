# Inter-BFF Communication

This document describes the architecture and implementation patterns for communication between Backend-for-Frontend (BFF) services in the ODH Dashboard modular architecture.

## Overview

The ODH Dashboard uses a modular architecture where multiple BFF services run as containers in a single pod. Each BFF serves a specific feature module (Gen-AI, MaaS, Model Registry, etc.). Inter-BFF communication enables these services to coordinate and share functionality.

### Use Cases

- **Token Management**: Gen-AI BFF requests ephemeral tokens from MaaS BFF for Playground sessions (stub example included)
- **Cross-Module Data**: Retrieving data from another module's domain
- **Service Coordination**: Orchestrating workflows across multiple modules

> **Note**: This PR provides the inter-BFF communication **infrastructure** (client library, service discovery, NetworkPolicy, deployment configuration). The Gen-AI BFF includes a stub endpoint (`/bff/maas/tokens`) that demonstrates the call pattern. The corresponding MaaS BFF endpoint is expected to be implemented by the MaaS team as part of their feature work.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ODH Dashboard Pod                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Gen-AI BFF  │──│   MaaS BFF   │──│  Model Registry BFF  │   │
│  │   :8043      │  │    :8243     │  │        :8143         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                  │                    │                │
│         └──────────────────┴────────────────────┘                │
│                    Inter-BFF HTTP Calls                          │
│              (localhost or K8s service DNS)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Each BFF that needs to call another BFF configures these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MOCK_BFF_CLIENTS` | Enable mock BFF clients for testing | `false` |
| `BFF_<TARGET>_DEV_URL` | Dev override URL (e.g., `http://localhost:4000/api/v1`) | - |
| `BFF_<TARGET>_SERVICE_NAME` | Kubernetes service name | `odh-dashboard` |
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

Example: `odh-dashboard.redhat-ods-applications.svc.cluster.local:8243`

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

### Deployment Configuration

Add environment variables to your BFF container in `deployment.yaml`:

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

Enable egress between BFFs in `networkpolicy.yaml`:

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

Add environment variables and network policy rules as shown in the Kubernetes Deployment section above.

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
- In Kubernetes: `kubectl get svc odh-dashboard -n <namespace>`

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
- Verify service exists: `kubectl get svc odh-dashboard -n <namespace>`
- Check NetworkPolicy allows egress on target port
- DNS format: `<service>.<namespace>.svc.cluster.local:<port>`

## Related Documentation

- [Gen-AI BFF Inter-BFF Implementation](../packages/gen-ai/bff/README.md#inter-bff-communication)
- [Modular Architecture Overview](./architecture.md)
- [Network Policy Configuration](../manifests/modular-architecture/networkpolicy.yaml)
