package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"gopkg.in/yaml.v2"
)

// ExternalVectorStoresRepository handles external vector store operations
type ExternalVectorStoresRepository struct {
	logger *slog.Logger
}

// NewExternalVectorStoresRepository creates a repository for external vector stores
func NewExternalVectorStoresRepository(logger *slog.Logger) *ExternalVectorStoresRepository {
	if logger == nil {
		logger = slog.Default()
	}
	return &ExternalVectorStoresRepository{logger: logger}
}

// ExternalVectorStoreEntry pairs a store config with its embedding model availability
type ExternalVectorStoreEntry struct {
	Config                  models.ExternalVectorStoreConfig
	EmbeddingModelAvailable bool
}

// ToSummary converts an entry to a frontend-safe summary, stripping sensitive fields.
func (e ExternalVectorStoreEntry) ToSummary() models.ExternalVectorStoreSummary {
	return models.ExternalVectorStoreSummary{
		Name:                    e.Config.Name,
		DisplayName:             e.Config.DisplayName,
		ProviderType:            e.Config.ProviderType,
		Collection:              e.Config.Collection,
		Description:             e.Config.Description,
		Owner:                   e.Config.Owner,
		Domain:                  e.Config.Domain,
		Embedding:               e.Config.Embedding,
		EmbeddingModelAvailable: e.EmbeddingModelAvailable,
	}
}

// ExternalVectorStoresResult holds the parsed vector stores and ConfigMap metadata
type ExternalVectorStoresResult struct {
	VectorStores  []ExternalVectorStoreEntry
	ConfigMapInfo models.ConfigMapInfo
}

// ListExternalVectorStores reads the vector stores ConfigMap from the user's namespace, parses stores.yaml,
// and checks embedding model availability against the LlamaStack config.
func (r *ExternalVectorStoresRepository) ListExternalVectorStores(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	namespace string,
) (*ExternalVectorStoresResult, error) {
	configMap, err := k8sClient.GetConfigMap(ctx, identity, namespace, constants.VectorStoresConfigMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get vector stores ConfigMap: %w", err)
	}

	storesYAML, ok := configMap.Data[constants.VectorStoresYAMLKey]
	if !ok {
		return nil, fmt.Errorf("%s key not found in ConfigMap %s", constants.VectorStoresYAMLKey, constants.VectorStoresConfigMapName)
	}

	var doc models.ExternalVectorStoresDocument
	if err := yaml.Unmarshal([]byte(storesYAML), &doc); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", constants.VectorStoresYAMLKey, err)
	}

	if doc.Version != constants.VectorStoresSchemaVersion {
		r.logger.Warn("Vector stores ConfigMap schema version mismatch",
			"expected", constants.VectorStoresSchemaVersion,
			"actual", doc.Version,
			"namespace", namespace)
	}

	availableModels := r.loadAvailableEmbeddingModels(ctx, k8sClient, identity, namespace)

	entries := make([]ExternalVectorStoreEntry, 0, len(doc.VectorStores))
	for _, store := range doc.VectorStores {
		entries = append(entries, ExternalVectorStoreEntry{
			Config:                  store,
			EmbeddingModelAvailable: availableModels[store.Embedding.ModelID],
		})
	}

	result := &ExternalVectorStoresResult{
		VectorStores: entries,
	}
	result.ConfigMapInfo.Name = configMap.Name
	result.ConfigMapInfo.Namespace = configMap.Namespace
	if configMap.CreationTimestamp.IsZero() {
		result.ConfigMapInfo.LastUpdated = "unknown"
	} else {
		result.ConfigMapInfo.LastUpdated = configMap.CreationTimestamp.Format("2006-01-02T15:04:05Z")
	}

	return result, nil
}

// loadAvailableEmbeddingModels builds a set of available embedding model IDs
// by reading the LlamaStack config from the same namespace.
// Returns an empty map if no LSD or config is found (graceful degradation).
func (r *ExternalVectorStoresRepository) loadAvailableEmbeddingModels(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	namespace string,
) map[string]bool {
	available := make(map[string]bool)

	lsdList, err := k8sClient.GetLlamaStackDistributions(ctx, identity, namespace)
	if err != nil {
		r.logger.Debug("Failed to get LlamaStackDistributions for embedding check", "namespace", namespace, "error", err)
		return available
	}
	if len(lsdList.Items) == 0 {
		r.logger.Debug("No LlamaStackDistribution found, all embedding models marked unavailable", "namespace", namespace)
		return available
	}

	lsd := lsdList.Items[0]
	configMapName := constants.LlamaStackConfigMapName
	if lsd.Spec.Server.UserConfig != nil && lsd.Spec.Server.UserConfig.ConfigMapName != "" {
		configMapName = lsd.Spec.Server.UserConfig.ConfigMapName
	}

	configMap, err := k8sClient.GetConfigMap(ctx, identity, namespace, configMapName)
	if err != nil {
		r.logger.Debug("Failed to get LlamaStack ConfigMap for embedding check", "namespace", namespace, "configMap", configMapName, "error", err)
		return available
	}

	configYAML, ok := configMap.Data[constants.LlamaStackConfigYAMLKey]
	if !ok {
		r.logger.Debug("config.yaml key not found in LlamaStack ConfigMap", "namespace", namespace, "configMap", configMapName)
		return available
	}

	var lsConfig kubernetes.LlamaStackConfig
	if err := lsConfig.FromYAML(configYAML); err != nil {
		r.logger.Debug("Failed to parse LlamaStack config YAML", "namespace", namespace, "error", err)
		return available
	}

	for _, model := range lsConfig.RegisteredResources.Models {
		if model.ModelType == "embedding" {
			available[model.ModelID] = true
			if model.ProviderModelID != "" {
				available[model.ProviderModelID] = true
			}
		}
	}

	return available
}
