package kubernetes

import (
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/require"
)

func TestResolveCustomEndpointModelProvider(t *testing.T) {
	config := &models.ExternalModelsConfig{
		Providers: models.ProvidersConfig{Inference: []models.InferenceProvider{
			{ProviderID: "endpoint-1"},
			{ProviderID: "endpoint-2"},
		}},
		RegisteredResources: models.RegisteredResourcesConfig{Models: []models.RegisteredModel{
			{ProviderID: "endpoint-1", ModelID: "claude-haiku"},
			{ProviderID: "endpoint-2", ModelID: "different-model"},
		}},
	}

	t.Run("resolves a unique bare model ID", func(t *testing.T) {
		model, provider, err := ResolveCustomEndpointModelProvider(config, "claude-haiku")
		require.NoError(t, err)
		require.Equal(t, "claude-haiku", model.ModelID)
		require.Equal(t, "endpoint-1", provider.ProviderID)
	})

	t.Run("resolves a provider-qualified model ID", func(t *testing.T) {
		model, provider, err := ResolveCustomEndpointModelProvider(config, "endpoint-1/claude-haiku")
		require.NoError(t, err)
		require.Equal(t, "claude-haiku", model.ModelID)
		require.Equal(t, "endpoint-1", provider.ProviderID)
	})

	t.Run("rejects an ambiguous bare model ID", func(t *testing.T) {
		ambiguous := *config
		ambiguous.RegisteredResources.Models = append(ambiguous.RegisteredResources.Models, models.RegisteredModel{ProviderID: "endpoint-2", ModelID: "claude-haiku"})

		_, _, err := ResolveCustomEndpointModelProvider(&ambiguous, "claude-haiku")
		require.ErrorContains(t, err, "ambiguous")
	})
}
