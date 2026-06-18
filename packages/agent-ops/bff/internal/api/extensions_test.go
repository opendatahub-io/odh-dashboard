package api

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/stretchr/testify/require"
)

func TestHandlerWithOverride_UsesRegisteredOverride(t *testing.T) {
	t.Cleanup(func() {
		handlerOverrideMu.Lock()
		delete(handlerOverrides, HandlerUserID)
		handlerOverrideMu.Unlock()
	})

	RegisterHandlerOverride(HandlerUserID, func(_ *App, _ func() httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
			w.WriteHeader(http.StatusTeapot)
		}
	})

	app := &App{logger: slog.Default()}
	handler := app.handlerWithOverride(HandlerUserID, func() httprouter.Handle {
		return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
			w.WriteHeader(http.StatusOK)
		}
	})

	rr := httptest.NewRecorder()
	handler(rr, httptest.NewRequest(http.MethodGet, UserPath, nil), nil)
	require.Equal(t, http.StatusTeapot, rr.Code)
}

func TestHandlerWithOverride_UsesDefaultWhenNoOverride(t *testing.T) {
	app := &App{logger: slog.Default()}
	handler := app.handlerWithOverride(HandlerUserID, func() httprouter.Handle {
		return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
			w.WriteHeader(http.StatusOK)
		}
	})

	rr := httptest.NewRecorder()
	handler(rr, httptest.NewRequest(http.MethodGet, UserPath, nil), nil)
	require.Equal(t, http.StatusOK, rr.Code)
}
