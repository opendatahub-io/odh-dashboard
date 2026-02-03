package api

import (
	"log/slog"
	"sync"

	"github.com/julienschmidt/httprouter"
)

// HandlerID is a unique identifier for a handler that can be overridden by downstream code.
type HandlerID string

// Pre-defined handler IDs for starter endpoints (can be overridden by downstream).
const (
	HandlerUserID       HandlerID = "user:get"
	HandlerNamespacesID HandlerID = "namespaces:list"
)

// HandlerFactory is a function that creates an httprouter.Handle.
// It receives the App instance and a function to build the default handler.
// The factory can choose to:
//   - Call buildDefault() to get the default handler and wrap/modify it
//   - Ignore buildDefault() and return a completely custom handler
//   - Call buildDefault() for some code paths and return custom logic for others
type HandlerFactory func(app *App, buildDefault func() httprouter.Handle) httprouter.Handle

var (
	handlerOverrideMu sync.RWMutex
	handlerOverrides  = map[HandlerID]HandlerFactory{}
)

// RegisterHandlerOverride registers a handler override for the given HandlerID.
// This should be called from an init() function in the downstream code.
// The factory function receives the App instance and a function to build the default handler.
//
// Example usage in downstream code:
//
//	func init() {
//	    api.RegisterHandlerOverride(api.HandlerUserID, func(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
//	        return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
//	            // Custom implementation
//	        }
//	    })
//	}
func RegisterHandlerOverride(id HandlerID, factory HandlerFactory) { //nolint:unused
	handlerOverrideMu.Lock()
	defer handlerOverrideMu.Unlock()
	handlerOverrides[id] = factory
}

// getHandlerOverride returns the registered handler override for the given HandlerID.
// Returns nil if no override is registered.
func getHandlerOverride(id HandlerID) HandlerFactory {
	handlerOverrideMu.RLock()
	defer handlerOverrideMu.RUnlock()
	return handlerOverrides[id]
}

// handlerWithOverride returns the handler for the given HandlerID.
// If an override is registered, it uses the override factory.
// Otherwise, it uses the default handler from buildDefault.
func (app *App) handlerWithOverride(id HandlerID, buildDefault func() httprouter.Handle) httprouter.Handle {
	if override := getHandlerOverride(id); override != nil {
		app.logHandlerOverride(id)
		return override(app, buildDefault)
	}
	return buildDefault()
}

// logHandlerOverride logs that a handler override is being applied.
func (app *App) logHandlerOverride(id HandlerID) {
	app.logger.Info("applying handler override", slog.String("handler_id", string(id)))
}
