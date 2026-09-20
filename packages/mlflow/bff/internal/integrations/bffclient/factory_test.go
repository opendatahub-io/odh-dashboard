package bffclient

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealClientFactory_CreateClient(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()
	config.PodNamespace = "test-namespace"

	factory := NewRealClientFactory(config, nil, true, logger)

	t.Run("CreateModelRegistryClient", func(t *testing.T) {
		client := factory.CreateClient(BFFTargetModelRegistry, "test-token")

		require.NotNil(t, client)
		assert.Equal(t, BFFTargetModelRegistry, client.GetTarget())
		assert.Contains(t, client.GetBaseURL(), "odh-dashboard.test-namespace.svc.cluster.local:8043")
	})

	t.Run("UnconfiguredTarget", func(t *testing.T) {
		client := factory.CreateClient(BFFTarget("unknown"), "test-token")
		assert.Nil(t, client)
	})
}

func TestRealClientFactory_GetConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()

	factory := NewRealClientFactory(config, nil, true, logger)

	t.Run("ExistingConfig", func(t *testing.T) {
		serviceConfig := factory.GetConfig(BFFTargetModelRegistry)
		require.NotNil(t, serviceConfig)
		assert.Equal(t, "odh-dashboard", serviceConfig.ServiceName)
	})

	t.Run("NonExistingConfig", func(t *testing.T) {
		serviceConfig := factory.GetConfig(BFFTarget("nonexistent"))
		assert.Nil(t, serviceConfig)
	})
}

func TestRealClientFactory_IsTargetConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()

	factory := NewRealClientFactory(config, nil, true, logger)

	assert.True(t, factory.IsTargetConfigured(BFFTargetModelRegistry))
	assert.False(t, factory.IsTargetConfigured(BFFTarget("unknown")))
}

func TestRealClientFactory_WithDevOverride(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()

	mrConfig := config.GetServiceConfig(BFFTargetModelRegistry)
	mrConfig.DevOverrideURL = "http://localhost:8043/api/v1"

	factory := NewRealClientFactory(config, nil, true, logger)
	client := factory.CreateClient(BFFTargetModelRegistry, "test-token")

	require.NotNil(t, client)
	assert.Equal(t, "http://localhost:8043/api/v1", client.GetBaseURL())
}
