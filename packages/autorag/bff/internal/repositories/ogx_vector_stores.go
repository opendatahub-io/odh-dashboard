package repositories

import (
	"context" // used by resolveOGXCredentials and OGXClientInterface
	"fmt"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

const vectorIOAPI = "vector_io"

type OGXVectorStoresRepository struct {
	ogxClient  ogx.OGXClientInterface
	k8sService *corek8s.K8sService
}

func NewOGXVectorStoresRepository(ogxClient ogx.OGXClientInterface, k8sService *corek8s.K8sService) *OGXVectorStoresRepository {
	return &OGXVectorStoresRepository{ogxClient: ogxClient, k8sService: k8sService}
}

// GetOGXVectorStoreProviders retrieves vector store providers from OGX by calling
// /v1/providers and filtering for the vector_io API type.
func (r *OGXVectorStoresRepository) GetOGXVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.OGXVectorStoreProvidersData, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	allProviders, err := r.ogxClient.ListProviders(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX providers: %w", err)
	}

	vectorStoreProviders := make([]models.OGXVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.OGXVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.OGXVectorStoreProvidersData{VectorStoreProviders: vectorStoreProviders}, nil
}
