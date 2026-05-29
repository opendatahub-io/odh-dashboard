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
	apierrors "k8s.io/apimachinery/pkg/api/errors"
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

// ExternalVectorStoresResult holds the parsed vector stores and ConfigMap metadata
type ExternalVectorStoresResult struct {
	VectorStores  []models.ExternalVectorStoreSummary
	ConfigMapInfo models.ConfigMapInfo
}

// ListExternalVectorStores reads the gen-ai-aa-vector-stores ConfigMap from the namespace,
// parses the providers and registered_resources sections, and resolves provider metadata per store.
// Embedding model status (not_available / available / registered) is computed client-side by the
// frontend using the already-loaded merged models data.
// Returns an empty result (not an error) when the ConfigMap does not exist — a fresh namespace
// with no external vector stores configured is a valid empty state.
func (r *ExternalVectorStoresRepository) ListExternalVectorStores(
	ctx context.Context,
	k8sClient kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	namespace string,
) (*ExternalVectorStoresResult, error) {
	configMap, err := k8sClient.GetConfigMap(ctx, identity, namespace, constants.VectorStoresConfigMapName)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return &ExternalVectorStoresResult{VectorStores: []models.ExternalVectorStoreSummary{}}, nil
		}
		return nil, fmt.Errorf("failed to get vector stores ConfigMap: %w", err)
	}

	configYAML, ok := configMap.Data[constants.VectorStoresYAMLKey]
	if !ok {
		return nil, fmt.Errorf("%s key not found in ConfigMap %s", constants.VectorStoresYAMLKey, constants.VectorStoresConfigMapName)
	}

	var doc models.ExternalVectorStoresDocument
	if err := yaml.Unmarshal([]byte(configYAML), &doc); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", constants.VectorStoresYAMLKey, err)
	}

	// Build a lookup map from provider_id to VectorIOProvider for resolving provider_type per registered store.
	providerByID := make(map[string]models.VectorIOProvider, len(doc.Providers.VectorIO))
	for _, p := range doc.Providers.VectorIO {
		providerByID[p.ProviderID] = p
	}

	summaries := make([]models.ExternalVectorStoreSummary, 0, len(doc.RegisteredResources.VectorStores))
	for _, store := range doc.RegisteredResources.VectorStores {
		provider := providerByID[store.ProviderID]

		summaries = append(summaries, models.ExternalVectorStoreSummary{
			VectorStoreID:      store.VectorStoreID,
			VectorStoreName:    store.VectorStoreName,
			ProviderID:         store.ProviderID,
			ProviderType:       provider.ProviderType,
			EmbeddingModel:     store.EmbeddingModel,
			EmbeddingDimension: store.EmbeddingDimension,
			Description:        store.Metadata.Description,
		})
	}

	result := &ExternalVectorStoresResult{
		VectorStores: summaries,
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
