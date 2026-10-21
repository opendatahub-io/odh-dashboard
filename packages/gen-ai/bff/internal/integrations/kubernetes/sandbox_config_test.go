package kubernetes_test

import (
	"context"
	"fmt"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

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

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, nil)
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

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, nil, nil)
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

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, nil)
	require.NoError(t, err)

	require.Len(t, cfg.RegisteredResources.VectorStores, 1)
	assert.Equal(t, storeID, cfg.RegisteredResources.VectorStores[0].VectorStoreID)
}

func sandboxEmbeddingTestProfile(storeIDs ...string) *models.AgentProfile {
	stores := make([]models.VectorStoreRef, 0, len(storeIDs))
	for _, id := range storeIDs {
		stores = append(stores, models.VectorStoreRef{ID: id})
	}
	return &models.AgentProfile{
		Spec: models.AgentProfileSpec{
			DisplayName:  "Embedding Agent",
			Model:        models.ModelReference{ID: "some-model", URI: "https://llm.example.com/v1"},
			VectorStores: &models.VectorStoresConfig{Stores: stores},
		},
	}
}

func sandboxEmbeddingTestStoreDoc(stores ...models.RegisteredVectorStore) *models.ExternalVectorStoresDocument {
	return &models.ExternalVectorStoresDocument{
		RegisteredResources: models.RegisteredResourcesSection{VectorStores: stores},
	}
}

func findSandboxProvider(cfg *kubernetes.LlamaStackConfig, providerID string) *kubernetes.Provider {
	for i := range cfg.Providers.Inference {
		if cfg.Providers.Inference[i].ProviderID == providerID {
			p := cfg.Providers.Inference[i]
			return &p
		}
	}
	return nil
}

func TestBuildSandboxLlamaStackConfig_CustomEndpointEmbeddingModel(t *testing.T) {
	storeID := "vs-e2e-gemini-keyed"
	embeddingModel := "gemini-embedding-001"
	profile := sandboxEmbeddingTestProfile(storeID)
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:      storeID,
		EmbeddingModel:     embeddingModel,
		EmbeddingDimension: 3072,
	})

	classifications := map[string]kubernetes.SandboxEmbeddingModel{
		embeddingModel: {
			Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
			EndpointURL: "https://gemini.example.com/v1",
			SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
		},
	}
	classify := func(name string) kubernetes.SandboxEmbeddingModel { return classifications[name] }

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	// Inference providers: sentence-transformers (default), passthrough-llm, and a
	// dedicated remote::passthrough provider pointing directly at the embedding endpoint.
	require.Len(t, cfg.Providers.Inference, 3)
	embeddingProvider := findSandboxProvider(cfg, "agent-embedding-1")
	require.NotNil(t, embeddingProvider, "expected an agent-embedding-1 provider")
	assert.Equal(t, "remote::passthrough", embeddingProvider.ProviderType)
	// OGX appends /v1 to passthrough base URLs, so the trailing /v1 is stripped.
	assert.Equal(t, "https://gemini.example.com", embeddingProvider.Config["base_url"])
	// Keyed credentials come from the wrapper via passthrough_api_key provider data, not
	// the config (a config api_key would take precedence over the per-request key).
	assert.NotContains(t, embeddingProvider.Config, "api_key")
	assert.NotContains(t, embeddingProvider.Config, "forward_headers")

	// The embedding model registers under the sandbox provider with its bare model_id.
	require.Len(t, cfg.RegisteredResources.Models, 2)
	assert.Equal(t, embeddingModel, cfg.RegisteredResources.Models[1].ModelID)
	assert.Equal(t, "agent-embedding-1", cfg.RegisteredResources.Models[1].ProviderID)
	assert.Equal(t, embeddingModel, cfg.RegisteredResources.Models[1].ProviderModelID)
	assert.Equal(t, "embedding", cfg.RegisteredResources.Models[1].ModelType)
	assert.Equal(t, 3072, cfg.RegisteredResources.Models[1].Metadata["embedding_dimension"])

	// The store references the full provider-qualified identifier so OGX resolves
	// the model from the routing table.
	require.Len(t, cfg.RegisteredResources.VectorStores, 1)
	assert.Equal(t, "agent-embedding-1/"+embeddingModel, cfg.RegisteredResources.VectorStores[0].EmbeddingModel)

	// default_embedding_model must point at the registered model.
	assert.Equal(t, "agent-embedding-1", cfg.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, embeddingModel, cfg.VectorStores.DefaultEmbeddingModel.ModelID)

	yamlOut, err := cfg.ToYAML()
	require.NoError(t, err)
	assert.Contains(t, yamlOut, "agent-embedding-1/"+embeddingModel)
	assert.NotContains(t, yamlOut, "sentence-transformers/"+embeddingModel)
}

