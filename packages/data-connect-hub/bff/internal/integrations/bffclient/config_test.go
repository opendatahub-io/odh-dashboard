package bffclient

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDefaultBFFClientConfig(t *testing.T) {
	cfg := NewDefaultBFFClientConfig()

	assert.False(t, cfg.MockBFFClients)
	assert.False(t, cfg.InsecureSkipVerify)
	assert.Empty(t, cfg.PodNamespace)

	// Verify all targets are configured
	assert.NotNil(t, cfg.GetServiceConfig(BFFTargetMaaS))
	assert.NotNil(t, cfg.GetServiceConfig(BFFTargetGenAI))
	assert.NotNil(t, cfg.GetServiceConfig(BFFTargetModelRegistry))
	assert.NotNil(t, cfg.GetServiceConfig(BFFTargetMLflow))
}

func TestBFFServiceConfig_GetURL_DevOverride(t *testing.T) {
	cfg := &BFFServiceConfig{
		ServiceName:    "odh-dashboard",
		Port:           8243,
		PathPrefix:     "/api/v1",
		DevOverrideURL: "http://localhost:4000/api/v1",
	}

	// Dev override takes priority over everything
	assert.Equal(t, "http://localhost:4000/api/v1", cfg.GetURL("test-namespace"))
}

func TestBFFServiceConfig_GetURL_KubernetesDiscovery(t *testing.T) {
	cfg := &BFFServiceConfig{
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
		TLSEnabled:  false,
	}

	url := cfg.GetURL("my-namespace")
	assert.Equal(t, "http://odh-dashboard.my-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_TLSEnabled(t *testing.T) {
	cfg := &BFFServiceConfig{
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
		TLSEnabled:  true,
	}

	url := cfg.GetURL("my-namespace")
	assert.Equal(t, "https://odh-dashboard.my-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_ExplicitNamespace(t *testing.T) {
	cfg := &BFFServiceConfig{
		ServiceName: "odh-dashboard",
		Namespace:   "explicit-ns",
		Port:        8243,
		PathPrefix:  "/api/v1",
	}

	// Explicit namespace takes priority over podNamespace
	url := cfg.GetURL("pod-namespace")
	assert.Equal(t, "http://odh-dashboard.explicit-ns.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_FallbackNamespace(t *testing.T) {
	cfg := &BFFServiceConfig{
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
	}

	// With no namespace at all, falls back to "opendatahub"
	url := cfg.GetURL("")
	assert.Equal(t, "http://odh-dashboard.opendatahub.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_EnvNamespace(t *testing.T) {
	t.Setenv("POD_NAMESPACE", "env-namespace")

	cfg := &BFFServiceConfig{
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
	}

	url := cfg.GetURL("")
	assert.Equal(t, "http://odh-dashboard.env-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFClientConfig_GetServiceConfig(t *testing.T) {
	cfg := NewDefaultBFFClientConfig()

	t.Run("existing target", func(t *testing.T) {
		maasConfig := cfg.GetServiceConfig(BFFTargetMaaS)
		require.NotNil(t, maasConfig)
		assert.Equal(t, BFFTargetMaaS, maasConfig.Target)
		assert.Equal(t, 8243, maasConfig.Port)
	})

	t.Run("non-existing target", func(t *testing.T) {
		result := cfg.GetServiceConfig(BFFTarget("unknown"))
		assert.Nil(t, result)
	})
}

func TestDefaultPortAssignments(t *testing.T) {
	cfg := NewDefaultBFFClientConfig()

	tests := []struct {
		target BFFTarget
		port   int
	}{
		{BFFTargetModelRegistry, 8043},
		{BFFTargetGenAI, 8143},
		{BFFTargetMaaS, 8243},
		{BFFTargetMLflow, 8343},
	}

	for _, tt := range tests {
		t.Run(string(tt.target), func(t *testing.T) {
			config := cfg.GetServiceConfig(tt.target)
			require.NotNil(t, config)
			assert.Equal(t, tt.port, config.Port)
		})
	}
}
