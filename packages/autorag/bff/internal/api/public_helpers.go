package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
)

// BadRequest sends a 400 Bad Request response with the given error message.
// This is a public wrapper around badRequestResponse for use by downstream extensions.
func (app *App) BadRequest(w http.ResponseWriter, r *http.Request, err error) { //nolint:unused
	app.badRequestResponse(w, r, err)
}

// ServerError sends a 500 Internal Server Error response.
// This is a public wrapper around serverErrorResponse for use by downstream extensions.
func (app *App) ServerError(w http.ResponseWriter, r *http.Request, err error) { //nolint:unused
	app.serverErrorResponse(w, r, err)
}

// NotImplemented sends a 501 Not Implemented response for features not yet available.
// This is used to create placeholder handlers that downstream code can override.
func (app *App) NotImplemented(w http.ResponseWriter, r *http.Request, feature string) { //nolint:unused
	httpError := &HTTPError{
		StatusCode: http.StatusNotImplemented,
		Error: ErrorPayload{
			Code:    strconv.Itoa(http.StatusNotImplemented),
			Message: fmt.Sprintf("the %s feature is not implemented in this build", feature),
		},
	}
	app.errorResponse(w, r, httpError)
}

// EndpointNotImplementedHandler creates a handler that returns 501 Not Implemented.
// Use this to define routes in upstream that downstream can override with actual implementations.
//
// Example usage:
//
//	apiRouter.GET("/api/v1/models", app.EndpointNotImplementedHandler("models"))
func (app *App) EndpointNotImplementedHandler(feature string) func(http.ResponseWriter, *http.Request, httprouter.Params) { //nolint:unused
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		app.NotImplemented(w, r, feature)
	}
}

// Config returns the application configuration.
// This allows downstream extensions to access configuration values.
func (app *App) Config() config.EnvConfig { //nolint:unused
	return app.config
}

// Logger returns the application logger.
// This allows downstream extensions to use the same logger as the app.
func (app *App) Logger() *slog.Logger { //nolint:unused
	return app.logger
}

// KubernetesClientFactory returns the Kubernetes client factory.
// This allows downstream extensions to create Kubernetes clients.
func (app *App) KubernetesClientFactory() k8s.KubernetesClientFactory { //nolint:unused
	return app.kubernetesClientFactory
}

// Repositories returns the repositories container.
// This allows downstream extensions to access the repositories.
func (app *App) Repositories() *repositories.Repositories { //nolint:unused
	return app.repositories
}
