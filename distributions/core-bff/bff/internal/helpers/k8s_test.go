package helpers

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	clientRest "k8s.io/client-go/rest"
)

func TestGetKubeconfig_FallbackError(t *testing.T) {
	t.Setenv("KUBECONFIG", "/nonexistent/kubeconfig")
	t.Setenv("KUBERNETES_SERVICE_HOST", "")
	t.Setenv("KUBERNETES_SERVICE_PORT", "")

	_, err := GetKubeconfig()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no kubeconfig found")
	assert.Contains(t, err.Error(), "not running in-cluster")
}

func TestGetKubeconfig_MalformedConfigDoesNotFallback(t *testing.T) {
	dir := t.TempDir()
	badKubeconfig := dir + "/kubeconfig"
	// Valid YAML but invalid kubeconfig: current-context references a context not in the list
	content := `apiVersion: v1
kind: Config
current-context: does-not-exist
contexts: []
clusters: []
users: []
`
	require.NoError(t, os.WriteFile(badKubeconfig, []byte(content), 0600))
	t.Setenv("KUBECONFIG", badKubeconfig)

	fakeInCluster := func() (*clientRest.Config, error) {
		return &clientRest.Config{Host: "https://10.0.0.1:6443"}, nil
	}

	_, err := getKubeconfig(fakeInCluster)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "kubeconfig found but invalid")
}

func TestGetCurrentContext_ReturnsNonEmpty(t *testing.T) {
	ctx := GetCurrentContext()
	assert.NotEmpty(t, ctx)
}

func TestGetCurrentContext_FallsBackToInCluster(t *testing.T) {
	t.Setenv("KUBECONFIG", "/nonexistent/kubeconfig")
	ctx := GetCurrentContext()
	assert.Equal(t, "inClusterContext", ctx)
}

func TestGetKubeconfig_InClusterFallback(t *testing.T) {
	t.Setenv("KUBECONFIG", "/nonexistent/kubeconfig")

	fakeConfig := &clientRest.Config{Host: "https://10.0.0.1:6443"}
	fakeInCluster := func() (*clientRest.Config, error) {
		return fakeConfig, nil
	}

	cfg, err := getKubeconfig(fakeInCluster)
	require.NoError(t, err)
	assert.Equal(t, "https://10.0.0.1:6443", cfg.Host)
}
