# BFF Extension Mechanism

This document describes how downstream projects can extend and customize the BFF (Backend for Frontend) handlers without modifying the upstream code.

## Overview

The extension mechanism allows downstream builds to:

1. **Override existing handlers** - Replace upstream handlers with custom implementations
2. **Add downstream-only routes** - Define routes upstream as stubs (501 Not Implemented) that downstream code implements
3. **Access App dependencies** - Use config, logger, Kubernetes factory, and repositories from extensions

## Handler Override System

### How It Works

1. Upstream code registers handlers using `handlerWithOverride()` which checks for overrides
2. Downstream code uses `RegisterHandlerOverride()` in an `init()` function to register custom handlers
3. At runtime, if an override is registered, it's used instead of the default handler

### Available Handler IDs

The following handler IDs can be overridden:

| Handler ID | Description | Default Endpoint |
|------------|-------------|------------------|
| `HandlerUserID` | Get current user | `GET /api/v1/user` |
| `HandlerNamespacesID` | List namespaces | `GET /api/v1/namespaces` |

### Registering an Override

In your downstream project, create a file that imports the API package and registers overrides in an `init()` function:

```go
package extensions

import (
    "net/http"

    "github.com/julienschmidt/httprouter"
    "github.com/opendatahub-io/mod-arch-library/bff/internal/api"
)

func init() {
    // Override the user handler
    api.RegisterHandlerOverride(api.HandlerUserID, func(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
        return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
            // Custom implementation
            // You can call buildDefault() to get the original handler if needed

            // Access app dependencies
            logger := app.Logger()
            config := app.Config()
            k8sFactory := app.KubernetesClientFactory()
            repos := app.Repositories()

            // Your custom logic here
            logger.Info("custom user handler called")

            // Optionally delegate to default
            defaultHandler := buildDefault()
            defaultHandler(w, r, ps)
        }
    })
}
```

### Enabling Extensions

To enable your extensions, add a blank import in your `main.go`:

```go
package main

import (
    // Enable custom handler overrides
    _ "your-project/internal/extensions"
)
```

## Creating Placeholder Routes

Upstream can define routes that return 501 Not Implemented, allowing downstream to provide the actual implementation:

```go
// In upstream app.go Routes()
apiRouter.GET("/api/v1/models", app.EndpointNotImplementedHandler("models"))

// Define the handler ID constant
const HandlerModelsID HandlerID = "models:list"

// Wire it with override support
apiRouter.GET("/api/v1/models", app.handlerWithOverride(HandlerModelsID, func() httprouter.Handle {
    return app.EndpointNotImplementedHandler("models")
}))
```

Downstream can then override this:

```go
func init() {
    api.RegisterHandlerOverride(api.HandlerModelsID, func(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
        return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
            // Actual implementation
        }
    })
}
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

Use `NewTestApp()` to create an App instance for testing:

```go
package myextension_test

import (
    "log/slog"
    "testing"

    "github.com/opendatahub-io/mod-arch-library/bff/internal/api"
    "github.com/opendatahub-io/mod-arch-library/bff/internal/config"
)

func TestMyHandler(t *testing.T) {
    cfg := config.EnvConfig{
        // Configure as needed
    }
    logger := slog.Default()
    mockK8sFactory := &MockKubernetesClientFactory{}

    app := api.NewTestApp(cfg, logger, mockK8sFactory, nil)

    // Test your handler with the app
}
```

## Customizing Kubernetes Client Creation

The `TokenClientFactory` allows customizing how Kubernetes clients are created:

```go
package extensions

import (
    "log/slog"

    k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
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

1. **Use `init()` functions** - Register overrides in `init()` so they're available before the app starts
2. **Blank imports** - Use blank imports (`_ "package"`) in `main.go` to trigger the `init()` functions
3. **Access dependencies through App** - Don't try to access internal fields; use the public methods
4. **Handle errors consistently** - Use the provided error response helpers
5. **Log with context** - Use `app.Logger()` for consistent structured logging
