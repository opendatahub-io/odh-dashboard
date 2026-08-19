package api

import (
	"fmt"
	"net/http"

	"log/slog"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
)

// BadRequest exposes the internal bad request helper for extensions.
func (app *App) BadRequest(w http.ResponseWriter, r *http.Request, err error) {
	if app == nil {
		return
	}
	app.badRequestResponse(w, r, err)
}

// ServerError exposes the internal server error helper for extensions.
func (app *App) ServerError(w http.ResponseWriter, r *http.Request, err error) {
	if app == nil {
		return
	}
	app.serverErrorResponse(w, r, err)
}

// NotFound exposes the internal not-found helper for extensions.
func (app *App) NotFound(w http.ResponseWriter, r *http.Request) {
	if app == nil {
		return
	}
	app.notFoundResponse(w, r)
}

// Forbidden exposes the internal forbidden helper for extensions.
func (app *App) Forbidden(w http.ResponseWriter, r *http.Request, message string) {
	if app == nil {
		return
	}
	app.forbiddenResponse(w, r, message)
}

// Conflict exposes the internal conflict helper for extensions.
func (app *App) Conflict(w http.ResponseWriter, r *http.Request, message string) {
	if app == nil {
		return
	}
	app.conflictResponse(w, r, message)
}

// NotImplemented writes a standard placeholder response for unimplemented endpoints.
func (app *App) NotImplemented(w http.ResponseWriter, r *http.Request, feature string) {
	app.serverErrorResponse(w, r, fmt.Errorf("%s is not implemented", feature))
}

// EndpointNotImplementedHandler returns a generic 501 Not Implemented handler.
// Use this for endpoints that are defined upstream but require a downstream override to function.
// Downstream packages must register an override via api.RegisterHandlerOverride() to provide
// the real implementation.
func (app *App) EndpointNotImplementedHandler(feature string) func(http.ResponseWriter, *http.Request, httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		app.NotImplemented(w, r, feature)
	}
}

// Config exposes the application configuration for extensions.
func (app *App) Config() config.EnvConfig {
	return app.config
}

// Logger exposes the application logger for extensions.
func (app *App) Logger() *slog.Logger {
	return app.logger
}

// TrackBackgroundWork runs fn in a new goroutine detached from any request, for best-effort
// work that must not block or fail an HTTP response (e.g. a post-delete cascade cleanup).
// It's tracked so Shutdown can give in-flight work a bounded chance to finish, and any
// panic inside fn is recovered and logged rather than crashing the process -- fn running in
// the background must never be able to take down unrelated in-flight requests.
func (app *App) TrackBackgroundWork(fn func()) {
	if app == nil {
		return
	}
	app.backgroundWg.Add(1)
	go func() {
		defer app.backgroundWg.Done()
		defer func() {
			if r := recover(); r != nil && app.logger != nil {
				app.logger.Error("recovered panic in background work", slog.Any("recover", r))
			}
		}()
		fn()
	}()
}

// KubernetesClientFactory exposes the k8s factory for extensions.
func (app *App) KubernetesClientFactory() k8s.KubernetesClientFactory {
	return app.kubernetesClientFactory
}

// Repositories exposes the repositories container for extensions.
func (app *App) Repositories() *repositories.Repositories {
	return app.repositories
}

// PodNamespace exposes the namespace this pod is running in, for extensions
// that need it to build inter-BFF service URLs.
func (app *App) PodNamespace() string {
	return app.podNamespace
}