func TestBuildSandboxLlamaStackConfig_CustomEndpointClusterLocalTLS(t *testing.T) {
	profile := sandboxEmbeddingTestProfile("vs-local-endpoint")
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:  "vs-local-endpoint",
		EmbeddingModel: "granite-embedding-keyless",
	})
	classify := func(string) kubernetes.SandboxEmbeddingModel {
		return kubernetes.SandboxEmbeddingModel{
			Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
			EndpointURL: "https://keyless-endpoint.test.svc.cluster.local/v1",
		}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	embeddingProvider := findSandboxProvider(cfg, "agent-embedding-1")
	require.NotNil(t, embeddingProvider)
	assert.Equal(t, "https://keyless-endpoint.test.svc.cluster.local", embeddingProvider.Config["base_url"])
	// Keyless endpoints pin a placeholder api_key: OGX's passthrough adapter cannot issue
	// unauthenticated requests, and unauthenticated endpoints ignore the header.
	assert.Equal(t, "fake", embeddingProvider.Config["api_key"])
	// Cluster-local services verify TLS against the OpenShift service-serving CA
	// projected into the pod — verification is never disabled.
	network, ok := embeddingProvider.Config["network"].(map[string]interface{})
	require.True(t, ok, "expected network TLS config for cluster-local endpoint")
	tls, ok := network["tls"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, kubernetes.SandboxServiceServingCAPath, tls["verify"])
	assert.NotEqual(t, false, tls["verify"])
}

func TestBuildSandboxLlamaStackConfig_CustomEndpointSVCHostTLS(t *testing.T) {
	// OpenShift serving certs cover the .svc host form too; those endpoints must
	// get the same service-CA verification instead of public-CA verification
	// (which would fail).
	profile := sandboxEmbeddingTestProfile("vs-svc-host")
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:  "vs-svc-host",
		EmbeddingModel: "granite-embedding-keyless",
	})
	classify := func(string) kubernetes.SandboxEmbeddingModel {
		return kubernetes.SandboxEmbeddingModel{
			Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
			EndpointURL: "https://keyless-endpoint.test.svc:8080",
		}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	embeddingProvider := findSandboxProvider(cfg, "agent-embedding-1")
	require.NotNil(t, embeddingProvider)
	network, ok := embeddingProvider.Config["network"].(map[string]interface{})
	require.True(t, ok, "expected network TLS config for .svc host")
	tls := network["tls"].(map[string]interface{})
	assert.Equal(t, kubernetes.SandboxServiceServingCAPath, tls["verify"])
}

func TestIsClusterLocalURL(t *testing.T) {
	assert.True(t, kubernetes.IsClusterLocalURL("https://svc.ns.svc.cluster.local:8080"))
	assert.True(t, kubernetes.IsClusterLocalURL("http://svc.ns.svc:8080"))
	assert.False(t, kubernetes.IsClusterLocalURL("https://gemini.example.com/v1"))
	assert.False(t, kubernetes.IsClusterLocalURL("https://gateway.example.com/svc/cluster"))
	assert.False(t, kubernetes.IsClusterLocalURL("not a url"))
}

