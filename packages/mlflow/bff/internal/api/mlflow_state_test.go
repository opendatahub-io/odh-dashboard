package api

import (
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow/mlflowmocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- initMLflowFactory tests ---

func TestInitMLflowFactory_MockWithExternalURL(t *testing.T) {
	cfg := config.EnvConfig{
		MockHTTPClient: true,
		MLflowURL:      "http://127.0.0.1:5001",
		DevMode:        true,
	}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.Empty(t, trackingURL)
	assert.True(t, configured)
	assert.IsType(t, &mlflowmocks.MockClientFactory{}, factory)
}

func TestInitMLflowFactory_StaticMockFlag(t *testing.T) {
	cfg := config.EnvConfig{MockHTTPClient: true, StaticMLflowMock: true}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.Empty(t, trackingURL)
	assert.True(t, configured)
	assert.IsType(t, &mlflowmocks.StaticMockClientFactory{}, factory)
}

func TestInitMLflowFactory_MockWithoutURL_SetupMLflowSucceeds(t *testing.T) {
	// MLFLOW_TRACKING_URI makes SetupMLflow return immediately (no real server started).
	t.Setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:9999")
	cfg := config.EnvConfig{MockHTTPClient: true}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	require.NotNil(t, state)
	assert.Empty(t, trackingURL)
	assert.True(t, configured)
	assert.Equal(t, "http://127.0.0.1:9999", state.TrackingURI)
	assert.IsType(t, &mlflowmocks.MockClientFactory{}, factory)
}

func TestInitMLflowFactory_MockWithoutURL_FallsBackToStatic(t *testing.T) {
	// Force SetupMLflow to fail:
	// - MLFLOW_PORT on an unused port so the health check won't find a running instance
	// - Clear PATH so exec.LookPath can't find uv
	// - Chdir to temp so resolveUVBinary can't walk up to the project's bin/uv
	t.Setenv("MLFLOW_TRACKING_URI", "")
	t.Setenv("MLFLOW_PORT", "59999")
	t.Setenv("PATH", "")
	t.Chdir(t.TempDir())

	cfg := config.EnvConfig{MockHTTPClient: true}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.Empty(t, trackingURL)
	assert.True(t, configured)
	assert.IsType(t, &mlflowmocks.StaticMockClientFactory{}, factory)
}

func TestInitMLflowFactory_RealWithURL(t *testing.T) {
	cfg := config.EnvConfig{
		MLflowURL: "https://mlflow.example.com",
	}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.Equal(t, "https://mlflow.example.com", trackingURL)
	assert.True(t, configured)
	assert.IsType(t, &mlflowpkg.RealClientFactory{}, factory)
}

func TestInitMLflowFactory_NothingConfigured(t *testing.T) {
	cfg := config.EnvConfig{}

	factory, state, trackingURL, configured, err := initMLflowFactory(cfg, testLogger(), nil)

	require.NoError(t, err)
	assert.Nil(t, state)
	assert.Empty(t, trackingURL)
	assert.False(t, configured)
	assert.IsType(t, &mlflowpkg.UnavailableClientFactory{}, factory)
}

// --- refreshMLflowState tests ---

func TestRefreshMLflowState_NoChange(t *testing.T) {
	app := &App{
		config:              config.EnvConfig{MLflowURL: "https://mlflow.example.com"},
		logger:              testLogger(),
		mlflowConfigured:    true,
		mlflowTrackingURL:   "https://mlflow.example.com",
		mlflowClientFactory: &mlflowpkg.RealClientFactory{},
	}
	originalFactory := app.mlflowClientFactory

	app.refreshMLflowState()

	assert.True(t, app.isMLflowConfigured())
	assert.Equal(t, "https://mlflow.example.com", app.mlflowTrackingURL)
	assert.Same(t, originalFactory, app.getMLflowClientFactory())
}

func TestRefreshMLflowState_BecomesConfigured(t *testing.T) {
	app := &App{
		config:              config.EnvConfig{MLflowURL: "https://mlflow.example.com"},
		logger:              testLogger(),
		mlflowConfigured:    false,
		mlflowTrackingURL:   "",
		mlflowClientFactory: mlflowpkg.NewUnavailableClientFactory(),
	}

	app.refreshMLflowState()

	assert.True(t, app.isMLflowConfigured())
	assert.Equal(t, "https://mlflow.example.com", app.mlflowTrackingURL)
	assert.IsType(t, &mlflowpkg.RealClientFactory{}, app.getMLflowClientFactory())
}

func TestRefreshMLflowState_BecomesUnconfigured(t *testing.T) {
	app := &App{
		config:              config.EnvConfig{},
		logger:              testLogger(),
		mlflowConfigured:    true,
		mlflowTrackingURL:   "https://mlflow.example.com",
		mlflowClientFactory: &mlflowpkg.RealClientFactory{},
	}

	app.refreshMLflowState()

	assert.False(t, app.isMLflowConfigured())
	assert.Empty(t, app.mlflowTrackingURL)
	assert.IsType(t, &mlflowpkg.UnavailableClientFactory{}, app.getMLflowClientFactory())
}

func TestRefreshMLflowState_URLChanges(t *testing.T) {
	app := &App{
		config:              config.EnvConfig{MLflowURL: "https://mlflow-new.example.com"},
		logger:              testLogger(),
		mlflowConfigured:    true,
		mlflowTrackingURL:   "https://mlflow-old.example.com",
		mlflowClientFactory: &mlflowpkg.RealClientFactory{},
	}

	app.refreshMLflowState()

	assert.True(t, app.isMLflowConfigured())
	assert.Equal(t, "https://mlflow-new.example.com", app.mlflowTrackingURL)
	assert.IsType(t, &mlflowpkg.RealClientFactory{}, app.getMLflowClientFactory())
}

// --- shouldWatchMLflow tests ---

func TestShouldWatchMLflow_CRDiscoveryActive(t *testing.T) {
	app := &App{config: config.EnvConfig{AuthMethod: config.AuthMethodUser}}
	assert.True(t, app.shouldWatchMLflow())
}

func TestShouldWatchMLflow_MockMode(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, AuthMethod: config.AuthMethodUser}}
	assert.False(t, app.shouldWatchMLflow())
}

func TestShouldWatchMLflow_ExplicitURL(t *testing.T) {
	app := &App{config: config.EnvConfig{MLflowURL: "https://mlflow.example.com", AuthMethod: config.AuthMethodUser}}
	assert.False(t, app.shouldWatchMLflow())
}

func TestShouldWatchMLflow_AuthDisabled(t *testing.T) {
	app := &App{config: config.EnvConfig{AuthMethod: config.AuthMethodDisabled}}
	assert.False(t, app.shouldWatchMLflow())
}

// --- startMLflowWatcher / Shutdown tests ---

func TestShutdownWaitsForWatcher(t *testing.T) {
	app := &App{
		config: config.EnvConfig{
			MLflowURL:  "https://mlflow.example.com",
			AuthMethod: config.AuthMethodUser,
		},
		logger:              testLogger(),
		mlflowConfigured:    true,
		mlflowTrackingURL:   "https://mlflow.example.com",
		mlflowClientFactory: mlflowpkg.NewUnavailableClientFactory(),
	}

	app.startMLflowWatcher()

	done := make(chan error, 1)
	go func() {
		done <- app.Shutdown()
	}()

	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("Shutdown did not complete within timeout — watcher goroutine likely leaked")
	}
}
