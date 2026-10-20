package kubernetes

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
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

// SandboxVectorStoreIDs returns the selected vector store IDs from an AgentProfile.
// A profile may point at a store directly or through the key of the dashboard vector
// store ConfigMap. The returned IDs are suitable for both registered_resources and
// the file_search tool injected by the deployment wrapper.
func SandboxVectorStoreIDs(profile *models.AgentProfile) []string {
	if profile == nil || profile.Spec.VectorStores == nil {
		return []string{}
	}

	ids := make([]string, 0, len(profile.Spec.VectorStores.Stores))
	seen := make(map[string]struct{}, len(profile.Spec.VectorStores.Stores))
	for _, ref := range profile.Spec.VectorStores.Stores {
		storeID := ref.ID
		if storeID == "" && ref.StoreRef != nil {
			// storeRef.Key is the vector_store_id within the gen-ai-aa-vector-stores ConfigMap.
			storeID = ref.StoreRef.Key
		}
		if storeID == "" {
			continue
		}
		if _, found := seen[storeID]; found {
			continue
		}
		seen[storeID] = struct{}{}
		ids = append(ids, storeID)
	}
	return ids
}

// sandboxDefaultEmbeddingDimension is the output dimension of the default inline embedding model
// (ibm-granite/granite-embedding-125m-english via sentence-transformers).
const sandboxDefaultEmbeddingDimension = 768

const sentenceTransformersPrefix = "sentence-transformers/"

// sandboxEmbeddingProviderIDPrefix is the provider ID prefix for sandbox embedding
// models that are not local sentence-transformers models. Providers are numbered in
// registration order (agent-embedding-1, agent-embedding-2, ...).
const sandboxEmbeddingProviderIDPrefix = "agent-embedding-"

// SandboxEmbeddingModelSource identifies how a sandbox config must register a vector
// store's embedding model so OGX can resolve it at query time.
type SandboxEmbeddingModelSource string

const (
	// SandboxEmbeddingSourceSentenceTransformers registers the model under the inline
	// sentence-transformers provider (local HuggingFace weights baked into the OGX image).
	SandboxEmbeddingSourceSentenceTransformers SandboxEmbeddingModelSource = "sentence-transformers"

	// SandboxEmbeddingSourceCustomEndpoint registers the model under a dedicated
	// remote::passthrough provider pointing directly at the custom endpoint's URL.
	// Query-time embedding calls authenticate with the API key the deployment wrapper
	// injects as passthrough_api_key provider data (from AGENT_EMBEDDING_API_KEY).
	SandboxEmbeddingSourceCustomEndpoint SandboxEmbeddingModelSource = "custom-endpoint"

	// SandboxEmbeddingSourceISVC registers the model under a remote::vllm provider
	// pointing at the InferenceService/LLMInferenceService URL. These endpoints are
	// typically unauthenticated in-cluster predictors.
	SandboxEmbeddingSourceISVC SandboxEmbeddingModelSource = "isvc"
)

// SandboxEmbeddingModel describes how a vector store's embedding model must be
// registered in the sandbox OGX config. EndpointURL and SecretRef are populated
// only for non-local sources.
type SandboxEmbeddingModel struct {
	Source SandboxEmbeddingModelSource
	// EndpointURL is the inference endpoint for custom-endpoint and ISVC models.
	EndpointURL string
	// SecretRef references the API key for keyed custom-endpoint models; zero value
	// means no credential is needed.
	SecretRef models.SecretRef
}

// SandboxEmbeddingClassifier resolves a vector store's bare embedding model name
// (as stored in the gen-ai-aa-vector-stores ConfigMap) to its registration source.
type SandboxEmbeddingClassifier func(embeddingModel string) SandboxEmbeddingModel

