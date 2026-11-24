package api

import (
	"bufio"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// In DEV_MODE only a request with no credential runs on the developer's
// kubeconfig identity. A credential that was sent but is malformed is the
// caller's: it gets 401, never the stronger fallback identity.
func TestDevModeFallback_OnlyForMissingCredentials(t *testing.T) {
	cfg := config.EnvConfig{
		DevMode:         true,
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: constants.HeaderAuthorization,
		AuthTokenPrefix: k8s.BearerTokenPrefix,
		DevUser:         "dev-user",
	}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})

	for _, tc := range []struct {
		name     string
		header   *string
		status   int
		fallback bool
	}{
		{"no credential", nil, http.StatusOK, true},
		{"wrong scheme", ptrTo("Basic dXNlcjpwYXNz"), http.StatusUnauthorized, false},
		{"empty bearer", ptrTo("Bearer    "), http.StatusUnauthorized, false},
		{"whitespace only", ptrTo("   "), http.StatusUnauthorized, false},
		{"valid bearer", ptrTo("Bearer caller-token"), http.StatusOK, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var identity *k8s.RequestIdentity
			handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				identity, _ = r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			}))
			req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
			if tc.header != nil {
				req.Header.Set(constants.HeaderAuthorization, *tc.header)
			}
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			require.Equal(t, tc.status, rr.Code, rr.Body.String())
			if tc.status != http.StatusOK {
				assert.Nil(t, identity, "a rejected credential never reaches the handler")
				return
			}
			require.NotNil(t, identity)
			assert.Equal(t, tc.fallback, identity.DevFallback)
		})
	}
}

func ptrTo(s string) *string { return &s }

// Through a real connection the HTTP parser trims header values, so an empty
// and a whitespace-only header both arrive as "". Only an absent header may
// fall back; a sent-but-empty one is an invalid credential.
func TestDevModeFallback_EmptyHeaderOnTheWireIsNotMissing(t *testing.T) {
	cfg := config.EnvConfig{
		DevMode:         true,
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: constants.HeaderForwardedToken,
		DevUser:         "dev-user",
	}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})
	srv := httptest.NewServer(app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, _ := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if identity != nil && identity.DevFallback {
			w.Header().Set("X-Test-Fallback", "true")
		}
	})))
	defer srv.Close()

	for _, tc := range []struct {
		name, header string
		status       int
		fallback     bool
	}{
		{"absent", "", http.StatusOK, true},
		{"empty", "X-Forwarded-Access-Token:\r\n", http.StatusUnauthorized, false},
		{"whitespace only", "X-Forwarded-Access-Token:    \r\n", http.StatusUnauthorized, false},
		{"lower-case name, empty", "x-forwarded-access-token: \r\n", http.StatusUnauthorized, false},
		// A credential in Authorization is still the caller's: it is used,
		// never swapped for the developer's identity; a malformed one is 401.
		{"credential in Authorization instead", "Authorization: Bearer low-privilege-caller\r\n", http.StatusOK, false},
		{"Basic credential in Authorization", "Authorization: Basic dXNlcjpwYXNz\r\n", http.StatusUnauthorized, false},
		{"empty Authorization", "Authorization:\r\n", http.StatusUnauthorized, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			conn, err := net.Dial("tcp", srv.Listener.Addr().String())
			require.NoError(t, err)
			defer conn.Close()
			_, err = fmt.Fprintf(conn, "GET /api/config HTTP/1.1\r\nHost: x\r\n%sConnection: close\r\n\r\n", tc.header)
			require.NoError(t, err)
			resp, err := http.ReadResponse(bufio.NewReader(conn), nil)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, tc.status, resp.StatusCode)
			assert.Equal(t, tc.fallback, resp.Header.Get("X-Test-Fallback") == "true")
		})
	}
}

