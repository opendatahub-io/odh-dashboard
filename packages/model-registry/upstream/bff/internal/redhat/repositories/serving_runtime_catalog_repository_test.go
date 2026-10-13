package repositories

import (
	"errors"
	"fmt"
	"net/url"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/mocks"
	"github.com/stretchr/testify/require"
)

func servingRuntimeListQuery(values url.Values) url.Values {
	query := url.Values{}
	for key, value := range values {
		query[key] = append(query[key], value...)
	}
	if len(query["pageSize"]) == 0 && len(query["nextPageToken"]) == 0 {
		query.Set("pageSize", "50")
	}
	return query
}

func TestServingRuntimeCatalogMockBrowsing(t *testing.T) {
	repo := &mocks.ModelCatalogClientMock{}
	first, err := repo.GetAllServingRuntimes(nil, url.Values{"pageSize": {"1"}, "orderBy": {"NAME"}})
	require.NoError(t, err)
	require.Len(t, first.Items, 1)
	require.Equal(t, "caikit-nlp", *first.Items[0].Name)
	require.NotEmpty(t, first.NextPageToken)
	next, err := repo.GetAllServingRuntimes(nil, url.Values{"pageSize": {"1"}, "orderBy": {"NAME"}, "nextPageToken": {first.NextPageToken}})
	require.NoError(t, err)
	require.Equal(t, "mlserver", *next.Items[0].Name)
	runtime, err := repo.GetServingRuntime(nil, *next.Items[0].ID)
	require.NoError(t, err)
	require.Equal(t, *next.Items[0].Name, *runtime.Name)
	versions, err := repo.GetServingRuntimeVersions(nil, *runtime.ID, nil)
	require.NoError(t, err)
	require.Equal(t, *runtime.VersionCount, versions.Size)
	require.NotEmpty(t, versions.Items[0].Image)
	filters, err := repo.GetServingRuntimesFilter(nil)
	require.NoError(t, err)
	require.Len(t, *filters.Filters, 2)
	require.Contains(t, *filters.Filters, "hardware")
	require.Contains(t, *filters.Filters, "modelFormat")
}

func TestServingRuntimeCatalogMockFilters(t *testing.T) {
	repo := &mocks.ModelCatalogClientMock{}
	for _, tt := range []struct {
		name  string
		query url.Values
		count int
	}{
		{"search", url.Values{"q": {"VLLM"}}, 1},
		{"name pattern", url.Values{"name": {"%server"}}, 1},
		{"source", url.Values{"source": {"redhat-runtimes"}}, 12},
		{"multiple sources", url.Values{"source": {"redhat-runtimes", "community-runtimes"}}, 12},
		{"source label", url.Values{"sourceLabel": {"null"}}, 0},
		{"named source label", url.Values{"sourceLabel": {"Red Hat"}}, 12},
		{"multiple source labels", url.Values{"sourceLabel": {"Red Hat", "null"}}, 12},
		{"comma separated source labels", url.Values{"sourceLabel": {"Red Hat,null"}}, 12},
		{"unknown source label", url.Values{"sourceLabel": {"unknown"}}, 0},
		{"source and label intersection", url.Values{"source": {"community-runtimes"}, "sourceLabel": {"Red Hat"}}, 0},
		{"filter", url.Values{"filterQuery": {"hardware='nvidia.com/gpu' AND modelFormat IN ('safetensors')"}}, 3},
		{"accelerator", url.Values{"filterQuery": {"hardware='nvidia.com/gpu'"}}, 5},
		{"format", url.Values{"filterQuery": {"modelFormat IN ('onnx', 'sklearn')"}}, 3},
		{"huggingface", url.Values{"filterQuery": {"modelFormat='huggingface'"}}, 2},
		{"cpu or gpu", url.Values{"filterQuery": {"hardware='cpu-or-gpu'"}}, 2},
		{"amd accelerator", url.Values{"filterQuery": {"hardware='amd.com/gpu'"}}, 1},
		{"empty", url.Values{"q": {"no-such-runtime"}}, 0},
		{"end of results", url.Values{"nextPageToken": {"9223372036854775807"}}, 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			list, err := repo.GetAllServingRuntimes(nil, servingRuntimeListQuery(tt.query))
			require.NoError(t, err)
			require.NotNil(t, list.Items)
			require.Len(t, list.Items, tt.count)
		})
	}
	versions, err := repo.GetServingRuntimeVersions(nil, "1", url.Values{"filterQuery": {"supportLevel='techPreview'"}})
	require.NoError(t, err)
	require.Len(t, versions.Items, 1)
	require.Equal(t, "0.6.0", versions.Items[0].Version)
}

func TestServingRuntimeCatalogMockErrors(t *testing.T) {
	repo := &mocks.ModelCatalogClientMock{}
	for _, query := range []url.Values{
		{"pageSize": {"0"}}, {"pageSize": {"2147483648"}}, {"nextPageToken": {"-1"}},
		{"filterQuery": {"modelFormat LIKE 'onn%'"}}, {"filterQuery": {"unknown='value'"}}, {"sortOrder": {"invalid"}},
		{"filterQuery": {"provider='Red Hat'"}}, {"filterQuery": {"tags='gpu'"}},
		{"filterQuery": {"capabilities.supportedAccelerators='nvidia.com/gpu'"}},
		{"filterQuery": {"supportedModelFormats.name='onnx'"}},
	} {
		_, err := repo.GetAllServingRuntimes(nil, query)
		var httpErr *httpclient.HTTPError
		require.ErrorAs(t, err, &httpErr)
		require.Equal(t, 400, httpErr.StatusCode)
	}
	_, err := repo.GetServingRuntimeVersions(nil, "missing", nil)
	var httpErr *httpclient.HTTPError
	require.ErrorAs(t, err, &httpErr)
	require.Equal(t, 404, httpErr.StatusCode)
}

