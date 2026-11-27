package api

import (
	"io"
	"log/slog"
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Explicit trust bundles that cannot be loaded at construction time must stop
// NewApp instead of silently falling back to the system pool.
func TestNewApp_RequiredBundlesThatDoNotLoadFailConstruction(t *testing.T) {
	cfg := config.EnvConfig{
		BundlePaths:         []string{filepath.Join(t.TempDir(), "missing-ca.crt")},
		BundlePathsRequired: true,
	}

	app, err := NewApp(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))

	require.Error(t, err)
	assert.Nil(t, app)
	assert.Contains(t, err.Error(), "BUNDLE_PATHS was set explicitly")
}