// BuildSandboxEmbeddingClassifier returns a memoized classifier that resolves an
// embedding model by source: custom endpoint models registered in the external models
// ConfigMap (keyed or keyless), then models served by an InferenceService/LLMInferenceService
// in the namespace, and everything else as a local sentence-transformers model — the
// same resolution order the playground install flow uses.
//
// The external models ConfigMap is optional: absence means no custom endpoint models
// exist. Load failures are logged (when logger is non-nil) and treated as absence so an
// unreadable ConfigMap does not block deployments.
func BuildSandboxEmbeddingClassifier(
	ctx context.Context,
	client KubernetesClientInterface,
	namespace string,
	logger *slog.Logger,
) SandboxEmbeddingClassifier {
	var externalModelsConfig *models.ExternalModelsConfig
	if cfg, err := client.GetExternalModelsConfig(ctx, namespace); err == nil {
		externalModelsConfig = cfg
	} else if logger != nil {
		logger.Debug("Skipping custom-endpoint embedding model classification; external models ConfigMap unavailable",
			"namespace", namespace, "error", err)
	}

	memo := make(map[string]SandboxEmbeddingModel)
	return func(embeddingModel string) SandboxEmbeddingModel {
		if resolved, ok := memo[embeddingModel]; ok {
			return resolved
		}
		resolved := SandboxEmbeddingModel{Source: SandboxEmbeddingSourceSentenceTransformers}
		if _, provider, err := ResolveCustomEndpointModelProvider(externalModelsConfig, embeddingModel); err == nil {
			resolved = SandboxEmbeddingModel{
				Source:      SandboxEmbeddingSourceCustomEndpoint,
				EndpointURL: provider.Config.BaseURL,
				SecretRef:   provider.Config.CustomGenAI.APIKey.SecretRef,
			}
		} else if isvcURL, isvcErr := client.GetInferenceServiceURL(ctx, nil, namespace, embeddingModel); isvcErr == nil && isvcURL != "" {
			// GetInferenceServiceURL returns ("", nil) when no matching resource exists.
			resolved = SandboxEmbeddingModel{
				Source:      SandboxEmbeddingSourceISVC,
				EndpointURL: isvcURL,
			}
		}
		memo[embeddingModel] = resolved
		return resolved
	}
}

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

// PassthroughBaseURL returns the base URL for a remote::passthrough provider. OGX appends
// "/v1" to the configured base URL on every request, so a trailing "/v1" on the endpoint
// URL must be stripped to avoid a doubled path segment. Exported for testing.
func PassthroughBaseURL(endpointURL string) string {
	return strings.TrimSuffix(strings.TrimRight(endpointURL, "/"), "/v1")
}

// isClusterLocalURL reports whether the URL targets an in-cluster service, which serves
// certificates that are not verifiable with public CAs.
func isClusterLocalURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	return err == nil && strings.HasSuffix(parsed.Hostname(), ".svc.cluster.local")
}

