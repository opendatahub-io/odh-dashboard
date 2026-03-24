package kubernetes

import (
	"context"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- credentialEnvVarField ---

func TestCredentialEnvVarField(t *testing.T) {
	tests := []struct {
		providerType string
		wantField    string
		wantErr      bool
	}{
		{"remote::pgvector", "password", false},
		{"remote::milvus", "token", false},
		{"remote::qdrant", "api_key", false},
		{"remote::unknown", "", true},
		{"", "", true},
		{"inline::milvus", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.providerType, func(t *testing.T) {
			got, err := credentialEnvVarField(tc.providerType)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantField, got)
			}
		})
	}
}

// --- extractCredentialSecretRef ---

func TestExtractCredentialSecretRef(t *testing.T) {
	t.Run("nil CustomGenAIConfig returns nil", func(t *testing.T) {
		got := extractCredentialSecretRef(nil, "remote::pgvector")
		assert.Nil(t, got)
	})

	t.Run("nil Credentials returns nil", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{Credentials: nil}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		assert.Nil(t, got)
	})

	t.Run("empty SecretRefs returns nil", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{SecretRefs: nil},
		}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		assert.Nil(t, got)
	})

	t.Run("unsupported provider type returns nil", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "my-secret", Key: "password"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::unknown")
		assert.Nil(t, got)
	})

	t.Run("pgvector with matching password key returns ref", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "pg-creds", Key: "password"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		require.NotNil(t, got)
		assert.Equal(t, "pg-creds", got.Name)
		assert.Equal(t, "password", got.Key)
	})

	t.Run("qdrant with matching api_key returns ref", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "qdrant-creds", Key: "api_key"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::qdrant")
		require.NotNil(t, got)
		assert.Equal(t, "qdrant-creds", got.Name)
		assert.Equal(t, "api_key", got.Key)
	})

	t.Run("milvus with matching token key returns ref", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "milvus-creds", Key: "token"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::milvus")
		require.NotNil(t, got)
		assert.Equal(t, "milvus-creds", got.Name)
		assert.Equal(t, "token", got.Key)
	})

	t.Run("key mismatch returns nil", func(t *testing.T) {
		// secretRef has key "api_key" but pgvector expects "password"
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "pg-creds", Key: "api_key"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		assert.Nil(t, got)
	})

	t.Run("empty secret name is skipped", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "", Key: "password"}},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		assert.Nil(t, got)
	})

	t.Run("first matching ref wins when multiple refs present", func(t *testing.T) {
		cga := &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{
					{Name: "wrong-key", Key: "api_key"},
					{Name: "correct-secret", Key: "password"},
				},
			},
		}
		got := extractCredentialSecretRef(cga, "remote::pgvector")
		require.NotNil(t, got)
		assert.Equal(t, "correct-secret", got.Name)
		assert.Equal(t, "password", got.Key)
	})
}

// --- validateVectorStores ---

// makeDoc is a helper to build an ExternalVectorStoresDocument inline.
func makeTestExternalVectorStoresDocument(providers []models.VectorIOProvider, stores []models.RegisteredVectorStore) *models.ExternalVectorStoresDocument {
	return &models.ExternalVectorStoresDocument{
		Providers:           models.ProvidersSection{VectorIO: providers},
		RegisteredResources: models.RegisteredResourcesSection{VectorStores: stores},
	}
}

func pgvectorProvider(id string, secretName, secretKey string) models.VectorIOProvider {
	p := models.VectorIOProvider{
		ProviderID:   id,
		ProviderType: "remote::pgvector",
		Config: models.VectorIOProviderConfig{
			Extra: map[string]interface{}{
				"host": "pg.svc.cluster.local",
				"db":   "mydb",
			},
		},
	}
	if secretName != "" {
		p.Config.CustomGenAI = &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: secretName, Key: secretKey}},
			},
		}
	}
	return p
}

