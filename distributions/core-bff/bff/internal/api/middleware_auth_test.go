package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─── InjectRequestIdentity tests ────────────────────────────────────────────

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

	inner, called := trackingHTTPHandler()

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, *called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
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

	inner, called := trackingHTTPHandler()

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=true", nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, *called)
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

	inner, called := trackingHTTPHandler()

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/core-bff/wss/k8s/api/v1/pods?watch=true", nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, *called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// ─── secureRoute tests ─────────────────────────────────────────────────────

func TestSecureRoute_ValidIdentityPassesThrough(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	handle, called := trackingHandle()
	handler := app.secureRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	handler(rr, req, nil)

	assert.True(t, *called)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestSecureRoute_MissingIdentityReturns401(t *testing.T) {
	app := newTestApp()

	handle, called := trackingHandle()
	handler := app.secureRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when identity is missing")
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestSecureRoute_NonAdminUserPassesThrough(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	handle, called := trackingHandle()
	handler := app.secureRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	handler(rr, req, nil)

	assert.True(t, *called, "secureRoute should allow non-admin users through")
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestSecureRoute_GetClientFailureReturns500(t *testing.T) {
	app := newTestApp()

	handle, called := trackingHandle()
	handler := app.secureRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "someone",
		Token:  k8s.NewBearerToken("INVALID_GARBAGE_TOKEN"),
	})

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when GetClient fails")
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ─── secureAdminRoute tests ─────────────────────────────────────────────────

func TestSecureAdminRoute_AdminUserPassesThrough(t *testing.T) {
	app := newTestApp()
	admin := k8mocks.DefaultTestUsers[0]

	handler := app.secureAdminRoute(dummyHandler)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestSecureAdminRoute_NonAdminUserGets403(t *testing.T) {
	app := newTestApp()
	userA := k8mocks.DefaultTestUsers[1]

	handle, called := trackingHandle()
	handler := app.secureAdminRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: userA.UserName,
		Groups: userA.Groups,
		Token:  k8s.NewBearerToken(userA.Token),
	})

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked for non-admin users")
	assert.Equal(t, http.StatusForbidden, rr.Code)

	var body map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &body)
	require.NoError(t, err)

	errObj, ok := body["error"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "FORBIDDEN", errObj["code"])
}

func TestSecureAdminRoute_MissingIdentityGets401(t *testing.T) {
	app := newTestApp()

	handle, called := trackingHandle()
	handler := app.secureAdminRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when identity is missing")
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestSecureAdminRoute_GetClientFailureReturns500(t *testing.T) {
	app := newTestApp()

	handle, called := trackingHandle()
	handler := app.secureAdminRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "someone",
		Token:  k8s.NewBearerToken("INVALID_GARBAGE_TOKEN"),
	})

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when GetClient fails")
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestSecureRoute_GetUserFailureReturns401(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.kubernetesClientFactory = &failingGetUserFactory{}
	})

	handle, called := trackingHandle()
	handler := app.secureRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "expired-user",
		Token:  k8s.NewBearerToken("some-expired-token"),
	})

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when GetUser fails")
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestSecureAdminRoute_GetUserFailureReturns401(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.kubernetesClientFactory = &failingGetUserFactory{}
	})

	handle, called := trackingHandle()
	handler := app.secureAdminRoute(handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: "expired-user",
		Token:  k8s.NewBearerToken("some-expired-token"),
	})

	handler(rr, req, nil)

	assert.False(t, *called, "handler must not be invoked when GetUser fails")
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// ─── Dev-mode identity fallback tests ───────────────────────────────────────

func TestDevModeFallback_ActivatesWhenDevModeEnabled(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.DevUser = "test-dev-user"
		a.config.DevGroups = "group-a,group-b"
	})

	var identity *k8s.RequestIdentity
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		val := r.Context().Value(constants.RequestIdentityKey)
		if val != nil {
			identity = val.(*k8s.RequestIdentity)
		}
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, identity)
	assert.Equal(t, "test-dev-user", identity.UserID)
	assert.Equal(t, []string{"group-a", "group-b"}, identity.Groups)
	assert.True(t, identity.DevFallback, "dev fallback identity must be marked")
}

