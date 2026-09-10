package fake

import (
	"context"

	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
)

// MaaSClient is a fake hosted MaaS client for local development and testing.
type MaaSClient struct{}

var _ interface {
	ListModels(context.Context, maas.RequestConfig) (maas.Response, error)
} = (*MaaSClient)(nil)

func (c *MaaSClient) ListModels(_ context.Context, _ maas.RequestConfig) (maas.Response, error) {
	var response maas.Response
	response.Data = []maas.Model{
		{ID: "maas-generation", DisplayName: "MaaS generation", Description: "Mock MaaS model"},
		{ID: "maas-embedding", DisplayName: "MaaS embedding", Description: "Mock MaaS model"},
	}
	return response, nil
}