func milvusProvider(id string, withToken bool) models.VectorIOProvider {
	p := models.VectorIOProvider{
		ProviderID:   id,
		ProviderType: "remote::milvus",
		Config: models.VectorIOProviderConfig{
			Extra: map[string]interface{}{
				"uri": "http://milvus.svc.cluster.local:19530",
			},
		},
	}
	if withToken {
		p.Config.CustomGenAI = &models.CustomGenAIConfig{
			Credentials: &models.CustomGenAICredentials{
				SecretRefs: []models.SecretKeyRef{{Name: "milvus-creds", Key: "token"}},
			},
		}
	}
	return p
}

func registeredStore(vsID, providerID, embeddingModel string) models.RegisteredVectorStore {
	return models.RegisteredVectorStore{
		VectorStoreID:   vsID,
		ProviderID:      providerID,
		EmbeddingModel:  embeddingModel,
		VectorStoreName: "Test Store",
	}
}

func TestValidateVectorStores(t *testing.T) {
	t.Run("single pgvector store with credential", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("pg-1", "pg-secret", "password")},
			[]models.RegisteredVectorStore{registeredStore("vs-001", "pg-1", "my-model")},
		)

		result, err := validateVectorStores(
			[]models.InstallVectorStore{{VectorStoreID: "vs-001"}},
			doc,
		)

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "pg-1", result[0].Provider.ProviderID)
		assert.Equal(t, "vs-001", result[0].RegisteredStore.VectorStoreID)
		assert.Equal(t, "VS_CREDENTIAL_1", result[0].CredEnvVarName)
		require.NotNil(t, result[0].CredSecretRef)
		assert.Equal(t, "pg-secret", result[0].CredSecretRef.Name)
		assert.Equal(t, "password", result[0].CredSecretRef.Key)
	})

	t.Run("milvus store without credential has empty env var", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{milvusProvider("milvus-1", false)},
			[]models.RegisteredVectorStore{registeredStore("vs-002", "milvus-1", "my-model")},
		)

		result, err := validateVectorStores(
			[]models.InstallVectorStore{{VectorStoreID: "vs-002"}},
			doc,
		)

		require.NoError(t, err)
		require.Len(t, result, 1)
		assert.Equal(t, "", result[0].CredEnvVarName)
		assert.Nil(t, result[0].CredSecretRef)
	})

	t.Run("two stores sharing the same provider share the same credential env var", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("shared-pg", "pg-secret", "password")},
			[]models.RegisteredVectorStore{
				registeredStore("vs-a", "shared-pg", "model-a"),
				registeredStore("vs-b", "shared-pg", "model-b"),
			},
		)

		result, err := validateVectorStores(
			[]models.InstallVectorStore{
				{VectorStoreID: "vs-a"},
				{VectorStoreID: "vs-b"},
			},
			doc,
		)

		require.NoError(t, err)
		require.Len(t, result, 2)
		// Both stores use the same provider; credential counter increments only once.
		assert.Equal(t, "VS_CREDENTIAL_1", result[0].CredEnvVarName)
		assert.Equal(t, "VS_CREDENTIAL_1", result[1].CredEnvVarName)
	})

	t.Run("two stores with different providers get distinct credential env vars", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{
				pgvectorProvider("pg-a", "pg-secret", "password"),
				milvusProvider("milvus-b", true),
			},
			[]models.RegisteredVectorStore{
				registeredStore("vs-a", "pg-a", "model-x"),
				registeredStore("vs-b", "milvus-b", "model-x"),
			},
		)

		result, err := validateVectorStores(
			[]models.InstallVectorStore{
				{VectorStoreID: "vs-a"},
				{VectorStoreID: "vs-b"},
			},
			doc,
		)

		require.NoError(t, err)
		require.Len(t, result, 2)
		assert.Equal(t, "VS_CREDENTIAL_1", result[0].CredEnvVarName)
		assert.Equal(t, "VS_CREDENTIAL_2", result[1].CredEnvVarName)
	})

	t.Run("result order matches request order", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{
				pgvectorProvider("pg-first", "pg-secret", "password"),
				milvusProvider("milvus-second", false),
			},
			[]models.RegisteredVectorStore{
				registeredStore("vs-first", "pg-first", "model"),
				registeredStore("vs-second", "milvus-second", "model"),
			},
		)

		result, err := validateVectorStores(
			[]models.InstallVectorStore{
				{VectorStoreID: "vs-second"},
				{VectorStoreID: "vs-first"},
			},
			doc,
		)

		require.NoError(t, err)
		require.Len(t, result, 2)
		assert.Equal(t, "vs-second", result[0].RegisteredStore.VectorStoreID)
		assert.Equal(t, "vs-first", result[1].RegisteredStore.VectorStoreID)
	})

	t.Run("error when vector store ID not found in ConfigMap", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("pg-1", "pg-secret", "password")},
			[]models.RegisteredVectorStore{registeredStore("vs-known", "pg-1", "model")},
		)

		_, err := validateVectorStores(
			[]models.InstallVectorStore{{VectorStoreID: "vs-does-not-exist"}},
			doc,
		)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "vs-does-not-exist")
	})

	t.Run("error when registered store has empty embedding_model", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("pg-1", "pg-secret", "password")},
			[]models.RegisteredVectorStore{{
				VectorStoreID:  "vs-no-model",
				ProviderID:     "pg-1",
				EmbeddingModel: "", // empty
			}},
		)

		_, err := validateVectorStores(
			[]models.InstallVectorStore{{VectorStoreID: "vs-no-model"}},
			doc,
		)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "embedding_model")
	})

	t.Run("error when provider_id references unknown provider", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("pg-existing", "pg-secret", "password")},
			[]models.RegisteredVectorStore{registeredStore("vs-bad-provider", "missing-provider", "model")},
		)

		_, err := validateVectorStores(
			[]models.InstallVectorStore{{VectorStoreID: "vs-bad-provider"}},
			doc,
		)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing-provider")
	})

	t.Run("empty request returns empty result", func(t *testing.T) {
		doc := makeTestExternalVectorStoresDocument(
			[]models.VectorIOProvider{pgvectorProvider("pg-1", "pg-secret", "password")},
			[]models.RegisteredVectorStore{registeredStore("vs-001", "pg-1", "model")},
		)

		result, err := validateVectorStores(nil, doc)

		require.NoError(t, err)
		assert.Empty(t, result)
	})
}

