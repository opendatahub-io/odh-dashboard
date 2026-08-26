package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestApp(cfg config.EnvConfig) *App {
	return &App{config: cfg, logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
}

func TestOpenShellAuthConfigHandler(t *testing.T) {
	t.Run("reports not configured when unset", func(t *testing.T) {
		app := newTestApp(config.EnvConfig{})
		rr := httptest.NewRecorder()
		app.OpenShellAuthConfigHandler(rr, httptest.NewRequest(http.MethodGet, OpenShellAuthConfigPath, nil))

		require.Equal(t, http.StatusOK, rr.Code)
		var got openShellAuthConfig
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &got))
		assert.False(t, got.Configured)
	})

	t.Run("advertises client config when wired", func(t *testing.T) {
		app := newTestApp(config.EnvConfig{
			OpenShellBFFURL:       "https://openshell-bff.svc:8080",
			OpenShellOIDCIssuer:   "https://keycloak/realms/openshell",
			OpenShellOIDCClientID: "openshell-dashboard",
			OpenShellOIDCAudience: "openshell-gateway",
			OpenShellOIDCScope:    "openid profile",
		})
		rr := httptest.NewRecorder()
		app.OpenShellAuthConfigHandler(rr, httptest.NewRequest(http.MethodGet, OpenShellAuthConfigPath, nil))

		require.Equal(t, http.StatusOK, rr.Code)
		var got openShellAuthConfig
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &got))
		assert.True(t, got.Configured)
		assert.Equal(t, "https://keycloak/realms/openshell", got.Issuer)
		assert.Equal(t, "openshell-dashboard", got.ClientID)
		assert.Equal(t, "openshell-gateway", got.Audience)
		// Default: OpenShell is a separate provider — no shared session.
		assert.False(t, got.SharedSession)
	})

	t.Run("advertises sharedSession when the IdP is shared", func(t *testing.T) {
		app := newTestApp(config.EnvConfig{
			OpenShellBFFURL:            "https://openshell-bff.svc:8080",
			OpenShellOIDCIssuer:        "https://keycloak/realms/openshell",
			OpenShellOIDCClientID:      "openshell-dashboard",
			OpenShellOIDCSharedSession: true,
		})
		rr := httptest.NewRecorder()
		app.OpenShellAuthConfigHandler(rr, httptest.NewRequest(http.MethodGet, OpenShellAuthConfigPath, nil))

		require.Equal(t, http.StatusOK, rr.Code)
		var got openShellAuthConfig
		require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &got))
		assert.True(t, got.SharedSession)
	})
}

func TestOpenShellProxyDisabled(t *testing.T) {
	app := newTestApp(config.EnvConfig{}) // no OPENSHELL_BFF_URL
	handler, err := app.OpenShellProxyHandler()
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/openshell/api/v1/workspaces", nil))

	assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.Equal(t, "openshell_disabled", body["code"])
}

func TestOpenShellProxyStripsTokenAForwardsTokenB(t *testing.T) {
	// Fake OpenShell relay BFF captures what the proxy forwards.
	var gotPath, gotAuth, gotXFAT, gotCookie, gotCustom string
	relay := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotXFAT = r.Header.Get("X-Forwarded-Access-Token")
		gotCookie = r.Header.Get("Cookie")
		gotCustom = r.Header.Get(OpenShellAuthHeader)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer relay.Close()

	app := newTestApp(config.EnvConfig{OpenShellBFFURL: relay.URL})
	handler, err := app.OpenShellProxyHandler()
	require.NoError(t, err)

	// Simulate the real RHOAI path: the data-science-gateway ext-authz has
	// already rewritten Authorization AND x-forwarded-access-token to the
	// platform's opaque OpenShift token (Token A). Token B rides the dedicated
	// header the gateway leaves untouched.
	req := httptest.NewRequest(http.MethodGet, "/openshell/api/v1/workspaces", nil)
	req.Header.Set(OpenShellAuthHeader, "Bearer TOKEN_B")   // browser silent-OIDC token
	req.Header.Set("Authorization", "Bearer TOKEN_A")       // RHOAI-clobbered — must NOT cross
	req.Header.Set("X-Forwarded-Access-Token", "TOKEN_A")   // RHOAI token — must NOT cross
	req.Header.Set("Cookie", "_oauth2_proxy=rhoai-session") // RHOAI session — must NOT cross
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "/api/v1/workspaces", gotPath, "/openshell prefix must be stripped")
	// Token A must not cross on ANY header; Token B is re-projected onto both the
	// relay's primary header (x-forwarded-access-token) and Authorization.
	assert.Equal(t, "TOKEN_B", gotXFAT, "x-forwarded-access-token must carry Token B, not Token A")
	assert.Equal(t, "Bearer TOKEN_B", gotAuth, "Authorization must be overwritten with Token B")
	assert.Empty(t, gotCustom, "the dedicated Token B header must not leak to the relay")
	assert.Empty(t, gotCookie, "RHOAI session cookie must be stripped at the trust boundary")
}

// Standalone/dev fallback: no fronting gateway, so Token B arrives on the
// standard Authorization header and must still be forwarded.
func TestOpenShellProxyFallsBackToAuthorization(t *testing.T) {
	var gotAuth, gotXFAT string
	relay := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotXFAT = r.Header.Get("X-Forwarded-Access-Token")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer relay.Close()

	app := newTestApp(config.EnvConfig{OpenShellBFFURL: relay.URL})
	handler, err := app.OpenShellProxyHandler()
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/openshell/api/v1/workspaces", nil)
	req.Header.Set("Authorization", "Bearer TOKEN_B")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "TOKEN_B", gotXFAT, "x-forwarded-access-token must carry Token B from Authorization")
	assert.Equal(t, "Bearer TOKEN_B", gotAuth, "Authorization must carry Token B")
}
