package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInjectRequestIdentity_DisabledAuth(t *testing.T) {
	app := newTestApp()

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		assert.NotNil(t, identity, "identity should be injected even with auth disabled")

		ri, ok := identity.(*k8s.RequestIdentity)
		require.True(t, ok)
		assert.Equal(t, config.DefaultDisabledAuthToken, ri.Token.Raw())
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
}

func TestInjectRequestIdentity_ValidToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})
	testUser := k8mocks.DefaultTestUsers[0]

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		require.NotNil(t, identity)

		ri, ok := identity.(*k8s.RequestIdentity)
		require.True(t, ok)
		assert.Equal(t, testUser.Token, ri.Token.Raw())
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	req.Header.Set(config.DefaultAuthTokenHeader, testUser.Token)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
}

func TestInjectRequestIdentity_MissingToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestInjectRequestIdentity_SkipsNonAPIRoutes(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		assert.Nil(t, identity, "non-API routes should not have identity injected")
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/some-static-page", nil)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestInjectRequestIdentity_WssPath_DisabledAuth(t *testing.T) {
	app := newTestApp()

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		assert.NotNil(t, identity, "WebSocket path should have identity injected")

		ri, ok := identity.(*k8s.RequestIdentity)
		require.True(t, ok)
		assert.Equal(t, config.DefaultDisabledAuthToken, ri.Token.Raw())
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
}

func TestInjectRequestIdentity_WssPath_ValidToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})
	testUser := k8mocks.DefaultTestUsers[0]

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		require.NotNil(t, identity)

		ri, ok := identity.(*k8s.RequestIdentity)
		require.True(t, ok)
		assert.Equal(t, testUser.Token, ri.Token.Raw())
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=true", nil)
	req.Header.Set(config.DefaultAuthTokenHeader, testUser.Token)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
}

func TestInjectRequestIdentity_WssPath_MissingToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=true", nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestInjectRequestIdentity_WssPathWithPrefix_ValidToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})
	testUser := k8mocks.DefaultTestUsers[0]

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		identity := r.Context().Value(constants.RequestIdentityKey)
		require.NotNil(t, identity)

		ri, ok := identity.(*k8s.RequestIdentity)
		require.True(t, ok)
		assert.Equal(t, testUser.Token, ri.Token.Raw())
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/core-bff/wss/k8s/api/v1/pods?watch=true", nil)
	req.Header.Set(config.DefaultAuthTokenHeader, testUser.Token)
	handler.ServeHTTP(rr, req)

	assert.True(t, called)
}

func TestInjectRequestIdentity_WssPathWithPrefix_MissingToken(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
	})

	var called bool
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/core-bff/wss/k8s/api/v1/pods?watch=true", nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

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
