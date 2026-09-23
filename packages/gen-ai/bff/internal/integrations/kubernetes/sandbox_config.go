package kubernetes

import (
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/pgvector"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

const sandboxPassthroughProviderID = "passthrough-llm"

// SandboxOGXModelID returns the provider-qualified model ID that OGX expects on
// Responses API requests for the model registered by BuildSandboxLlamaStackConfig.
func SandboxOGXModelID(modelID string) string {
	return sandboxPassthroughProviderID + "/" + modelID
}

// sandboxDefaultEmbeddingDimension is the output dimension of the default inline embedding model
// (ibm-granite/granite-embedding-125m-english via sentence-transformers).
const sandboxDefaultEmbeddingDimension = 768

const sentenceTransformersPrefix = "sentence-transformers/"

// ogxSentenceTransformersModelID returns the OGX model_id for an inline sentence-transformers
// model. OGX registers these with a "sentence-transformers/" prefix; the provider_model_id
// (the HuggingFace name) is stored separately.
func ogxSentenceTransformersModelID(hfModelName string) string {
	if strings.HasPrefix(hfModelName, sentenceTransformersPrefix) {
		return hfModelName
	}
	return sentenceTransformersPrefix + hfModelName
}

// hfModelName strips the "sentence-transformers/" prefix to get the raw HuggingFace model name
// used as provider_model_id.
func hfModelName(ogxModelID string) string {
	return strings.TrimPrefix(ogxModelID, sentenceTransformersPrefix)
}

// BuildSandboxLlamaStackConfig generates a LlamaStackConfig from an AgentProfile's model and
// vector store references. The returned config should be serialized to YAML and stored as
// config.yaml in the llama-stack-config ConfigMap mounted by the Sandbox pod.
//
// storeDoc may be nil when the profile has no vector stores.
func BuildSandboxLlamaStackConfig(
	profile *models.AgentProfile,
	storeDoc *models.ExternalVectorStoresDocument,
) (*LlamaStackConfig, error) {
	cfg := NewDefaultLlamaStackConfig()

	// TODO: switch back to remote::passthrough once provider issues are resolved.
	cfg.AddInferenceProvider(NewProvider(sandboxPassthroughProviderID, "remote::openai", map[string]interface{}{
		"base_url": EnsureV1Suffix(profile.Spec.Model.URI),
	}))
	cfg.RegisterModel(NewLLMModel(profile.Spec.Model.ID, sandboxPassthroughProviderID, profile.Spec.DisplayName))

	if profile.Spec.VectorStores == nil || len(profile.Spec.VectorStores.Stores) == 0 {
		// OGX validates vector_stores.default_embedding_model during startup even when
		// no vector store is selected. Register the inline default so that lookup succeeds.
		registerSandboxEmbeddingModel(
			cfg,
			ogxSentenceTransformersModelID(cfg.VectorStores.DefaultEmbeddingModel.ModelID),
			sandboxDefaultEmbeddingDimension,
		)
		return cfg, nil
	}

	// Set pgvector as the vector IO provider; connection details are env-substituted at pod runtime.
	cfg.SetDefaultPgvectorProvider(pgvector.Connection{
		Port: pgvector.DefaultPort,
		DB:   pgvector.DefaultDB,
		User: pgvector.DefaultUser,
	})

	// Build a lookup from vector_store_id → RegisteredVectorStore.
	storeByID := make(map[string]models.RegisteredVectorStore)
	if storeDoc != nil {
		for _, s := range storeDoc.RegisteredResources.VectorStores {
			storeByID[s.VectorStoreID] = s
		}
	}

	// firstEmbeddingModel tracks the OGX model_id (with sentence-transformers/ prefix).
	var firstEmbeddingModel string
	var firstEmbeddingDimension int
	for _, ref := range profile.Spec.VectorStores.Stores {
		storeID := ref.ID
		if storeID == "" && ref.StoreRef != nil {
			// storeRef.Key is the vector_store_id within the gen-ai-aa-vector-stores ConfigMap.
			storeID = ref.StoreRef.Key
		}
		if storeID == "" {
			continue
		}

		// Default embedding model: use the OGX model_id (with "sentence-transformers/" prefix)
		// for registered_resources references; DefaultEmbeddingModel.ModelID stays unprefixed.
		vs := NewVectorStore(storeID, ogxSentenceTransformersModelID(cfg.VectorStores.DefaultEmbeddingModel.ModelID), 0)
		vs.ProviderID = pgvector.DefaultProviderID

		if store, ok := storeByID[storeID]; ok {
			if store.EmbeddingModel != "" {
				// storeDoc returns the raw HuggingFace model name; apply OGX prefix.
				vs.EmbeddingModel = ogxSentenceTransformersModelID(store.EmbeddingModel)
			}
			vs.EmbeddingDimension = store.EmbeddingDimension
			vs.ProviderVectorStoreID = store.ProviderVectorStoreID
			vs.VectorStoreName = store.VectorStoreName
		}

		if vs.EmbeddingDimension == 0 {
			vs.EmbeddingDimension = sandboxDefaultEmbeddingDimension
		}

		if firstEmbeddingModel == "" {
			firstEmbeddingModel = vs.EmbeddingModel
			firstEmbeddingDimension = vs.EmbeddingDimension
		}
		cfg.RegisterVectorStore(vs)
	}

	if firstEmbeddingModel != "" {
		// DefaultEmbeddingModel.ModelID maps to vector_stores.default_embedding_model.model_id
		// in the YAML — OGX constructs the full OGX model_id internally as provider_id/model_id,
		// so this field must stay unprefixed.
		cfg.VectorStores.DefaultEmbeddingModel.ModelID = hfModelName(firstEmbeddingModel)
		registerSandboxEmbeddingModel(cfg, firstEmbeddingModel, firstEmbeddingDimension)
	} else {
		// Invalid or unresolved store references still leave the default embedding model
		// in the config, which OGX validates at startup.
		registerSandboxEmbeddingModel(
			cfg,
			ogxSentenceTransformersModelID(cfg.VectorStores.DefaultEmbeddingModel.ModelID),
			sandboxDefaultEmbeddingDimension,
		)
	}

	return cfg, nil
}

func registerSandboxEmbeddingModel(cfg *LlamaStackConfig, modelID string, dimension int) {
	cfg.RegisterModel(NewEmbeddingModel(
		modelID, // OGX model_id with prefix (registered_resources)
		cfg.VectorStores.DefaultEmbeddingModel.ProviderID,
		hfModelName(modelID), // provider_model_id: raw HuggingFace name
		dimension,
	))
}
