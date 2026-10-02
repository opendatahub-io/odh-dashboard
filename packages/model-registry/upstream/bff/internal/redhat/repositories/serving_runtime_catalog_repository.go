package repositories

import (
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	"net/url"
)

// ServingRuntimeCatalogClient is implemented by the catalog mock. The live
// catalog client deliberately does not implement this extension yet.
type ServingRuntimeCatalogClient interface {
	GetAllServingRuntimes(httpclient.HTTPClientInterface, url.Values) (*models.ServingRuntimeList, error)
	GetServingRuntimesFilter(httpclient.HTTPClientInterface) (*models.FilterOptionsList, error)
	GetServingRuntime(httpclient.HTTPClientInterface, string) (*models.ServingRuntime, error)
	GetServingRuntimeVersions(httpclient.HTTPClientInterface, string, url.Values) (*models.ServingRuntimeVersionList, error)
}

type ServingRuntimeCatalogRepository struct {
	client ServingRuntimeCatalogClient
}

func NewServingRuntimeCatalogRepository(client ServingRuntimeCatalogClient) *ServingRuntimeCatalogRepository {
	return &ServingRuntimeCatalogRepository{client: client}
}

func (r *ServingRuntimeCatalogRepository) List(query url.Values) (*models.ServingRuntimeList, error) {
	return r.client.GetAllServingRuntimes(nil, query)
}

func (r *ServingRuntimeCatalogRepository) FilterOptions() (*models.FilterOptionsList, error) {
	return r.client.GetServingRuntimesFilter(nil)
}

func (r *ServingRuntimeCatalogRepository) Get(id string) (*models.ServingRuntime, error) {
	return r.client.GetServingRuntime(nil, id)
}

func (r *ServingRuntimeCatalogRepository) Versions(id string, query url.Values) (*models.ServingRuntimeVersionList, error) {
	return r.client.GetServingRuntimeVersions(nil, id, query)
}