func TestBuildSandboxLlamaStackConfig_ISVCEmbeddingModel(t *testing.T) {
	storeID := "vs-e2e-granite-isvc"
	embeddingModel := "granite-embedding-r2"
	isvcURL := "http://granite-embedding-r2-predictor.test.svc.cluster.local/v1"
	profile := sandboxEmbeddingTestProfile(storeID)
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:      storeID,
		EmbeddingModel:     embeddingModel,
		EmbeddingDimension: 768,
	})
	classify := func(string) kubernetes.SandboxEmbeddingModel {
		return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceISVC, EndpointURL: isvcURL}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	// remote::vllm provider with the ISVC URL (including /v1) and service-CA TLS verification.
	embeddingProvider := findSandboxProvider(cfg, "agent-embedding-1")
	require.NotNil(t, embeddingProvider)
	assert.Equal(t, "remote::vllm", embeddingProvider.ProviderType)
	assert.Equal(t, isvcURL, embeddingProvider.Config["base_url"])
	assert.NotContains(t, embeddingProvider.Config, "tls_verify")
	network, ok := embeddingProvider.Config["network"].(map[string]interface{})
	require.True(t, ok, "expected network TLS config for the vLLM provider")
	tls := network["tls"].(map[string]interface{})
	assert.Equal(t, kubernetes.SandboxServiceServingCAPath, tls["verify"])

	require.Len(t, cfg.RegisteredResources.Models, 2)
	assert.Equal(t, embeddingModel, cfg.RegisteredResources.Models[1].ModelID)
	assert.Equal(t, "agent-embedding-1", cfg.RegisteredResources.Models[1].ProviderID)
	assert.Equal(t, "agent-embedding-1/"+embeddingModel, cfg.RegisteredResources.VectorStores[0].EmbeddingModel)
	assert.Equal(t, "agent-embedding-1", cfg.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, embeddingModel, cfg.VectorStores.DefaultEmbeddingModel.ModelID)
}

func TestBuildSandboxLlamaStackConfig_ISVCServedModelNameDiffers(t *testing.T) {
	// An LLMInferenceService may serve under spec.model.name, which differs from its
	// resource name. The store may reference either name; the model must register (and
	// the store bind) under the served name the endpoint accepts in requests.
	storeID := "vs-e2e-embed-service"
	isvcURL := "http://embed-service-predictor.test.svc.cluster.local/v1"
	storeRef := "embed-service"  // resource-name reference
	servedName := "vendor/embed" // spec.model.name
	profile := sandboxEmbeddingTestProfile(storeID)
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:      storeID,
		EmbeddingModel:     storeRef,
		EmbeddingDimension: 768,
	})
	classify := func(string) kubernetes.SandboxEmbeddingModel {
		return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceISVC, EndpointURL: isvcURL, ModelID: servedName}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	require.Len(t, cfg.RegisteredResources.Models, 2)
	assert.Equal(t, servedName, cfg.RegisteredResources.Models[1].ModelID)
	assert.Equal(t, "agent-embedding-1", cfg.RegisteredResources.Models[1].ProviderID)
	// The store binds to the registered (served) ID, not its own reference.
	assert.Equal(t, "agent-embedding-1/"+servedName, cfg.RegisteredResources.VectorStores[0].EmbeddingModel)
	assert.Equal(t, servedName, cfg.VectorStores.DefaultEmbeddingModel.ModelID)
}

func TestBuildSandboxLlamaStackConfig_MixedEmbeddingModelSources(t *testing.T) {
	profile := sandboxEmbeddingTestProfile("vs-local", "vs-keyed", "vs-isvc")
	storeDoc := sandboxEmbeddingTestStoreDoc(
		models.RegisteredVectorStore{VectorStoreID: "vs-local", EmbeddingModel: "ibm-granite/granite-embedding-125m-english", EmbeddingDimension: 768},
		models.RegisteredVectorStore{VectorStoreID: "vs-keyed", EmbeddingModel: "gemini-embedding-001", EmbeddingDimension: 3072},
		models.RegisteredVectorStore{VectorStoreID: "vs-isvc", EmbeddingModel: "granite-embedding-r2", EmbeddingDimension: 768},
	)
	classify := func(name string) kubernetes.SandboxEmbeddingModel {
		switch name {
		case "gemini-embedding-001":
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://gemini.example.com/v1",
				SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
			}
		case "granite-embedding-r2":
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceISVC,
				EndpointURL: "http://granite-embedding-r2-predictor.test.svc.cluster.local/v1",
			}
		default:
			return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceSentenceTransformers}
		}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	// Each non-local model registers under its own numbered provider.
	assert.Equal(t, "remote::passthrough", findSandboxProvider(cfg, "agent-embedding-1").ProviderType)
	assert.Equal(t, "remote::vllm", findSandboxProvider(cfg, "agent-embedding-2").ProviderType)

	// LLM + three embedding registrations.
	require.Len(t, cfg.RegisteredResources.Models, 4)
	stores := map[string]kubernetes.VectorStore{}
	for _, vs := range cfg.RegisteredResources.VectorStores {
		stores[vs.VectorStoreID] = vs
	}
	assert.Equal(t, "sentence-transformers/ibm-granite/granite-embedding-125m-english", stores["vs-local"].EmbeddingModel)
	assert.Equal(t, "agent-embedding-1/gemini-embedding-001", stores["vs-keyed"].EmbeddingModel)
	assert.Equal(t, "agent-embedding-2/granite-embedding-r2", stores["vs-isvc"].EmbeddingModel)

	// The first store seeds default_embedding_model.
	assert.Equal(t, "sentence-transformers", cfg.VectorStores.DefaultEmbeddingModel.ProviderID)
	assert.Equal(t, "ibm-granite/granite-embedding-125m-english", cfg.VectorStores.DefaultEmbeddingModel.ModelID)
}

