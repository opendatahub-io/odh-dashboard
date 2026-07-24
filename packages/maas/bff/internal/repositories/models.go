package repositories

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type ModelsRepository struct {
	logger     *slog.Logger
	maasClient *maas.MaasClient
}

// NewModelsRepository creates a models repository.
// An empty maasApiUrl is allowed; the underlying MaasClient can be configured later via SetMaasApiURL.
func NewModelsRepository(logger *slog.Logger, maasApiUrl string) (*ModelsRepository, error) {
	client, err := maas.NewMaasClient(logger, maasApiUrl)
	if err != nil {
		return nil, err
	}
	return &ModelsRepository{
		logger:     logger,
		maasClient: client,
	}, nil
}

// SetMaasApiURL configures the upstream maas-api base URL on the shared client.
func (r *ModelsRepository) SetMaasApiURL(maasApiUrl string) error {
	return r.maasClient.SetBaseURL(maasApiUrl)
}

// Ready reports whether the upstream maas-api client has a configured base URL.
func (r *ModelsRepository) Ready() bool {
	return r.maasClient != nil && r.maasClient.Ready()
}

func (r *ModelsRepository) ListModels(ctx context.Context, headers http.Header) ([]models.MaaSModel, error) {
	r.logger.Debug("Listing MaaS models")

	return r.maasClient.ListModels(ctx, headers)
}
