package helpers

import (
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