func TestBuildSandboxLlamaStackConfig_SharedEmbeddingModel(t *testing.T) {
	profile := sandboxEmbeddingTestProfile("vs-a", "vs-b")
	storeDoc := sandboxEmbeddingTestStoreDoc(
		models.RegisteredVectorStore{VectorStoreID: "vs-a", EmbeddingModel: "gemini-embedding-001", EmbeddingDimension: 3072},
		models.RegisteredVectorStore{VectorStoreID: "vs-b", EmbeddingModel: "gemini-embedding-001", EmbeddingDimension: 3072},
	)
	classify := func(string) kubernetes.SandboxEmbeddingModel {
		return kubernetes.SandboxEmbeddingModel{
			Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
			EndpointURL: "https://gemini.example.com/v1",
			SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
		}
	}

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
	require.NoError(t, err)

	// LLM + a single embedding registration despite two stores sharing the model.
	require.Len(t, cfg.RegisteredResources.Models, 2)
	require.Len(t, cfg.RegisteredResources.VectorStores, 2)
	assert.Equal(t, "agent-embedding-1/gemini-embedding-001", cfg.RegisteredResources.VectorStores[0].EmbeddingModel)
	assert.Equal(t, "agent-embedding-1/gemini-embedding-001", cfg.RegisteredResources.VectorStores[1].EmbeddingModel)
}

func TestBuildSandboxLlamaStackConfig_NilClassifierKeepsLegacyBehavior(t *testing.T) {
	// A nil classifier treats every model as a local sentence-transformers model,
	// preserving the pre-classification behavior for callers that cannot resolve sources.
	profile := sandboxEmbeddingTestProfile("vs-e2e-gemini-keyed")
	storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
		VectorStoreID:      "vs-e2e-gemini-keyed",
		EmbeddingModel:     "gemini-embedding-001",
		EmbeddingDimension: 3072,
	})

	cfg, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, nil)
	require.NoError(t, err)

	require.Len(t, cfg.Providers.Inference, 2)
	assert.Equal(t, "sentence-transformers/gemini-embedding-001", cfg.RegisteredResources.VectorStores[0].EmbeddingModel)
	assert.Equal(t, "sentence-transformers", cfg.VectorStores.DefaultEmbeddingModel.ProviderID)
}

func TestBuildSandboxLlamaStackConfig_MissingEndpointURLErrors(t *testing.T) {
	profile := sandboxEmbeddingTestProfile("vs-keyed", "vs-isvc")
	storeDoc := sandboxEmbeddingTestStoreDoc(
		models.RegisteredVectorStore{VectorStoreID: "vs-keyed", EmbeddingModel: "gemini-embedding-001"},
		models.RegisteredVectorStore{VectorStoreID: "vs-isvc", EmbeddingModel: "granite-embedding-r2"},
	)

	t.Run("custom endpoint without base URL", func(t *testing.T) {
		classify := func(string) kubernetes.SandboxEmbeddingModel {
			return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceCustomEndpoint}
		}
		_, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "vs-keyed")
		assert.Contains(t, err.Error(), "gemini-embedding-001")
	})

	t.Run("ISVC without endpoint URL", func(t *testing.T) {
		classify := func(string) kubernetes.SandboxEmbeddingModel {
			return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceISVC}
		}
		_, err := kubernetes.BuildSandboxLlamaStackConfig(profile, storeDoc, classify)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "vs-keyed")
		assert.Contains(t, err.Error(), "gemini-embedding-001")
	})
}

