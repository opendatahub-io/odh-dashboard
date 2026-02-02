package repositories

import (
	"context"
	"log/slog"
	"net/url"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type ModelsRepository struct {
	logger     *slog.Logger
	maasClient *maas.MaasClient
}

func NewModelsRepository(logger *slog.Logger, maasApiUrl string) (*ModelsRepository, error) {
	parsedApiUrl, err := url.Parse(maasApiUrl)
	if err != nil {
		return nil, err
	}

	return &ModelsRepository{
		logger:     logger,
		maasClient: maas.NewMaasClient(logger, parsedApiUrl),
	}, nil
}

func (r *ModelsRepository) ListModels(ctx context.Context) ([]models.MaaSModel, error) {
	r.logger.Debug("Listing MaaS models")

	return r.maasClient.ListModels(ctx)
}
