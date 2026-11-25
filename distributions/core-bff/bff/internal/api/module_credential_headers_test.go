package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Review 6060889411: Authorization and X-Forwarded-Access-Token are reserved on
// authorized module routes whichever header ingress reads, together with the
// configured AUTH_TOKEN_HEADER. Startup rejects a static value in any of them.
func TestValidateProxyEntries_ReservesEveryCredentialHeader(t *testing.T) {
	entry := func(header string, authorize bool) []normalizedProxyEntry {
		e := moduleProxyServiceEntry{
			Authorize: authorize, Path: "/m/api", PathRewrite: "/api",
			Service: moduleServiceRef{Name: "svc", Namespace: "ns", Port: 8080},
			Headers: map[string]string{header: "static"},
		}
		return []normalizedProxyEntry{{entryName: "m", service: e}}
	}
	for _, tc := range []struct {
		name, ingress, header string
		rejected              bool
	}{
		{"default ingress, Authorization", "x-forwarded-access-token", "Authorization", true},
		{"default ingress, forwarded token", "x-forwarded-access-token", "X-Forwarded-Access-Token", true},
		{"Authorization ingress, forwarded token", "Authorization", "x-forwarded-access-token", true},
		{"other ingress header, forwarded token", "X-Auth-Token", "X-Forwarded-Access-Token", true},
		{"other ingress header, Authorization", "X-Auth-Token", "authorization", true},
		{"other ingress header, itself", "X-Auth-Token", "x-auth-token", true},
		{"empty ingress header, forwarded token", "", "X-Forwarded-Access-Token", true},
		{"empty ingress header, Authorization", "", "Authorization", true},
		{"unrelated header", "X-Auth-Token", "X-Tenant", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := validateProxyEntries(entry(tc.header, true), tc.ingress)
			if !tc.rejected {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), "while authorize is enabled")
			assert.NotContains(t, err.Error(), "static", "the configured value is never echoed")
		})
	}
	// A module that does not authorize carries no caller identity, so its
	// static headers are the operator's to set.
	require.NoError(t, validateProxyEntries(entry("Authorization", false), "x-forwarded-access-token"))
}

// At request time a static value in a reserved header never reaches an
// authorized module, even if one bypassed startup validation: the headers carry
// the resolved token, or nothing when the identity has none.
func TestModuleProxy_CredentialHeadersCarryOnlyTheResolvedToken(t *testing.T) {
	var got http.Header
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Clone()
	}))
	defer backend.Close()

	static := map[string]string{
		"Authorization": "Bearer static", "X-Forwarded-Access-Token": "static", "X-Auth-Token": "static", "X-Tenant": "blue",
	}
	tokenless := &k8s.RequestIdentity{UserID: "developer", DevFallback: true}
	mock := &k8s.RequestIdentity{UserID: "user@example.com", Token: k8s.NewBearerToken("mock-token")}

	for _, tc := range []struct {
		name     string
		ingress  string
		identity *k8s.RequestIdentity
		want     map[string]string
	}{
		{"certificate-only dev fallback, default ingress", "x-forwarded-access-token", tokenless,
			map[string]string{"Authorization": "", "X-Forwarded-Access-Token": "", "X-Auth-Token": "static"}},
		{"certificate-only dev fallback, other ingress header", "X-Auth-Token", tokenless,
			map[string]string{"Authorization": "", "X-Forwarded-Access-Token": "", "X-Auth-Token": ""}},
		{"certificate-only dev fallback, empty ingress header", "", tokenless,
			map[string]string{"Authorization": "", "X-Forwarded-Access-Token": ""}},
		{"no identity", "X-Auth-Token", nil,
			map[string]string{"Authorization": "", "X-Forwarded-Access-Token": "", "X-Auth-Token": ""}},
		{"mock identity, other ingress header", "X-Auth-Token", mock,
			map[string]string{"Authorization": "Bearer mock-token", "X-Forwarded-Access-Token": "mock-token", "X-Auth-Token": "mock-token"}},
		{"mock identity, Authorization ingress", "Authorization", mock,
			map[string]string{"Authorization": "Bearer mock-token", "X-Forwarded-Access-Token": "mock-token"}},
		{"mock identity, empty ingress header", "", mock,
			map[string]string{"Authorization": "Bearer mock-token", "X-Forwarded-Access-Token": ""}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			app := newTestApp(func(a *App) {
				a.config.DevMode = true
				a.config.AuthTokenHeader = tc.ingress
				a.devFallbackToken = ""
			})
			h := createTestProxy(t, app, backend.URL, "/m/api", "/api", true, false, static)
			req := httptest.NewRequest(http.MethodGet, "/m/api/items", nil)
			req.Header.Set("X-Forwarded-Access-Token", "client-spoof")
			if tc.identity != nil {
				req = reqWithIdentity(req, tc.identity)
			}
			got = nil
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			require.Equal(t, http.StatusOK, rr.Code)
			require.NotNil(t, got)
			for k, v := range tc.want {
				assert.Equal(t, v, got.Get(k), k)
			}
			assert.Equal(t, "blue", got.Get("X-Tenant"), "unrelated static headers are kept")
		})
	}
}
