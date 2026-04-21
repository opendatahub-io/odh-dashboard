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

	t.Run("CreateMaaSClient", func(t *testing.T) {
		client := factory.CreateClient(BFFTargetMaaS, "test-token")

		require.NotNil(t, client)
		assert.Equal(t, BFFTargetMaaS, client.GetTarget())
		assert.Contains(t, client.GetBaseURL(), "odh-dashboard.test-namespace.svc.cluster.local:8243")
	})

	t.Run("CreateGenAIClient", func(t *testing.T) {
		client := factory.CreateClient(BFFTargetGenAI, "test-token")

		require.NotNil(t, client)
		assert.Equal(t, BFFTargetGenAI, client.GetTarget())
		assert.Contains(t, client.GetBaseURL(), "8143")
	})

	t.Run("UnconfiguredTarget", func(t *testing.T) {
		// Remove a target from config
		delete(config.ServiceConfigs, BFFTargetModelRegistry)
		factory := NewRealClientFactory(config, nil, true, logger)

		client := factory.CreateClient(BFFTargetModelRegistry, "test-token")
		assert.Nil(t, client)
	})
}

func TestRealClientFactory_GetConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()

	factory := NewRealClientFactory(config, nil, true, logger)

	t.Run("ExistingConfig", func(t *testing.T) {
		serviceConfig := factory.GetConfig(BFFTargetMaaS)
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

	assert.True(t, factory.IsTargetConfigured(BFFTargetMaaS))
	assert.True(t, factory.IsTargetConfigured(BFFTargetGenAI))
	assert.False(t, factory.IsTargetConfigured(BFFTarget("unknown")))
}

func TestRealClientFactory_WithDevOverride(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	config := NewDefaultBFFClientConfig()

	// Set dev override
	maasConfig := config.GetServiceConfig(BFFTargetMaaS)
	maasConfig.DevOverrideURL = "http://localhost:4000/api/v1"

	factory := NewRealClientFactory(config, nil, true, logger)
	client := factory.CreateClient(BFFTargetMaaS, "test-token")

	require.NotNil(t, client)
	assert.Equal(t, "http://localhost:4000/api/v1", client.GetBaseURL())
}
