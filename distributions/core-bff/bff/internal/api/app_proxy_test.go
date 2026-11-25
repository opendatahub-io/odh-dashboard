package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/rest"
)

func TestImpersonateFromIdentity_SetsHeaders(t *testing.T) {
	identity := &k8s.RequestIdentity{
		UserID: "giulio@example.com",
		Groups: []string{models.SystemAuthenticated, "team-a"},
	}
	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, "/", nil), identity)
	out := http.Header{}

	impersonateFromIdentity(req, out)

	assert.Equal(t, "giulio@example.com", out.Get("Impersonate-User"))
	assert.Equal(t, []string{models.SystemAuthenticated, "team-a"}, out.Values("Impersonate-Group"))
}

func TestImpersonateFromIdentity_NoIdentity(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	out := http.Header{}

	impersonateFromIdentity(req, out)

	assert.Empty(t, out.Get("Impersonate-User"))
	assert.Empty(t, out.Values("Impersonate-Group"))
}

func TestImpersonateFromIdentity_EmptyUserID(t *testing.T) {
	identity := &k8s.RequestIdentity{
		UserID: "",
		Groups: []string{models.SystemAuthenticated},
	}
	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, "/", nil), identity)
	out := http.Header{}

	impersonateFromIdentity(req, out)

	assert.Empty(t, out.Get("Impersonate-User"), "should not set headers when UserID is empty")
}

func TestResolveK8sHost_MockClient(t *testing.T) {
	cfg := config.EnvConfig{MockK8Client: true}
	result := k8sSetupResult{testEnv: testEnvInstance}

	host, err := resolveK8sHost(cfg, result)

	assert.NoError(t, err)
	assert.NotEmpty(t, host)
	assert.Equal(t, testEnvInstance.Config.Host, host)
}

func TestResolveK8sHost_MockClientNilTestEnv(t *testing.T) {
	t.Setenv("KUBECONFIG", "/nonexistent/kubeconfig")
	t.Setenv("KUBERNETES_SERVICE_HOST", "")
	t.Setenv("KUBERNETES_SERVICE_PORT", "")

	cfg := config.EnvConfig{MockK8Client: true}
	result := k8sSetupResult{testEnv: nil}

	_, err := resolveK8sHost(cfg, result)

	assert.Error(t, err, "should fail when testEnv is nil and no kubeconfig is available")
	assert.Contains(t, err.Error(), "failed to get kubeconfig for proxy")
}

// The proxies must target the server URL client-go resolves for the REST
// clients: a scheme-less host:port gets the scheme client-go would use, and a
// base path in the server URL is preserved.
func TestResolveK8sHost_UsesClientGoServerURL(t *testing.T) {
	cases := []struct {
		name string
		cfg  rest.Config
		want string
	}{
		{"scheme-less host with CA", rest.Config{Host: "api.cluster.example:6443", TLSClientConfig: rest.TLSClientConfig{CAData: []byte("ca")}}, "https://api.cluster.example:6443"},
		{"scheme-less host without TLS", rest.Config{Host: "127.0.0.1:8080"}, "http://127.0.0.1:8080"},
		{"base path kept", rest.Config{Host: "https://rancher.example/k8s/clusters/c-abc"}, "https://rancher.example/k8s/clusters/c-abc"},
		{"absolute URL unchanged", rest.Config{Host: "https://api.cluster.example:6443"}, "https://api.cluster.example:6443"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			kc := tc.cfg
			host, err := resolveK8sHost(config.EnvConfig{}, k8sSetupResult{kubeconfig: &kc})
			require.NoError(t, err)
			assert.Equal(t, tc.want, host)
		})
	}

	_, err := resolveK8sHost(config.EnvConfig{}, k8sSetupResult{kubeconfig: &rest.Config{Host: "api.cluster.example/extra"}})
	require.Error(t, err, "client-go refuses a scheme-less host with a path; so must the proxies")
}

// /api/status reports the same resolved server URL the proxies target.
func TestReportedServerURL_MatchesProxyTarget(t *testing.T) {
	kc := &rest.Config{Host: "api.cluster.example:6443", TLSClientConfig: rest.TLSClientConfig{CAData: []byte("ca")}}
	host, err := resolveK8sHost(config.EnvConfig{}, k8sSetupResult{kubeconfig: kc})
	require.NoError(t, err)
	assert.Equal(t, host, reportedServerURL(kc))
	assert.Equal(t, "api.cluster.example/extra", reportedServerURL(&rest.Config{Host: "api.cluster.example/extra"}), "unresolvable hosts are reported as configured")
}
