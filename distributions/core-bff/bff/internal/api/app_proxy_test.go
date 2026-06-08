package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
)

func TestImpersonateFromIdentity_SetsHeaders(t *testing.T) {
	identity := &k8s.RequestIdentity{
		UserID: "giulio@example.com",
		Groups: []string{"system:authenticated", "team-a"},
	}
	req := reqWithIdentity(httptest.NewRequest(http.MethodGet, "/", nil), identity)
	out := http.Header{}

	impersonateFromIdentity(req, out)

	assert.Equal(t, "giulio@example.com", out.Get("Impersonate-User"))
	assert.Equal(t, []string{"system:authenticated", "team-a"}, out.Values("Impersonate-Group"))
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
		Groups: []string{"system:authenticated"},
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