// The reverse of the Authorization case: with AUTH_TOKEN_HEADER=Authorization,
// a caller token in X-Forwarded-Access-Token is still a credential.
func TestDevModeFallback_ForwardedTokenIsACredentialWhenAuthorizationIsConfigured(t *testing.T) {
	cfg := config.EnvConfig{
		DevMode:         true,
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: constants.HeaderAuthorization,
		AuthTokenPrefix: k8s.BearerTokenPrefix,
		DevUser:         "dev-user",
	}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})
	var identity *k8s.RequestIdentity
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, _ = r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req.Header.Set(constants.HeaderForwardedToken, "caller-token")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, identity)
	assert.False(t, identity.DevFallback, "the caller's own token is used, not the developer's identity")
	assert.Equal(t, "caller-token", identity.Token.Raw())
}

// The host dashboard's module proxy sends Authorization: Bearer while the
// federated dev target reads x-forwarded-access-token. The caller's token is
// what the request runs on.
func TestDevModeFallback_AuthorizationTokenIsUsedWhenAnotherHeaderIsConfigured(t *testing.T) {
	cfg := config.EnvConfig{
		DevMode:         true,
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		DevUser:         "dev-user",
	}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})
	var identity *k8s.RequestIdentity
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, _ = r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	req.Header.Set(constants.HeaderAuthorization, "bearer  caller-token ")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, identity)
	assert.False(t, identity.DevFallback)
	assert.Equal(t, "caller-token", identity.Token.Raw())
}

// A browser's only way to send a token on a WebSocket is the bearer
// subprotocol. In DEV_MODE that is the caller's credential, not a request
// without one, so it is used instead of the developer's identity.
func TestDevModeFallback_WebSocketBearerSubprotocolIsACredential(t *testing.T) {
	cfg := config.EnvConfig{
		DevMode:         true,
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		DevUser:         "dev-user",
	}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})
	var identity *k8s.RequestIdentity
	handler := app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, _ = r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	}))

	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	req.Header.Set("Sec-WebSocket-Protocol", "base64url.bearer.authorization.k8s.io."+
		base64.RawURLEncoding.EncodeToString([]byte("caller-token"))+", base64.binary.k8s.io")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, identity)
	assert.False(t, identity.DevFallback)
	assert.Equal(t, "caller-token", identity.Token.Raw())

	req = httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods", nil)
	req.Header.Set("Sec-WebSocket-Protocol", "base64url.bearer.authorization.k8s.io.!!!")
	identity = nil
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code, "an undecodable bearer subprotocol is an invalid credential")
	assert.Nil(t, identity)
}

// Over a real socket, a bearer subprotocol on a second header line is still a
// credential: it must not fall back to the developer's identity.
func TestDevModeFallback_BearerSubprotocolOnASecondLine(t *testing.T) {
	cfg := config.EnvConfig{DevMode: true, AuthMethod: config.AuthMethodUser, AuthTokenHeader: config.DefaultAuthTokenHeader, DevUser: "dev-user"}
	app := newTestApp(func(a *App) {
		a.config = cfg
		a.kubernetesClientFactory = k8s.NewTokenClientFactory(testLogger(), cfg)
	})
	srv := httptest.NewServer(app.InjectRequestIdentity(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, _ := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if identity != nil && identity.DevFallback {
			w.Header().Set("X-Test-Fallback", "true")
		}
	})))
	defer srv.Close()

	conn, err := net.Dial("tcp", srv.Listener.Addr().String())
	require.NoError(t, err)
	defer conn.Close()
	_, err = fmt.Fprintf(conn, "GET /wss/k8s/api/v1/pods HTTP/1.1\r\nHost: x\r\n"+
		"Sec-WebSocket-Protocol: base64.binary.k8s.io\r\n"+
		"Sec-WebSocket-Protocol: base64url.bearer.authorization.k8s.io.%s\r\nConnection: close\r\n\r\n",
		base64.RawURLEncoding.EncodeToString([]byte("caller-token")))
	require.NoError(t, err)
	resp, err := http.ReadResponse(bufio.NewReader(conn), nil)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Empty(t, resp.Header.Get("X-Test-Fallback"), "the caller's subprotocol token is used, not the fallback")
}
