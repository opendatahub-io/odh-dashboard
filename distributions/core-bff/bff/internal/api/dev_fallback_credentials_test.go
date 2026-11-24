package api

import (
	"bufio"
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
		AuthTokenHeader: "X-Forwarded-Access-Token",
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
		// A credential in Authorization is still a credential: it must not
		// be swapped for the developer's identity.
		{"credential in Authorization instead", "Authorization: Bearer low-privilege-caller\r\n", http.StatusUnauthorized, false},
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