// --- generateLlamaStackConfig vector store output ---
//
// These tests verify the YAML output of generateLlamaStackConfig when vector stores are
// provided. The handler-level integration tests in lsd_handler_test.go verify status codes; these
// tests verify the actual content of the generated config.

// newTestClient creates a minimal TokenKubernetesClient suitable for generateLlamaStackConfig
// tests that don't involve namespace/cluster models (no real K8s client needed).
func newTestClient() *TokenKubernetesClient {
	return &TokenKubernetesClient{Logger: slog.Default()}
}

// defaultEmbeddingModel is the model_id always auto-registered by generateLlamaStackConfig.
// Using it as a vector store's embedding_model lets the embedding validation pass without
// requiring any additional models in the install request.
const defaultEmbeddingModel = "sentence-transformers/ibm-granite/granite-embedding-125m-english"

func TestGenerateLlamaStackConfig_VectorStoreProviderConfig(t *testing.T) {
	ctx := context.Background()

	t.Run("pgvector provider gets credential field and persistence injected", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "pg-provider",
				ProviderType: "remote::pgvector",
				Config: models.VectorIOProviderConfig{
					Extra: map[string]interface{}{
						"host": "pg.svc.cluster.local",
						"db":   "mydb",
					},
				},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-001",
				ProviderID:     "pg-provider",
				EmbeddingModel: defaultEmbeddingModel,
			},
			CredEnvVarName: "VS_CREDENTIAL_1",
			CredSecretRef:  &models.SecretKeyRef{Name: "pg-secret", Key: "password"},
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.NoError(t, err)

		var cfg LlamaStackConfig
		require.NoError(t, cfg.FromYAML(result))

		require.Len(t, cfg.Providers.VectorIO, 2) // default milvus + pg-provider
		var pgProv *Provider
		for i := range cfg.Providers.VectorIO {
			if cfg.Providers.VectorIO[i].ProviderID == "pg-provider" {
				pgProv = &cfg.Providers.VectorIO[i]
			}
		}
		require.NotNil(t, pgProv, "pg-provider should be in vector_io providers")

		// Credential field injected
		assert.Equal(t, "${env.VS_CREDENTIAL_1:=}", pgProv.Config["password"])

		// Pass-through fields preserved
		assert.Equal(t, "pg.svc.cluster.local", pgProv.Config["host"])
		assert.Equal(t, "mydb", pgProv.Config["db"])

		// Persistence injected (was not in Extra)
		persistence, ok := pgProv.Config["persistence"].(map[interface{}]interface{})
		require.True(t, ok, "persistence should be a map")
		assert.Equal(t, "kv_default", persistence["backend"])
		assert.Equal(t, "vector_io::pg-provider", persistence["namespace"])
	})

	t.Run("milvus with credential gets token field and persistence injected", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "milvus-secure",
				ProviderType: "remote::milvus",
				Config: models.VectorIOProviderConfig{
					Extra: map[string]interface{}{
						"uri": "http://milvus.svc:19530",
					},
				},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-002",
				ProviderID:     "milvus-secure",
				EmbeddingModel: defaultEmbeddingModel,
			},
			CredEnvVarName: "VS_CREDENTIAL_1",
			CredSecretRef:  &models.SecretKeyRef{Name: "milvus-creds", Key: "token"},
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.NoError(t, err)

		var cfg LlamaStackConfig
		require.NoError(t, cfg.FromYAML(result))

		var milvusProv *Provider
		for i := range cfg.Providers.VectorIO {
			if cfg.Providers.VectorIO[i].ProviderID == "milvus-secure" {
				milvusProv = &cfg.Providers.VectorIO[i]
			}
		}
		require.NotNil(t, milvusProv)
		assert.Equal(t, "${env.VS_CREDENTIAL_1:=}", milvusProv.Config["token"])

		persistence, ok := milvusProv.Config["persistence"].(map[interface{}]interface{})
		require.True(t, ok)
		assert.Equal(t, "vector_io::milvus-secure", persistence["namespace"])
	})

	t.Run("milvus without credential gets empty token field", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "milvus-open",
				ProviderType: "remote::milvus",
				Config: models.VectorIOProviderConfig{
					Extra: map[string]interface{}{
						"uri": "http://milvus.svc:19530",
					},
				},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-003",
				ProviderID:     "milvus-open",
				EmbeddingModel: defaultEmbeddingModel,
			},
			CredEnvVarName: "",
			CredSecretRef:  nil,
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.NoError(t, err)

		var cfg LlamaStackConfig
		require.NoError(t, cfg.FromYAML(result))

		var milvusProv *Provider
		for i := range cfg.Providers.VectorIO {
			if cfg.Providers.VectorIO[i].ProviderID == "milvus-open" {
				milvusProv = &cfg.Providers.VectorIO[i]
			}
		}
		require.NotNil(t, milvusProv)
		assert.Equal(t, "", milvusProv.Config["token"])
	})

	t.Run("user-supplied persistence is not overwritten", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "pg-custom-persist",
				ProviderType: "remote::pgvector",
				Config: models.VectorIOProviderConfig{
					Extra: map[string]interface{}{
						"host": "pg.svc.cluster.local",
						"persistence": map[string]interface{}{
							"backend":   "kv_default",
							"namespace": "custom::namespace",
						},
					},
				},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-004",
				ProviderID:     "pg-custom-persist",
				EmbeddingModel: defaultEmbeddingModel,
			},
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.NoError(t, err)

		// Verify the custom namespace is preserved in the output
		assert.Contains(t, result, "custom::namespace")
	})

	t.Run("vector store appears in registered_resources with correct fields", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "pg-provider",
				ProviderType: "remote::pgvector",
				Config:       models.VectorIOProviderConfig{Extra: map[string]interface{}{"host": "pg.svc"}},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:      "vs-reg-001",
				ProviderID:         "pg-provider",
				EmbeddingModel:     defaultEmbeddingModel,
				EmbeddingDimension: 768,
				VectorStoreName:    "My Knowledge Base",
				Metadata:           models.VectorStoreMetadata{Description: "test description"},
			},
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.NoError(t, err)

		var cfg LlamaStackConfig
		require.NoError(t, cfg.FromYAML(result))

		require.Len(t, cfg.RegisteredResources.VectorStores, 1)
		regVS := cfg.RegisteredResources.VectorStores[0]
		assert.Equal(t, "vs-reg-001", regVS.VectorStoreID)
		assert.Equal(t, "pg-provider", regVS.ProviderID)
		assert.Equal(t, defaultEmbeddingModel, regVS.EmbeddingModel)
		assert.Equal(t, 768, regVS.EmbeddingDimension)
		assert.Equal(t, "My Knowledge Base", regVS.VectorStoreName)
		assert.Equal(t, "test description", regVS.Metadata["description"])
	})

	t.Run("two stores sharing a provider add the provider only once", func(t *testing.T) {
		makeVS := func(vsID string) ValidatedVectorStore {
			return ValidatedVectorStore{
				Provider: models.VectorIOProvider{
					ProviderID:   "shared-pg",
					ProviderType: "remote::pgvector",
					Config:       models.VectorIOProviderConfig{Extra: map[string]interface{}{"host": "pg.svc"}},
				},
				RegisteredStore: models.RegisteredVectorStore{
					VectorStoreID:  vsID,
					ProviderID:     "shared-pg",
					EmbeddingModel: defaultEmbeddingModel,
				},
				CredEnvVarName: "VS_CREDENTIAL_1",
				CredSecretRef:  &models.SecretKeyRef{Name: "pg-secret", Key: "password"},
			}
		}

		result, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false,
			[]ValidatedVectorStore{makeVS("vs-a"), makeVS("vs-b")}, nil)
		require.NoError(t, err)

		var cfg LlamaStackConfig
		require.NoError(t, cfg.FromYAML(result))

		providerCount := 0
		for _, p := range cfg.Providers.VectorIO {
			if p.ProviderID == "shared-pg" {
				providerCount++
			}
		}
		assert.Equal(t, 1, providerCount, "shared provider should appear only once in vector_io")
		assert.Len(t, cfg.RegisteredResources.VectorStores, 2)
	})

	t.Run("error when external provider_id collides with built-in provider", func(t *testing.T) {
		// "milvus" is pre-registered by NewDefaultLlamaStackConfig; using the same ID for an
		// external provider must be rejected, not silently produce a duplicate provider entry.
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "milvus", // same as the built-in default
				ProviderType: "remote::milvus",
				Config:       models.VectorIOProviderConfig{Extra: map[string]interface{}{"uri": "http://external-milvus:19530"}},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-conflict",
				ProviderID:     "milvus",
				EmbeddingModel: defaultEmbeddingModel,
			},
		}

		_, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "milvus")
		assert.Contains(t, err.Error(), "conflicts")
	})

	t.Run("error when vector store embedding model is not registered", func(t *testing.T) {
		vs := ValidatedVectorStore{
			Provider: models.VectorIOProvider{
				ProviderID:   "pg-provider",
				ProviderType: "remote::pgvector",
				Config:       models.VectorIOProviderConfig{Extra: map[string]interface{}{}},
			},
			RegisteredStore: models.RegisteredVectorStore{
				VectorStoreID:  "vs-bad",
				ProviderID:     "pg-provider",
				EmbeddingModel: "nonexistent-embedding-model",
			},
		}

		_, err := newTestClient().generateLlamaStackConfig(ctx, "ns", nil, false, []ValidatedVectorStore{vs}, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "nonexistent-embedding-model")
	})
}
