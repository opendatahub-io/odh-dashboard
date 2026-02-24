package bffclient

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewDefaultBFFClientConfig(t *testing.T) {
	config := NewDefaultBFFClientConfig()

	assert.False(t, config.MockBFFClients)
	assert.False(t, config.InsecureSkipVerify)
	assert.Empty(t, config.PodNamespace)

	// Check MaaS config
	maasConfig := config.GetServiceConfig(BFFTargetMaaS)
	assert.NotNil(t, maasConfig)
	assert.Equal(t, BFFTargetMaaS, maasConfig.Target)
	assert.Equal(t, "odh-dashboard", maasConfig.ServiceName)
	assert.Equal(t, 8243, maasConfig.Port)
	assert.Equal(t, "/api/v1", maasConfig.PathPrefix)
	assert.False(t, maasConfig.TLSEnabled)

	// Check GenAI config
	genAIConfig := config.GetServiceConfig(BFFTargetGenAI)
	assert.NotNil(t, genAIConfig)
	assert.Equal(t, 8143, genAIConfig.Port)

	// Check ModelRegistry config
	mrConfig := config.GetServiceConfig(BFFTargetModelRegistry)
	assert.NotNil(t, mrConfig)
	assert.Equal(t, 8043, mrConfig.Port)
}

func TestBFFServiceConfig_GetURL_DevOverride(t *testing.T) {
	config := &BFFServiceConfig{
		Target:         BFFTargetMaaS,
		ServiceName:    "odh-dashboard",
		Port:           8243,
		PathPrefix:     "/api/v1",
		DevOverrideURL: "http://localhost:4000/api/v1",
	}

	url := config.GetURL("test-namespace")
	assert.Equal(t, "http://localhost:4000/api/v1", url)
}

func TestBFFServiceConfig_GetURL_K8sDNS(t *testing.T) {
	config := &BFFServiceConfig{
		Target:      BFFTargetMaaS,
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
		TLSEnabled:  false,
	}

	url := config.GetURL("test-namespace")
	assert.Equal(t, "http://odh-dashboard.test-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_K8sDNS_WithTLS(t *testing.T) {
	config := &BFFServiceConfig{
		Target:      BFFTargetMaaS,
		ServiceName: "maas-bff",
		Port:        8243,
		PathPrefix:  "/api/v1",
		TLSEnabled:  true,
	}

	url := config.GetURL("production")
	assert.Equal(t, "https://maas-bff.production.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_ExplicitNamespace(t *testing.T) {
	config := &BFFServiceConfig{
		Target:      BFFTargetMaaS,
		ServiceName: "maas-bff",
		Namespace:   "maas-namespace",
		Port:        8243,
		PathPrefix:  "/api/v1",
		TLSEnabled:  false,
	}

	// Explicit namespace should take precedence over podNamespace
	url := config.GetURL("pod-namespace")
	assert.Equal(t, "http://maas-bff.maas-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_FromEnv(t *testing.T) {
	// Set POD_NAMESPACE env var
	os.Setenv("POD_NAMESPACE", "env-namespace")
	defer os.Unsetenv("POD_NAMESPACE")

	config := &BFFServiceConfig{
		Target:      BFFTargetMaaS,
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
	}

	// Empty podNamespace should use env var
	url := config.GetURL("")
	assert.Equal(t, "http://odh-dashboard.env-namespace.svc.cluster.local:8243/api/v1", url)
}

func TestBFFServiceConfig_GetURL_DefaultNamespace(t *testing.T) {
	// Make sure POD_NAMESPACE is not set
	os.Unsetenv("POD_NAMESPACE")

	config := &BFFServiceConfig{
		Target:      BFFTargetMaaS,
		ServiceName: "odh-dashboard",
		Port:        8243,
		PathPrefix:  "/api/v1",
	}

	// Should fall back to "opendatahub" default
	url := config.GetURL("")
	assert.Equal(t, "http://odh-dashboard.opendatahub.svc.cluster.local:8243/api/v1", url)
}

func TestBFFClientConfig_GetServiceConfig(t *testing.T) {
	config := NewDefaultBFFClientConfig()

	// Existing target
	maasConfig := config.GetServiceConfig(BFFTargetMaaS)
	assert.NotNil(t, maasConfig)

	// Non-existing target
	unknownConfig := config.GetServiceConfig(BFFTarget("unknown"))
	assert.Nil(t, unknownConfig)
}
