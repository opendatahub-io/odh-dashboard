package repositories

import (
	"encoding/json"
	"fmt"
	"net/url"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	upstreamrepos "github.com/kubeflow/hub/ui/bff/internal/repositories"
)

// ServingRuntimeCatalogClient is implemented by the live repository and catalog mock client.
type ServingRuntimeCatalogClient interface {
	GetAllServingRuntimes(httpclient.HTTPClientInterface, url.Values) (*models.ServingRuntimeList, error)
	GetServingRuntimesFilter(httpclient.HTTPClientInterface) (*models.FilterOptionsList, error)
	GetServingRuntime(httpclient.HTTPClientInterface, string) (*models.ServingRuntime, error)
	GetServingRuntimeVersions(httpclient.HTTPClientInterface, string, url.Values) (*models.ServingRuntimeVersionList, error)
}

type ServingRuntimeCatalogRepository struct{}

var _ ServingRuntimeCatalogClient = (*ServingRuntimeCatalogRepository)(nil)

const servingRuntimesPath = "/serving_runtimes"

func (r *ServingRuntimeCatalogRepository) GetAllServingRuntimes(client httpclient.HTTPClientInterface, query url.Values) (*models.ServingRuntimeList, error) {
	return getServingRuntimeResource[models.ServingRuntimeList](client, upstreamrepos.UrlWithPageParams(servingRuntimesPath, query))
}

func (r *ServingRuntimeCatalogRepository) GetServingRuntimesFilter(client httpclient.HTTPClientInterface) (*models.FilterOptionsList, error) {
	return getServingRuntimeResource[models.FilterOptionsList](client, servingRuntimesPath+"/filter_options")
}

func (r *ServingRuntimeCatalogRepository) GetServingRuntime(client httpclient.HTTPClientInterface, id string) (*models.ServingRuntime, error) {
	return getServingRuntimeResource[models.ServingRuntime](client, servingRuntimesPath+"/"+url.PathEscape(id))
}

func (r *ServingRuntimeCatalogRepository) GetServingRuntimeVersions(client httpclient.HTTPClientInterface, id string, query url.Values) (*models.ServingRuntimeVersionList, error) {
	path := servingRuntimesPath + "/" + url.PathEscape(id) + "/versions"
	return getServingRuntimeResource[models.ServingRuntimeVersionList](client, upstreamrepos.UrlWithPageParams(path, query))
}

func getServingRuntimeResource[T any](client httpclient.HTTPClientInterface, path string) (*T, error) {
	data, err := client.GET(path)
	if err != nil {
		return nil, fmt.Errorf("error fetching serving runtime catalog resource: %w", err)
	}
	var resource T
	if err := json.Unmarshal(data, &resource); err != nil {
		return nil, fmt.Errorf("error decoding serving runtime catalog response: %w", err)
	}
	return &resource, nil
}