func TestDevModeFallback_SkippedWhenRealIdentityPresent(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.DevUser = "should-not-use"
	})
	testUser := k8mocks.DefaultTestUsers[0]

	var identity *k8s.RequestIdentity
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		val := r.Context().Value(constants.RequestIdentityKey)
		if val != nil {
			identity = val.(*k8s.RequestIdentity)
		}
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	req.Header.Set(config.DefaultAuthTokenHeader, testUser.Token)
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, identity)
	assert.Equal(t, testUser.Token, identity.Token.Raw(), "real identity should take precedence over dev fallback")
}

func TestDevModeFallback_PlaceholderTokenFromHeaderIsNotTreatedAsFallback(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = true
		a.config.DevUser = "dev-user"
	})

	var identity *k8s.RequestIdentity
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		val := r.Context().Value(constants.RequestIdentityKey)
		if val != nil {
			identity = val.(*k8s.RequestIdentity)
		}
	})

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	req.Header.Set(config.DefaultAuthTokenHeader, config.DefaultDisabledAuthToken)
	handler.ServeHTTP(rr, req)

	require.NotNil(t, identity)
	assert.False(t, identity.DevFallback, "identity from real header must not be marked as dev fallback")
	assert.Equal(t, config.DefaultDisabledAuthToken, identity.Token.Raw())
}

func TestDevModeFallback_GetClientSucceedsForDevFallbackIdentity(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.DevMode = true
	})

	var clientErr error
	handler := app.secureRoute(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		_, clientErr = app.kubernetesClientFactory.GetClient(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID:      "dev-user",
		Token:       k8s.NewBearerToken(config.DefaultDisabledAuthToken),
		DevFallback: true,
	})

	handler(rr, req, nil)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.NoError(t, clientErr, "GetClient should succeed for dev fallback identity")
}

// ─── auditUser tests ──────────────────────────────────────────────────────────

func TestAuditUser_ReturnsUserIDWhenPresent(t *testing.T) {
	identity := &k8s.RequestIdentity{UserID: "jane"}
	assert.Equal(t, "jane", auditUser(identity, testLogger()))
}

func TestAuditUser_ReturnsUnknownForEmptyUserID(t *testing.T) {
	identity := &k8s.RequestIdentity{UserID: ""}
	assert.Equal(t, "unknown", auditUser(identity, testLogger()))
}

func TestAuditUser_ReturnsUnknownForNilIdentity(t *testing.T) {
	assert.Equal(t, "unknown", auditUser(nil, testLogger()))
}

func TestDevModeFallback_DoesNotActivateInProduction(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.AuthMethod = config.AuthMethodUser
		a.config.DevMode = false
	})

	inner, called := trackingHTTPHandler()

	handler := app.InjectRequestIdentity(inner)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIHealthCheckPath, nil)
	handler.ServeHTTP(rr, req)

	assert.False(t, *called)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// ─── requirePlatform tests ──────────────────────────────────────────────────

func TestRequirePlatform_MatchingPlatformPassesThrough(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
	})

	handle, called := trackingHandle()
	handler := app.requirePlatform(config.PlatformOpenShift, handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/openshift-only", nil)

	handler(rr, req, nil)

	assert.True(t, *called)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequirePlatform_MismatchedPlatformReturns404(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
	})

	handle, called := trackingHandle()
	handler := app.requirePlatform(config.PlatformOpenShift, handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/openshift-only", nil)

	handler(rr, req, nil)

	assert.False(t, *called)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestRequirePlatform_XKSRouteOnXKS(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformXKS
	})

	handle, called := trackingHandle()
	handler := app.requirePlatform(config.PlatformXKS, handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/xks-only", nil)

	handler(rr, req, nil)

	assert.True(t, *called)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequirePlatform_XKSRouteOnOpenShiftReturns404(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.PlatformType = config.PlatformOpenShift
	})

	handle, called := trackingHandle()
	handler := app.requirePlatform(config.PlatformXKS, handle)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/xks-only", nil)

	handler(rr, req, nil)

	assert.False(t, *called)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// ─── parseDevGroups tests ───────────────────────────────────────────────────

func TestParseDevGroups(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect []string
	}{
		{"empty string", "", nil},
		{"single group", "admins", []string{"admins"}},
		{"multiple groups", "group-a,group-b,group-c", []string{"group-a", "group-b", "group-c"}},
		{"with spaces", " group-a , group-b ", []string{"group-a", "group-b"}},
		{"trailing comma", "group-a,", []string{"group-a"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseDevGroups(tt.input)
			assert.Equal(t, tt.expect, result)
		})
	}
}
