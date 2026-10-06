package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	"github.com/kubeflow/hub/ui/bff/internal/mocks"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
	"github.com/stretchr/testify/require"
)

func TestServingRuntimeCatalogRoutes(t *testing.T) {
	tests := []struct {
		name, path string
		status     int
	}{
		{"list", api.ServingRuntimeListPath + "?namespace=test", 200},
		{"filters", api.ServingRuntimeFilterOptionsPath + "?namespace=test", 200},
		{"get", api.ServingRuntimeListPath + "/1?namespace=test", 200},
		{"versions", api.ServingRuntimeListPath + "/1/versions?namespace=test", 200},
		{"missing runtime", api.ServingRuntimeListPath + "/missing?namespace=test", 404},
		{"missing versions parent", api.ServingRuntimeListPath + "/missing/versions?namespace=test", 404},
		{"missing namespace", api.ServingRuntimeListPath, 400},
		{"invalid page size", api.ServingRuntimeListPath + "?namespace=test&pageSize=-1", 400},
		{"invalid versions token", api.ServingRuntimeListPath + "/1/versions?namespace=test&nextPageToken=oops", 400},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := api.NewTestApp(config.EnvConfig{MockMRCatalogClient: true, DeploymentMode: config.DeploymentModeFederated}, noopLogger(), &fakeKubeFactory{}, &repositories.Repositories{ModelCatalogClient: &mocks.ModelCatalogClientMock{}})
			rr := httptest.NewRecorder()
			app.Routes().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, tt.path, nil))
			require.Equal(t, tt.status, rr.Code, rr.Body.String())
			var body map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			if tt.status == 200 {
				require.Contains(t, body, "data")
				require.NotEqual(t, "null", string(body["data"]))
			} else {
				require.Contains(t, body, "error")
			}
		})
	}
}

func TestServingRuntimeCatalogNotAvailableOutsideMock(t *testing.T) {
	liveCatalogClient, err := repositories.NewModelCatalogClient(noopLogger())
	require.NoError(t, err)
	app := api.NewTestApp(
		config.EnvConfig{DevMode: false, MockMRCatalogClient: false, DeploymentMode: config.DeploymentModeFederated},
		noopLogger(),
		&fakeKubeFactory{},
		&repositories.Repositories{ModelCatalogClient: liveCatalogClient},
	)
	router := app.Routes()
	for _, path := range []string{api.ServingRuntimeListPath, api.ServingRuntimeFilterOptionsPath, api.ServingRuntimeListPath + "/1", api.ServingRuntimeListPath + "/1/versions"} {
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, path+"?namespace=test", nil))
		require.Equal(t, http.StatusInternalServerError, rr.Code, rr.Body.String())
	}
}
