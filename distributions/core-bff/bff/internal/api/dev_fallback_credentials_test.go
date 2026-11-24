package api

import (
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