func TestPassthroughBaseURL(t *testing.T) {
	assert.Equal(t, "https://gemini.example.com", kubernetes.PassthroughBaseURL("https://gemini.example.com/v1"))
	assert.Equal(t, "https://gemini.example.com", kubernetes.PassthroughBaseURL("https://gemini.example.com/v1/"))
	assert.Equal(t, "https://gemini.example.com", kubernetes.PassthroughBaseURL("https://gemini.example.com"))
	// Only a trailing version segment is stripped, never path prefixes.
	assert.Equal(t, "https://gateway.example.com/v1/api", kubernetes.PassthroughBaseURL("https://gateway.example.com/v1/api"))
}

// stubClassifierClient implements only the methods BuildSandboxEmbeddingClassifier
// calls; every other KubernetesClientInterface method is unavailable via the
// embedded nil interface.
type stubClassifierClient struct {
	kubernetes.KubernetesClientInterface
	externalModels *models.ExternalModelsConfig
	externalErr    error
	isvcURL        string
	isvcModelID    string
	isvcCalls      int
}

func (s *stubClassifierClient) GetExternalModelsConfig(_ context.Context, _ string) (*models.ExternalModelsConfig, error) {
	return s.externalModels, s.externalErr
}

// GetServingModelDetails mimics the real resolution: no match when isvcURL is empty;
// otherwise the served model ID (defaulting to the reference, mirroring resources
// whose served name equals their reference).
func (s *stubClassifierClient) GetServingModelDetails(_ context.Context, _ string, modelRef string) (string, string, error) {
	s.isvcCalls++
	if s.isvcURL == "" {
		return "", "", fmt.Errorf("no InferenceService or LLMInferenceService for model '%s'", modelRef)
	}
	if s.isvcModelID == "" {
		return s.isvcURL, modelRef, nil
	}
	return s.isvcURL, s.isvcModelID, nil
}

// notFoundConfigMapErr mimics the controller-runtime error for an absent external
// models ConfigMap — the only lookup failure the classifier tolerates.
func notFoundConfigMapErr() error {
	return apierrors.NewNotFound(schema.GroupResource{Group: "", Resource: "configmaps"}, "gen-ai-aa-custom-model-endpoints")
}

func TestBuildSandboxEmbeddingClassifier(t *testing.T) {
	externalModels := &models.ExternalModelsConfig{
		Providers: models.ProvidersConfig{
			Inference: []models.InferenceProvider{
				{
					ProviderID:   "gemini-endpoint",
					ProviderType: "remote::openai",
					Config: models.ProviderConfig{
						BaseURL:     "https://gemini.example.com/v1",
						CustomGenAI: models.CustomGenAI{APIKey: models.APIKeyConfig{SecretRef: models.SecretRef{Name: "gemini-key", Key: "api_key"}}},
					},
				},
				{
					ProviderID:   "keyless-endpoint",
					ProviderType: "remote::passthrough",
					Config:       models.ProviderConfig{BaseURL: "https://keyless.example.com"},
				},
			},
		},
		RegisteredResources: models.RegisteredResourcesConfig{
			Models: []models.RegisteredModel{
				{ProviderID: "gemini-endpoint", ModelID: "gemini-embedding-001", ModelType: "embedding"},
				{ProviderID: "keyless-endpoint", ModelID: "granite-embedding-keyless", ModelType: "embedding"},
			},
		},
	}

	tests := []struct {
		name           string
		externalModels *models.ExternalModelsConfig
		externalErr    error
		isvcURL        string
		isvcModelID    string
		embeddingModel string
		expected       kubernetes.SandboxEmbeddingModel
	}{
		{
			name:           "keyed custom endpoint model",
			externalModels: externalModels,
			embeddingModel: "gemini-embedding-001",
			expected: kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://gemini.example.com/v1",
				SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
			},
		},
		{
			name:           "keyless custom endpoint model",
			externalModels: externalModels,
			embeddingModel: "granite-embedding-keyless",
			expected: kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://keyless.example.com",
			},
		},
		{
			name:           "ISVC-served model",
			externalModels: externalModels,
			isvcURL:        "http://granite-embedding-r2-predictor.test.svc.cluster.local/v1",
			embeddingModel: "granite-embedding-r2",
			expected: kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceISVC,
				EndpointURL: "http://granite-embedding-r2-predictor.test.svc.cluster.local/v1",
				ModelID:     "granite-embedding-r2",
			},
		},
		{
			name:           "ISVC serving under a different model name",
			externalModels: externalModels,
			isvcURL:        "http://embed-service-predictor.test.svc.cluster.local/v1",
			isvcModelID:    "vendor/embed",
			embeddingModel: "embed-service",
			expected: kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceISVC,
				EndpointURL: "http://embed-service-predictor.test.svc.cluster.local/v1",
				ModelID:     "vendor/embed",
			},
		},
		{
			name:           "unknown model is local sentence-transformers",
			externalModels: externalModels,
			embeddingModel: "ibm-granite/granite-embedding-125m-english",
			expected:       kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceSentenceTransformers},
		},
		{
			name:           "missing external models ConfigMap falls back to ISVC lookup",
			externalErr:    notFoundConfigMapErr(),
			isvcURL:        "http://granite-keyless.test.svc.cluster.local/v1",
			embeddingModel: "granite-embedding-keyless",
			expected: kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceISVC,
				EndpointURL: "http://granite-keyless.test.svc.cluster.local/v1",
				ModelID:     "granite-embedding-keyless",
			},
		},
		{
			name:           "missing external models ConfigMap and no ISVC falls back to local",
			externalErr:    notFoundConfigMapErr(),
			embeddingModel: "ibm-granite/granite-embedding-125m-english",
			expected:       kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceSentenceTransformers},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &stubClassifierClient{
				externalModels: tt.externalModels,
				externalErr:    tt.externalErr,
				isvcURL:        tt.isvcURL,
				isvcModelID:    tt.isvcModelID,
			}
			classifier, err := kubernetes.BuildSandboxEmbeddingClassifier(context.Background(), client, "test-namespace", nil)
			require.NoError(t, err)
			require.NotNil(t, classifier)
			assert.Equal(t, tt.expected, classifier(tt.embeddingModel))
		})
	}
}

