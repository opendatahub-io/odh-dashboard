package api

import (
	"testing"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/stretchr/testify/assert"
)

func TestShouldWatchGlobalNamespaces_AuthEnabled(t *testing.T) {
	app := &App{config: config.EnvConfig{
		AuthMethod: config.AuthMethodUser,
	}}
	assert.True(t, app.shouldWatchGlobalNamespaces())
}

func TestShouldWatchGlobalNamespaces_AuthDisabled(t *testing.T) {
	app := &App{config: config.EnvConfig{
		AuthMethod: config.AuthMethodDisabled,
	}}
	assert.False(t, app.shouldWatchGlobalNamespaces())
}
