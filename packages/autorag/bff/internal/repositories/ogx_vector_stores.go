package repositories

import (
	"context"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

const vectorIOAPI = "vector_io"

type OGXVectorStoresRepository struct{}

func NewOGXVectorStoresRepository() *OGXVectorStoresRepository {
	return &OGXVectorStoresRepository{}
}

// GetOGXVectorStoreProviders retrieves vector store providers from OGX
// by calling the native /v1/providers endpoint and filtering for vector_io API type.
func (r *OGXVectorStoresRepository) GetOGXVectorStoreProviders(ctx context.Context) (*models.OGXVectorStoreProvidersData, error) {
	client, err := helper.GetContextOGXClient(ctx)
	if err != nil {
		return nil, err
	}

	allProviders, err := client.ListProviders(ctx)
	if err != nil {
		return nil, err
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

	return &models.OGXVectorStoreProvidersData{
		VectorStoreProviders: vectorStoreProviders,
	}, nil
}
