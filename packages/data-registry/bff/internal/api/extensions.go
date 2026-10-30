package api

import (
	"log/slog"
	"sync"

	"github.com/julienschmidt/httprouter"
)

// HandlerID identifies an entry in the handler override registry. The current App.Routes
// implementation does not consult this registry.
type HandlerID string

// Pre-defined IDs retained for source compatibility with downstream code.
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

// RegisterHandlerOverride stores a handler factory for the given ID.
//
// Deprecated: App.Routes does not consult the override registry, so registering a factory has no
// effect on the handlers served by the current BFF.
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

// handlerWithOverride applies a registered factory when route code explicitly calls it. The
// current App.Routes implementation does not call this helper.
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