func TestBuildSandboxEmbeddingClassifier_PropagatesLookupErrors(t *testing.T) {
	// RBAC, timeout, parse, and validation failures must not be mistaken for an
	// absent ConfigMap — the classifier would fall back to sentence-transformers and
	// silently break file search.
	client := &stubClassifierClient{externalErr: fmt.Errorf("configmaps is forbidden")}
	classifier, err := kubernetes.BuildSandboxEmbeddingClassifier(context.Background(), client, "test-namespace", nil)
	require.Error(t, err)
	assert.Nil(t, classifier)
	assert.Contains(t, err.Error(), "external models configuration")
}

func TestBuildSandboxEmbeddingClassifier_MemoizesLookups(t *testing.T) {
	// The handler and config builder may both classify the same model; k8s lookups
	// must not be repeated per store.
	client := &stubClassifierClient{externalErr: notFoundConfigMapErr()}
	classifier, err := kubernetes.BuildSandboxEmbeddingClassifier(context.Background(), client, "test-namespace", nil)
	require.NoError(t, err)

	assert.Equal(t, kubernetes.SandboxEmbeddingSourceSentenceTransformers, classifier("some-model").Source)
	assert.Equal(t, kubernetes.SandboxEmbeddingSourceSentenceTransformers, classifier("some-model").Source)
	assert.Equal(t, 1, client.isvcCalls)
}

