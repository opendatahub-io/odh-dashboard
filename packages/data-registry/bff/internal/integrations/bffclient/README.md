# bffclient — Inter-BFF Communication Package

Self-contained HTTP client package for calling other Backend-for-Frontend (BFF) services
in a multi-container Kubernetes pod deployment.

## Package Structure

```
bffclient/
├── client.go           # HTTP client with TLS, auth forwarding, response parsing
├── client_test.go      # Client unit tests
├── config.go           # Service discovery, URL generation, default configuration
├── config_test.go      # Config unit tests
├── errors.go           # Structured error types with 10 error codes
├── errors_test.go      # Error unit tests
├── factory.go          # Factory pattern for real/mock client creation
├── factory_test.go     # Factory unit tests
├── middleware.go        # Context injection middleware (httprouter + http.HandlerFunc)
└── bffmocks/
    └── mock_client.go  # Thread-safe mock implementation for testing
```

## Port Assignments

| BFF              | Port | BFFTarget Constant |
|------------------|------|--------------------|
| Model Registry   | 8043 | `model-registry`   |
| Gen-AI           | 8143 | `gen-ai`           |
| MaaS             | 8243 | `maas`             |
| MLflow           | 8343 | `mlflow`           |

## Usage

### 1. Middleware — attach a BFF client to request context

```go
apiRouter.POST("/api/v1/bff/<target>/endpoint",
    app.AttachNamespace(
        bffclient.AttachBFFClient(app.bffClientFactory, bffclient.BFFTarget<Target>)(
            app.YourHandler)))
```

### 2. Handler — retrieve client and make calls

```go
func (app *App) YourHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    client := bffclient.GetClient(r.Context(), bffclient.BFFTarget<Target>)
    if client == nil {
        // handle unavailable
        return
    }

    var response YourResponseType
    err := client.Call(r.Context(), "POST", "/your-endpoint", requestBody, &response)
    // handle err / write response
}
```

### 3. Testing — inject mock client via context

```go
mockClient := bffmocks.NewMockBFFClient(bffclient.BFFTarget<Target>)
ctx := context.WithValue(req.Context(),
    constants.BFFClientKey("<target>"), mockClient)
req = req.WithContext(ctx)
```

## Configuration

See the BFF README and the inter-BFF communication spec for environment variables,
CLI flags, and Kubernetes manifest changes.

## Design Decisions

- **Self-contained**: each BFF includes its own copy (no shared Go module)
- **Middleware-based**: follows the same pattern as other BFF middleware
- **Auth forwarding**: transparently forwards user tokens to the target BFF
- **Mock support**: full mock mode for testing without running other BFFs
- **Best-effort health checks**: availability checks log warnings but don't block

## Running Tests

```bash
go test ./internal/integrations/bffclient/... -v
```
