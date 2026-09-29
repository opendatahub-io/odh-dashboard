package api

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAgentDeploymentConfig(t *testing.T) {
	t.Run("forwards the caller token and decodes the profile", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "/internal/agent_config", r.URL.Path)
			assert.Equal(t, "Bearer caller-token", r.Header.Get("Authorization"))
			_, _ = io.WriteString(w, `{"apiVersion":"genai.redhat.com/v1alpha1","kind":"AgentProfile","metadata":{"name":"00000000-0000-0000-0000-000000000000"},"spec":{"displayName":"Test Agent","model":{"id":"test","uri":"https://example.com"}}}`)
		}))
		defer server.Close()

		app := &App{logger: slog.Default(), httpClient: server.Client()}
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "caller-token"})
		config, err := app.getAgentDeploymentConfig(ctx, server.URL)
		require.NoError(t, err)
		assert.Equal(t, "Test Agent", config.Spec.DisplayName)
	})

	t.Run("returns an error for unavailable config without a response payload", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		}))
		defer server.Close()

		app := &App{logger: slog.Default(), httpClient: server.Client()}
		ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, &integrations.RequestIdentity{Token: "caller-token"})
		config, err := app.getAgentDeploymentConfig(ctx, server.URL)
		require.Error(t, err)
		assert.Nil(t, config)
	})
}
