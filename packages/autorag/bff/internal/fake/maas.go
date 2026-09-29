package fake

import (
	"context"

	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type MaaSClient struct{}

func (c *MaaSClient) ListModels(context.Context, string, string) ([]models.MaaSNativeModel, error) {
	return []models.MaaSNativeModel{
		{
			ID:      "granite-3-8b-instruct",
			OwnedBy: "maas-models",
			Ready:   true,
			ModelDetails: &models.MaaSModelDetails{
				DisplayName: "Granite 3 8B Instruct",
				Description: "IBM Granite 3 8B instruction-tuned language model.",
			},
		},
		{ID: "embedding-model", OwnedBy: "maas-models", Ready: true},
	}, nil
}

var _ maas.MaaSClientInterface = (*MaaSClient)(nil)
