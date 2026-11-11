package bffclient

import (
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealClientFactory_CreateClient(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	config := NewDefaultBFFClientConfig()
	config.PodNamespace = "test-ns"

	factory := NewRealClientFactory(config, nil, false, logger)

	t.Run("configured target", func(t *testing.T) {
		client := factory.CreateClient(BFFTargetMaaS, "test-token")
		require.NotNil(t, client)
		assert.Equal(t, BFFTargetMaaS, client.GetTarget())
		assert.Contains(t, client.GetBaseURL(), "test-ns")
		assert.Contains(t, client.GetBaseURL(), "8243")
	})

	t.Run("unconfigured target", func(t *testing.T) {
		// Remove a target from config
		delete(config.ServiceConfigs, BFFTarget("unknown"))
		client := factory.CreateClient(BFFTarget("unknown"), "token")
		assert.Nil(t, client)
	})
}

func TestRealClientFactory_CreateClientWithHeaders(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	config := NewDefaultBFFClientConfig()
	config.PodNamespace = "test-ns"

	factory := NewRealClientFactory(config, nil, false, logger)
	headers := map[string]string{"kubeflow-userid": "user@test.com"}
	client := factory.CreateClientWithHeaders(BFFTargetMaaS, "token", headers)

	require.NotNil(t, client)
	assert.Equal(t, BFFTargetMaaS, client.GetTarget())
}

func TestRealClientFactory_GetConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	config := NewDefaultBFFClientConfig()
	factory := NewRealClientFactory(config, nil, false, logger)

	t.Run("existing target", func(t *testing.T) {
		cfg := factory.GetConfig(BFFTargetMaaS)
		require.NotNil(t, cfg)
		assert.Equal(t, BFFTargetMaaS, cfg.Target)
	})

	t.Run("non-existing target", func(t *testing.T) {
		cfg := factory.GetConfig(BFFTarget("unknown"))
		assert.Nil(t, cfg)
	})
}

func TestRealClientFactory_IsTargetConfigured(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	config := NewDefaultBFFClientConfig()
	factory := NewRealClientFactory(config, nil, false, logger)

	assert.True(t, factory.IsTargetConfigured(BFFTargetMaaS))
	assert.True(t, factory.IsTargetConfigured(BFFTargetGenAI))
	assert.False(t, factory.IsTargetConfigured(BFFTarget("unknown")))
}

func TestRealClientFactory_DevOverrideURL(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	config := NewDefaultBFFClientConfig()
	config.GetServiceConfig(BFFTargetMaaS).DevOverrideURL = "http://localhost:4000/api/v1"

	factory := NewRealClientFactory(config, nil, false, logger)
	client := factory.CreateClient(BFFTargetMaaS, "token")

	require.NotNil(t, client)
	assert.Equal(t, "http://localhost:4000/api/v1", client.GetBaseURL())
}