func TestServingRuntimeCatalogOrderByValues(t *testing.T) {
	repo := &mocks.ModelCatalogClientMock{}
	for _, field := range []string{"ID", "NAME", "CREATE_TIME", "LAST_UPDATE_TIME", "RECOMMENDED"} {
		t.Run(field, func(t *testing.T) {
			query := servingRuntimeListQuery(url.Values{"orderBy": {field}})
			list, err := repo.GetAllServingRuntimes(nil, query)
			require.NoError(t, err)
			require.Len(t, list.Items, 12)
			versions, err := repo.GetServingRuntimeVersions(nil, "1", query)
			require.NoError(t, err)
			require.Len(t, versions.Items, 2)
		})
	}
	_, err := repo.GetAllServingRuntimes(nil, url.Values{"orderBy": {"INVALID"}})
	require.Error(t, err)
}

func TestServingRuntimeFilterOptionsMatchMockData(t *testing.T) {
	repo := &mocks.ModelCatalogClientMock{}
	options, err := repo.GetServingRuntimesFilter(nil)
	require.NoError(t, err)
	require.Len(t, *options.Filters, 2)
	require.ElementsMatch(t, []interface{}{"amd.com/gpu", "cpu", "cpu-or-gpu", "ibm.com/spyre", "habana.ai/gaudi", "nvidia.com/gpu"}, (*options.Filters)["hardware"].Values)
	require.ElementsMatch(t, []interface{}{"caikit", "huggingface", "onnx", "openvino_ir", "pytorch", "xgboost", "safetensors", "sklearn", "tensorflow", "tensorrt", "torchscript"}, (*options.Filters)["modelFormat"].Values)
	for field, option := range *options.Filters {
		for _, value := range option.Values {
			t.Run(fmt.Sprintf("%s/%v", field, value), func(t *testing.T) {
				result, err := repo.GetAllServingRuntimes(nil, url.Values{"filterQuery": {fmt.Sprintf("%s='%v'", field, value)}})
				require.NoError(t, err)
				require.NotEmpty(t, result.Items)
			})
		}
	}
	for _, runtime := range mocks.GetServingRuntimeMocks() {
		for _, format := range runtime.SupportedModelFormats {
			require.Contains(t, (*options.Filters)["modelFormat"].Values, format.Name)
		}
		if runtime.Capabilities != nil {
			for _, hardware := range runtime.Capabilities.SupportedAccelerators {
				require.Contains(t, (*options.Filters)["hardware"].Values, hardware)
			}
		}
		versions, err := repo.GetServingRuntimeVersions(nil, *runtime.ID, nil)
		require.NoError(t, err)
		require.Equal(t, *runtime.VersionCount, versions.Size)
	}
}

type runtimeCatalogHTTPClient struct {
	httpclient.HTTPClientInterface
	get func(string) ([]byte, error)
}

func (c *runtimeCatalogHTTPClient) GET(path string) ([]byte, error) { return c.get(path) }

func TestServingRuntimeCatalogEscapesRuntimeID(t *testing.T) {
	for _, versions := range []bool{false, true} {
		name := "detail"
		path := "/serving_runtimes/vendor%2Fruntime%3Fname=one%23tag"
		if versions {
			name = "versions"
			path += "/versions"
		}
		t.Run(name, func(t *testing.T) {
			called := false
			client := &runtimeCatalogHTTPClient{get: func(got string) ([]byte, error) {
				called = true
				require.Equal(t, path, got)
				return []byte(`{}`), nil
			}}
			repo := &ServingRuntimeCatalogRepository{}
			var err error
			if versions {
				_, err = repo.GetServingRuntimeVersions(client, "vendor/runtime?name=one#tag", nil)
			} else {
				_, err = repo.GetServingRuntime(client, "vendor/runtime?name=one#tag")
			}
			require.NoError(t, err)
			require.True(t, called)
		})
	}
}

func TestServingRuntimeCatalogPreservesClientErrors(t *testing.T) {
	for _, endpoint := range []string{"list", "filters", "detail", "versions"} {
		t.Run(endpoint, func(t *testing.T) {
			failure := errors.New("connection failed")
			client := &runtimeCatalogHTTPClient{get: func(string) ([]byte, error) { return nil, failure }}
			repo := &ServingRuntimeCatalogRepository{}
			var err error
			switch endpoint {
			case "list":
				data, getErr := repo.GetAllServingRuntimes(client, nil)
				require.Nil(t, data)
				err = getErr
			case "filters":
				data, getErr := repo.GetServingRuntimesFilter(client)
				require.Nil(t, data)
				err = getErr
			case "detail":
				data, getErr := repo.GetServingRuntime(client, "1")
				require.Nil(t, data)
				err = getErr
			case "versions":
				data, getErr := repo.GetServingRuntimeVersions(client, "1", nil)
				require.Nil(t, data)
				err = getErr
			}
			require.ErrorIs(t, err, failure)
		})
	}
}
