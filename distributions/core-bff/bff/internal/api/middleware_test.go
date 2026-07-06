package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
)

// ─── CORS tests ─────────────────────────────────────────────────────────────

func TestEnableCORS_NoOriginsConfigured(t *testing.T) {
	app := newTestApp()

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := app.EnableCORS(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(rr, req)

	assert.True(t, called, "handler should pass through when no origins are configured")
}

func TestEnableCORS_PreflightRequest(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AllowedOrigins = []string{"http://localhost:9112"}
	})

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("inner handler should not be called for preflight")
	})

	handler := app.EnableCORS(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/user", nil)
	req.Header.Set("Origin", "http://localhost:9112")
	req.Header.Set("Access-Control-Request-Method", "GET")
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Contains(t, rr.Header().Get("Access-Control-Allow-Origin"), "http://localhost:9112")
}

func TestEnableCORS_RegularRequest(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AllowedOrigins = []string{"http://localhost:9112"}
	})

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := app.EnableCORS(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/user", nil)
	req.Header.Set("Origin", "http://localhost:9112")
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
	assert.Equal(t, "http://localhost:9112", rr.Header().Get("Access-Control-Allow-Origin"))
}

// ─── RecoverPanic tests ─────────────────────────────────────────────────────

func TestRecoverPanic_HandlerPanics(t *testing.T) {
	app := newTestApp()

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("test panic")
	})

	handler := app.RecoverPanic(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Equal(t, "close", rr.Header().Get("Connection"))
}

func TestRecoverPanic_HandlerDoesNotPanic(t *testing.T) {
	app := newTestApp()

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := app.RecoverPanic(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
	assert.Equal(t, http.StatusOK, rr.Code)
}

// ─── EnableTelemetry tests ──────────────────────────────────────────────────

func TestEnableTelemetry_InjectsTraceID(t *testing.T) {
	app := newTestApp()

	var traceID any
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID = r.Context().Value(constants.TraceIDKey)
	})

	handler := app.EnableTelemetry(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(rr, req)

	assert.NotNil(t, traceID)
	assert.NotEmpty(t, traceID.(string))
}