func TestRequiredSandboxEmbeddingKeyRef(t *testing.T) {
	keyedClassify := func(name string) kubernetes.SandboxEmbeddingModel {
		switch name {
		case "gemini-embedding-001":
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://gemini.example.com/v1",
				SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
			}
		case "other-keyed-model":
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://other.example.com/v1",
				SecretRef:   models.SecretRef{Name: "other-key", Key: "api_key"},
			}
		case "shared-key-model":
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://shared.example.com/v1",
				SecretRef:   models.SecretRef{Name: "gemini-key", Key: "api_key"},
			}
		default:
			return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceSentenceTransformers}
		}
	}

	t.Run("no vector stores", func(t *testing.T) {
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(sandboxEmbeddingTestProfile(), nil, keyedClassify)
		require.NoError(t, err)
		assert.Nil(t, ref)
	})

	t.Run("local models need no key", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-local")
		storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
			VectorStoreID: "vs-local", EmbeddingModel: "ibm-granite/granite-embedding-125m-english",
		})
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, keyedClassify)
		require.NoError(t, err)
		assert.Nil(t, ref)
	})

	t.Run("keyless and ISVC models need no key", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-keyless", "vs-isvc")
		storeDoc := sandboxEmbeddingTestStoreDoc(
			models.RegisteredVectorStore{VectorStoreID: "vs-keyless", EmbeddingModel: "keyless-model"},
			models.RegisteredVectorStore{VectorStoreID: "vs-isvc", EmbeddingModel: "isvc-model"},
		)
		classify := func(name string) kubernetes.SandboxEmbeddingModel {
			if name == "keyless-model" {
				return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceCustomEndpoint, EndpointURL: "https://keyless.example.com"}
			}
			return kubernetes.SandboxEmbeddingModel{Source: kubernetes.SandboxEmbeddingSourceISVC, EndpointURL: "http://isvc.test.svc.cluster.local/v1"}
		}
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, classify)
		require.NoError(t, err)
		assert.Nil(t, ref)
	})

	t.Run("Secret name without key is rejected", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-bad-ref")
		storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
			VectorStoreID: "vs-bad-ref", EmbeddingModel: "bad-ref-model",
		})
		classify := func(string) kubernetes.SandboxEmbeddingModel {
			return kubernetes.SandboxEmbeddingModel{
				Source:      kubernetes.SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: "https://keyed.example.com/v1",
				SecretRef:   models.SecretRef{Name: "gemini-key"}, // Key empty
			}
		}
		_, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, classify)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "bad-ref-model")
		assert.Contains(t, err.Error(), "gemini-key")
		assert.Contains(t, err.Error(), "no key")
	})

	t.Run("keyed model requires its SecretRef", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-keyed")
		storeDoc := sandboxEmbeddingTestStoreDoc(models.RegisteredVectorStore{
			VectorStoreID: "vs-keyed", EmbeddingModel: "gemini-embedding-001",
		})
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, keyedClassify)
		require.NoError(t, err)
		require.NotNil(t, ref)
		assert.Equal(t, models.SecretRef{Name: "gemini-key", Key: "api_key"}, *ref)
	})

	t.Run("stores sharing the same keyed model deduplicate", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-a", "vs-b")
		storeDoc := sandboxEmbeddingTestStoreDoc(
			models.RegisteredVectorStore{VectorStoreID: "vs-a", EmbeddingModel: "gemini-embedding-001"},
			models.RegisteredVectorStore{VectorStoreID: "vs-b", EmbeddingModel: "gemini-embedding-001"},
		)
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, keyedClassify)
		require.NoError(t, err)
		require.NotNil(t, ref)
		assert.Equal(t, "gemini-key", ref.Name)
	})

	t.Run("keyed models sharing one SecretRef are allowed", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-a", "vs-b")
		storeDoc := sandboxEmbeddingTestStoreDoc(
			models.RegisteredVectorStore{VectorStoreID: "vs-a", EmbeddingModel: "gemini-embedding-001"},
			models.RegisteredVectorStore{VectorStoreID: "vs-b", EmbeddingModel: "shared-key-model"},
		)
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, keyedClassify)
		require.NoError(t, err)
		require.NotNil(t, ref)
		assert.Equal(t, "gemini-key", ref.Name)
	})

	t.Run("keyed models with different Secrets are rejected", func(t *testing.T) {
		profile := sandboxEmbeddingTestProfile("vs-a", "vs-b")
		storeDoc := sandboxEmbeddingTestStoreDoc(
			models.RegisteredVectorStore{VectorStoreID: "vs-a", EmbeddingModel: "gemini-embedding-001"},
			models.RegisteredVectorStore{VectorStoreID: "vs-b", EmbeddingModel: "other-keyed-model"},
		)
		_, err := kubernetes.RequiredSandboxEmbeddingKeyRef(profile, storeDoc, keyedClassify)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "vs-b")
		assert.Contains(t, err.Error(), "other-key")
	})

	t.Run("nil classifier and nil profile need no key", func(t *testing.T) {
		ref, err := kubernetes.RequiredSandboxEmbeddingKeyRef(nil, nil, nil)
		require.NoError(t, err)
		assert.Nil(t, ref)
	})
}
