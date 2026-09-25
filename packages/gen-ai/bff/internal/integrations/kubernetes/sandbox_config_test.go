package kubernetes_test

import (
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildSandboxLlamaStackConfig_MaaSModelWithVectorStore(t *testing.T) {
	modelID := "mistralai/Mistral-7B-Instruct-v0.2"
	modelURI := "https://maas.example.com/v1"
	storeID := "my-pgvector-store"
	embeddingModel := "ibm-granite/granite-embedding-125m-english"

	profile := &models.AgentProfile{
		Spec: models.AgentProfileSpec{
			DisplayName: "Test Agent",
			Model: models.ModelReference{
				ID:  modelID,
				URI: modelURI,
			},
			VectorStores: &models.VectorStoresConfig{
				Stores: []models.VectorStoreRef{
					{ID: storeID},
				},
			},
		},
	}

	storeDoc := &models.ExternalVectorStoresDocument{
		RegisteredResources: models.RegisteredResourcesSection{
			VectorStores: []models.RegisteredVectorStore{
				{
					VectorStoreID:      storeID,
					EmbeddingModel:     embeddingModel,
					EmbeddingDimension: 768,
					ProviderID:         "pgvector",
				},
			},
		},
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc)
	require.NoError(t, err)

	// Inference providers: sentence-transformers (default) + passthrough-llm
	require.Len(t, cfg.Providers.Inference, 2)
	var passthroughProvider *kubernetes.Provider
	for i := range cfg.Providers.Inference {
		if cfg.Providers.Inference[i].ProviderType == "remote::openai" {
			p := cfg.Providers.Inference[i]
			passthroughProvider = &p
		}
	}
	require.NotNil(t, passthroughProvider, "expected a remote::openai provider")
	assert.Equal(t, modelURI, passthroughProvider.Config["base_url"])

	// LLM and embedding model both registered
	require.Len(t, cfg.RegisteredResources.Models, 2)
	assert.Equal(t, modelID, cfg.RegisteredResources.Models[0].ModelID)
	assert.Equal(t, "llm", cfg.RegisteredResources.Models[0].ModelType)
	assert.Equal(t, "sentence-transformers/"+embeddingModel, cfg.RegisteredResources.Models[1].ModelID)
	assert.Equal(t, "embedding", cfg.RegisteredResources.Models[1].ModelType)

	// pgvector vector_io provider present
	require.Len(t, cfg.Providers.VectorIO, 1)
	assert.Equal(t, "remote::pgvector", cfg.Providers.VectorIO[0].ProviderType)

	// Vector store registered with actual store ID and embedding details
	require.Len(t, cfg.RegisteredResources.VectorStores, 1)
	assert.Equal(t, storeID, cfg.RegisteredResources.VectorStores[0].VectorStoreID)
	assert.Equal(t, "sentence-transformers/"+embeddingModel, cfg.RegisteredResources.VectorStores[0].EmbeddingModel)
	assert.Equal(t, 768, cfg.RegisteredResources.VectorStores[0].EmbeddingDimension)

	// DefaultEmbeddingModel.ModelID maps to vector_stores.default_embedding_model.model_id in YAML.
	// OGX constructs the OGX model_id internally as provider_id/model_id, so this stays unprefixed.
	assert.Equal(t, embeddingModel, cfg.VectorStores.DefaultEmbeddingModel.ModelID)

	// Config serializes to parseable YAML containing the key IDs
	yamlOut, err := cfg.ToYAML()
	require.NoError(t, err)
	assert.Contains(t, yamlOut, storeID)
	assert.Contains(t, yamlOut, modelID)
}

func TestSandboxOGXModelID(t *testing.T) {
	assert.Equal(t, "passthrough-llm/openai-gpt-4o-mini", kubernetes.SandboxOGXModelID("openai-gpt-4o-mini"))
}

func TestSandboxVectorStoreIDs(t *testing.T) {
	profile := &models.AgentProfile{Spec: models.AgentProfileSpec{VectorStores: &models.VectorStoresConfig{
		Stores: []models.VectorStoreRef{
			{ID: "direct-store"},
			{StoreRef: &models.ConfigMapRef{Key: "referenced-store"}},
			{ID: "direct-store"}, // duplicate selections should only create one file_search ID.
			{},
		},
	}}}

	assert.Equal(t, []string{"direct-store", "referenced-store"}, kubernetes.SandboxVectorStoreIDs(profile))
	assert.Empty(t, kubernetes.SandboxVectorStoreIDs(nil))
}

func TestBuildSandboxLlamaStackConfig_NoVectorStores(t *testing.T) {
	profile := &models.AgentProfile{
		Spec: models.AgentProfileSpec{
			DisplayName: "Simple Agent",
			Model: models.ModelReference{
				ID:  "meta-llama/Llama-3.1-8B",
				URI: "https://llm.example.com/v1",
			},
		},
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, nil)
	require.NoError(t, err)

	// No pgvector provider when there are no vector stores
	assert.Empty(t, cfg.Providers.VectorIO)

	// OGX validates the default embedding model even with no vector stores, so both
	// the LLM and the default inline embedding model must be registered.
	require.Len(t, cfg.RegisteredResources.Models, 2)
	assert.Equal(t, "meta-llama/Llama-3.1-8B", cfg.RegisteredResources.Models[0].ModelID)
	assert.Equal(t, "sentence-transformers/ibm-granite/granite-embedding-125m-english", cfg.RegisteredResources.Models[1].ModelID)
	assert.Equal(t, "ibm-granite/granite-embedding-125m-english", cfg.RegisteredResources.Models[1].ProviderModelID)
	assert.Equal(t, "embedding", cfg.RegisteredResources.Models[1].ModelType)
	assert.Equal(t, 768, cfg.RegisteredResources.Models[1].Metadata["embedding_dimension"])
}

func TestBuildSandboxLlamaStackConfig_StoreRefKey(t *testing.T) {
	storeID := "ref-resolved-store"
	profile := &models.AgentProfile{
		Spec: models.AgentProfileSpec{
			DisplayName: "Agent with storeRef",
			Model: models.ModelReference{
				ID:  "some-model",
				URI: "https://example.com/v1",
			},
			VectorStores: &models.VectorStoresConfig{
				Stores: []models.VectorStoreRef{
					{
						StoreRef: &models.ConfigMapRef{
							Kind: "ConfigMap",
							Name: "gen-ai-aa-vector-stores",
							Key:  storeID,
						},
					},
				},
			},
		},
	}

	storeDoc := &models.ExternalVectorStoresDocument{
		RegisteredResources: models.RegisteredResourcesSection{
			VectorStores: []models.RegisteredVectorStore{
				{
					VectorStoreID:      storeID,
					EmbeddingModel:     "ibm-granite/granite-embedding-125m-english",
					EmbeddingDimension: 384,
					ProviderID:         "pgvector",
				},
			},
		},
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc)
	require.NoError(t, err)

	require.Len(t, cfg.RegisteredResources.VectorStores, 1)
	assert.Equal(t, storeID, cfg.RegisteredResources.VectorStores[0].VectorStoreID)
}
