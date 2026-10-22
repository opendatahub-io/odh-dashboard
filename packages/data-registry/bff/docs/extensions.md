# BFF Downstream Helpers and Route Guidance

This document covers helper APIs available to downstream BFF code. The current route table is
defined directly in `App.Routes()`; it does not provide a runtime handler override mechanism.

## Route registration status

`App.Routes()` registers the built-in handlers directly. Although `RegisterHandlerOverride()` and
`handlerWithOverride()` are present in the API package, no current route calls `handlerWithOverride()`.
Registering a factory, including through an `init()` function or blank import, therefore does not
change the handlers served by the BFF.

To add or replace a route in a downstream build, update that build's `App.Routes()` implementation
and register the handler explicitly. The main API router is wrapped by `InjectRequestIdentity()`;
that middleware authenticates requests on the API prefixes it recognizes. Handlers remain
responsible for any resource-level authorization they require. Routes outside those prefixes need
their own authentication and authorization.

`EndpointNotImplementedHandler()` creates a 501 handler but does not register a route. A downstream
build can explicitly register it as a placeholder in its route table and replace that registration
when it implements the endpoint. Mount the API router on the application mux as well; the exact
`/api/v1/models` route takes precedence over a broader Data Registry proxy catchall:

```go
apiRouter := httprouter.New()
apiRouter.GET("/api/v1/models", app.EndpointNotImplementedHandler("models"))
appMux := http.NewServeMux()
appMux.Handle("/api/v1/models", apiRouter)
```

## Accessing App Dependencies

Extensions have access to the following App methods:

### `app.Config()`

Returns the `config.EnvConfig` with all environment configuration values.

### `app.Logger()`

Returns the `*slog.Logger` for structured logging.

### `app.KubernetesClientFactory()`

Returns the `k8s.KubernetesClientFactory` for creating Kubernetes clients.

### `app.Repositories()`

Returns the `*repositories.Repositories` container with all data repositories.

## Error Response Helpers

Extensions can use these methods for consistent error responses:

```go
// 400 Bad Request
app.BadRequest(w, r, err)

// 500 Internal Server Error
app.ServerError(w, r, err)

// 501 Not Implemented
app.NotImplemented(w, r, "feature-name")
```

## Testing Extensions

The upstream `NewTestApp()` helper is defined in a `_test.go` file and is not part of the built API
package. Downstream packages cannot import it. Keep downstream handler tests in the package that
constructs the app, or test the handler using fixtures available to that package.

## Customizing Kubernetes Client Creation

The `TokenClientFactory` allows customizing how clients created from that factory behave:

```go
package extensions

import (
    "log/slog"

    k8s "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
)

func CustomTokenClientFactory(logger *slog.Logger, cfg config.EnvConfig) k8s.KubernetesClientFactory {
    factory := k8s.NewTokenClientFactory(logger, cfg).(*k8s.TokenClientFactory)

    // Override the client creation function
    factory.NewTokenKubernetesClientFn = func(token string, logger *slog.Logger) (k8s.KubernetesClientInterface, error) {
        // Create the default client
        client, err := k8s.NewTokenKubernetesClient(token, logger)
        if err != nil {
            return nil, err
        }

        // Wrap or modify as needed
        return &MyCustomClient{TokenKubernetesClient: client.(*k8s.TokenKubernetesClient)}, nil
    }

    return factory
}
```

`NewApp()` creates its own Kubernetes client factory and does not accept a replacement factory.
Creating a custom factory does not change the factory used by the running BFF unless the downstream
build also changes app construction.

### Accessing REST Config

The `TokenKubernetesClient` exposes its REST config for creating additional clients:

```go
client, _ := factory.GetClient(ctx)
if tkc, ok := client.(*k8s.TokenKubernetesClient); ok {
    restConfig := tkc.RESTConfig()
    // Use restConfig to create dynamic clients, etc.
}
```

## Best Practices

1. **Register routes explicitly** in the downstream `App.Routes()` implementation; handler override
   registration and blank imports do not affect the current route table.
2. **Preserve authentication and authorization** when adding routes. `InjectRequestIdentity()` only
   authenticates API paths it recognizes; handlers must enforce resource-level access themselves.
3. **Access dependencies through App** - Use the public methods rather than internal fields.
4. **Handle errors consistently** - Use the provided error response helpers.
5. **Log with context** - Use `app.Logger()` for consistent structured logging.
