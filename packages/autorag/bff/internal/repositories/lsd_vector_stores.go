package repositories

import (
	"context"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

const vectorIOAPI = "vector_io"

type LSDVectorStoresRepository struct{}

func NewLSDVectorStoresRepository() *LSDVectorStoresRepository {
	return &LSDVectorStoresRepository{}
}

// GetLSDVectorStoreProviders retrieves vector store providers from LlamaStack
// by calling the native /v1/providers endpoint and filtering for vector_io API type.
func (r *LSDVectorStoresRepository) GetLSDVectorStoreProviders(ctx context.Context) (*models.LSDVectorStoreProvidersData, error) {
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	allProviders, err := client.ListProviders(ctx)
	if err != nil {
		return nil, err
	}

	vectorStoreProviders := make([]models.LSDVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.LSDVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.LSDVectorStoreProvidersData{
		VectorStoreProviders: vectorStoreProviders,
	}, nil
}