// BuildSandboxLlamaStackConfig generates a LlamaStackConfig from an AgentProfile's model and
// vector store references. The returned config should be serialized to YAML and stored as
// config.yaml in the llama-stack-config ConfigMap mounted by the Sandbox pod.
//
// storeDoc may be nil when the profile has no vector stores.
//
// classifyEmbeddingModel resolves each referenced store's embedding model name to its
// registration source. It may be nil, in which case every model is treated as a local
// sentence-transformers model. Non-local models (custom endpoint, ISVC-served) must be
// classified accordingly — registering them under sentence-transformers makes OGX attempt
// a HuggingFace download at query time, which fails offline and silently returns empty
// file-search results.
func BuildSandboxLlamaStackConfig(
	profile *models.AgentProfile,
	storeDoc *models.ExternalVectorStoresDocument,
	classifyEmbeddingModel SandboxEmbeddingClassifier,
) (*LlamaStackConfig, error) {
	cfg := NewDefaultLlamaStackConfig()

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

	// Map from embedding registration key (source|endpoint|model) to the provider ID it
	// was registered under, so stores sharing a model do not produce duplicate providers
	// or registered_resources.models entries.
	registeredEmbeddings := make(map[string]string)
	embeddingProviderCount := 0
	nextEmbeddingProviderID := func() string {
		embeddingProviderCount++
		return fmt.Sprintf("%s%d", sandboxEmbeddingProviderIDPrefix, embeddingProviderCount)
	}
	// The first store's embedding registration seeds vector_stores.default_embedding_model,
	// which OGX validates against the routing table at startup.
	var defaultEmbeddingModelID string
	var defaultEmbeddingProviderID string

	for _, storeID := range SandboxVectorStoreIDs(profile) {
		vs := NewVectorStore(storeID, ogxSentenceTransformersModelID(cfg.VectorStores.DefaultEmbeddingModel.ModelID), 0)
		vs.ProviderID = pgvector.DefaultProviderID

		// Resolve the store's embedding model name: the storeDoc entry when present,
		// otherwise the config default (a local HuggingFace model).
		embeddingModelName := cfg.VectorStores.DefaultEmbeddingModel.ModelID
		if store, ok := storeByID[storeID]; ok {
			if store.EmbeddingModel != "" {
				embeddingModelName = store.EmbeddingModel
			}
			vs.EmbeddingDimension = store.EmbeddingDimension
			vs.ProviderVectorStoreID = store.ProviderVectorStoreID
			vs.VectorStoreName = store.VectorStoreName
		}
		if vs.EmbeddingDimension == 0 {
			vs.EmbeddingDimension = sandboxDefaultEmbeddingDimension
		}

		classification := SandboxEmbeddingModel{Source: SandboxEmbeddingSourceSentenceTransformers}
		if classifyEmbeddingModel != nil {
			classification = classifyEmbeddingModel(embeddingModelName)
		}

		switch classification.Source {
		case SandboxEmbeddingSourceCustomEndpoint:
			if classification.EndpointURL == "" {
				return nil, fmt.Errorf(
					"cannot deploy agent: custom endpoint provider for embedding model %q (vector store %q) has no base URL",
					embeddingModelName, storeID,
				)
			}
			registrationKey := string(classification.Source) + "|" + classification.EndpointURL + "|" + embeddingModelName
			providerID, registered := registeredEmbeddings[registrationKey]
			if !registered {
				providerID = nextEmbeddingProviderID()
				// remote::passthrough forwards OpenAI-compatible requests verbatim; the base URL
				// must not carry a trailing /v1 because OGX appends it. Credentials are supplied
				// per request by the wrapper via passthrough_api_key provider data for keyed
				// models; keyless models pin a placeholder api_key (see below).
				providerConfig := map[string]interface{}{"base_url": PassthroughBaseURL(classification.EndpointURL)}
				if isClusterLocalURL(classification.EndpointURL) {
					providerConfig["network"] = map[string]interface{}{
						"tls": map[string]interface{}{"verify": false},
					}
				}
				if classification.SecretRef.Name == "" {
					// Keyless endpoint: no credential to inject. OGX's passthrough adapter cannot
					// issue unauthenticated requests (the OpenAI SDK rejects an empty api_key with
					// no Authorization header), so pin a placeholder config key. Unauthenticated
					// endpoints ignore the Authorization header entirely, and this mirrors the
					// BFF's "fake" default for keyless custom endpoints (fetchSecretFromProvider).
					providerConfig["api_key"] = "fake"
				}
				cfg.AddInferenceProvider(NewProvider(providerID, "remote::passthrough", providerConfig))
				cfg.RegisterModel(NewEmbeddingModel(embeddingModelName, providerID, embeddingModelName, vs.EmbeddingDimension))
				registeredEmbeddings[registrationKey] = providerID
			}
			vs.EmbeddingModel = providerID + "/" + embeddingModelName
			if defaultEmbeddingModelID == "" {
				defaultEmbeddingModelID = embeddingModelName
				defaultEmbeddingProviderID = providerID
			}
		case SandboxEmbeddingSourceISVC:
			if classification.EndpointURL == "" {
				return nil, fmt.Errorf(
					"cannot deploy agent: no endpoint URL found for ISVC-served embedding model %q (vector store %q)",
					embeddingModelName, storeID,
				)
			}
			registrationKey := string(classification.Source) + "|" + classification.EndpointURL + "|" + embeddingModelName
			providerID, registered := registeredEmbeddings[registrationKey]
			if !registered {
				providerID = nextEmbeddingProviderID()
				// remote::vllm expects the base URL to include /v1 (the endpoint URLs returned by
				// GetInferenceServiceURL already do). These predictors are typically unauthenticated.
				cfg.AddVLLMProviderAndModel(providerID, classification.EndpointURL, embeddingProviderCount, embeddingModelName,
					string(models.ModelTypeEmbedding), map[string]interface{}{"display_name": embeddingModelName}, &vs.EmbeddingDimension)
				registeredEmbeddings[registrationKey] = providerID
			}
			vs.EmbeddingModel = providerID + "/" + embeddingModelName
			if defaultEmbeddingModelID == "" {
				defaultEmbeddingModelID = embeddingModelName
				defaultEmbeddingProviderID = providerID
			}
		default:
			// Local HuggingFace model: OGX model_id carries the sentence-transformers/ prefix
			// and the model registers under the inline sentence-transformers provider.
			vs.EmbeddingModel = ogxSentenceTransformersModelID(embeddingModelName)
			if _, registered := registeredEmbeddings[vs.EmbeddingModel]; !registered {
				registerSandboxEmbeddingModel(cfg, vs.EmbeddingModel, vs.EmbeddingDimension)
				registeredEmbeddings[vs.EmbeddingModel] = cfg.VectorStores.DefaultEmbeddingModel.ProviderID
			}
			if defaultEmbeddingModelID == "" {
				defaultEmbeddingModelID = hfModelName(vs.EmbeddingModel)
				defaultEmbeddingProviderID = cfg.VectorStores.DefaultEmbeddingModel.ProviderID
			}
		}

		cfg.RegisterVectorStore(vs)
	}

	if defaultEmbeddingModelID != "" {
		// DefaultEmbeddingModel maps to vector_stores.default_embedding_model in the YAML.
		// OGX constructs the full OGX model_id internally as provider_id/model_id, so the
		// model_id must stay unprefixed and the provider must match the registration above.
		cfg.VectorStores.DefaultEmbeddingModel.ProviderID = defaultEmbeddingProviderID
		cfg.VectorStores.DefaultEmbeddingModel.ModelID = defaultEmbeddingModelID
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

// RequiredSandboxEmbeddingKeyRef returns the SecretRef whose API key must be installed
// as the AGENT_EMBEDDING_API_KEY environment variable in the sandbox so the wrapper can
// authenticate remote::passthrough embedding calls. It returns nil when no referenced
// embedding model needs a credential.
//
// The sandbox injects a single embedding key via passthrough_api_key provider data, so
// referencing keyed custom-endpoint embedding models backed by different Secrets is
// rejected with an error.
func RequiredSandboxEmbeddingKeyRef(
	profile *models.AgentProfile,
	storeDoc *models.ExternalVectorStoresDocument,
	classifyEmbeddingModel SandboxEmbeddingClassifier,
) (*models.SecretRef, error) {
	if classifyEmbeddingModel == nil || profile == nil {
		return nil, nil
	}

	storeByID := make(map[string]models.RegisteredVectorStore)
	if storeDoc != nil {
		for _, s := range storeDoc.RegisteredResources.VectorStores {
			storeByID[s.VectorStoreID] = s
		}
	}

	var required *models.SecretRef
	for _, storeID := range SandboxVectorStoreIDs(profile) {
		embeddingModelName := ""
		if store, ok := storeByID[storeID]; ok {
			embeddingModelName = store.EmbeddingModel
		}
		if embeddingModelName == "" {
			continue
		}
		classification := classifyEmbeddingModel(embeddingModelName)
		if classification.Source != SandboxEmbeddingSourceCustomEndpoint || classification.SecretRef.Name == "" {
			continue
		}
		if required == nil {
			ref := classification.SecretRef
			required = &ref
		} else if *required != classification.SecretRef {
			return nil, fmt.Errorf(
				"cannot deploy agent: vector store %q uses embedding model %q whose API key Secret %q differs from %q; "+
					"a sandbox supports a single embedding API key",
				storeID, embeddingModelName, classification.SecretRef.Name, required.Name,
			)
		}
	}
	return required, nil
}

func registerSandboxEmbeddingModel(cfg *LlamaStackConfig, modelID string, dimension int) {
	cfg.RegisterModel(NewEmbeddingModel(
		modelID, // OGX model_id with prefix (registered_resources)
		cfg.VectorStores.DefaultEmbeddingModel.ProviderID,
		hfModelName(modelID), // provider_model_id: raw HuggingFace name
		dimension,
	))
}
