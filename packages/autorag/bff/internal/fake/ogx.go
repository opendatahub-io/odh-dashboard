package fake

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// OGXClient is a fake implementation of ogx.OGXClientInterface for local development and testing.
type OGXClient struct{}

var _ ogx.OGXClientInterface = (*OGXClient)(nil)

func (c *OGXClient) ListModels(_ context.Context, _, _ string) ([]models.OGXNativeModel, error) {
	return []models.OGXNativeModel{}, nil
}

func (c *OGXClient) ListProviders(_ context.Context, _, _ string) ([]models.OGXProvider, error) {
	return []models.OGXProvider{}, nil
}
