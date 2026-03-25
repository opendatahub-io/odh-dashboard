package repositories

import (
	"context"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDVectorStoresRepository struct{}

func NewLSDVectorStoresRepository() *LSDVectorStoresRepository {
	return &LSDVectorStoresRepository{}
}

// GetLSDVectorStores retrieves all vector stores from LlamaStack.
// LlamaStack stores provider_id in the metadata field of the OpenAI-compatible response.
func (r *LSDVectorStoresRepository) GetLSDVectorStores(ctx context.Context) (*models.LSDVectorStoresData, error) {
	client, err := helper.GetContextLlamaStackClient(ctx)
	if err != nil {
		return nil, err
	}

	rawStores, err := client.ListVectorStores(ctx)
	if err != nil {
		return nil, err
	}

	logger := helper.GetContextLogger(ctx)

	vectorStores := make([]models.LSDVectorStore, 0, len(rawStores))
	for _, raw := range rawStores {
		provider := raw.Metadata["provider_id"]
		if provider == "" {
			logger.Debug("vector store has no provider_id in metadata, it will be excluded from supported provider filtering",
				"id", raw.ID, "name", raw.Name)
		}

		vectorStores = append(vectorStores, models.LSDVectorStore{
			ID:       raw.ID,
			Name:     raw.Name,
			Status:   string(raw.Status),
			Provider: provider,
		})
	}

	return &models.LSDVectorStoresData{
		VectorStores: vectorStores,
	}, nil
}
