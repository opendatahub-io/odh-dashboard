package repositories

import (
	"context"
	"log/slog"

	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type ModelsRepository struct {
	logger *slog.Logger
}

func NewModelsRepository(logger *slog.Logger) *ModelsRepository {
	return &ModelsRepository{
		logger: logger,
	}
}

func (r *ModelsRepository) ListModels(ctx context.Context) ([]models.MaaSModel, error) {
	r.logger.Debug("Listing MaaS models")

	client, err := helper.GetContextMaaSClient(ctx)
	if err != nil {
		return nil, err
	}

	return client.ListModels(ctx)
}
