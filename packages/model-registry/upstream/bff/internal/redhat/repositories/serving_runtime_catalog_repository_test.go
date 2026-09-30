package repositories

import (
	"net/url"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/mocks"
	"github.com/stretchr/testify/require"
)

func TestServingRuntimeCatalogMockBrowsing(t *testing.T) {
	repo := NewServingRuntimeCatalogRepository(&mocks.ModelCatalogClientMock{})
	first, err := repo.List(url.Values{"pageSize": {"1"}, "orderBy": {"NAME"}})
	require.NoError(t, err)
	require.Len(t, first.Items, 1)
	require.Equal(t, "mlserver", *first.Items[0].Name)
	require.NotEmpty(t, first.NextPageToken)
	next, err := repo.List(url.Values{"pageSize": {"1"}, "orderBy": {"NAME"}, "nextPageToken": {first.NextPageToken}})
	require.NoError(t, err)
	require.Equal(t, "ovms", *next.Items[0].Name)
	runtime, err := repo.Get(*next.Items[0].ID)
	require.NoError(t, err)
	require.Equal(t, *next.Items[0].Name, *runtime.Name)
	versions, err := repo.Versions(*runtime.ID, nil)
	require.NoError(t, err)
	require.Equal(t, *runtime.VersionCount, versions.Size)
	require.NotEmpty(t, versions.Items[0].Image)
	filters, err := repo.FilterOptions()
	require.NoError(t, err)
	require.Len(t, *filters.Filters, 2)
	require.Contains(t, *filters.Filters, "hardware")
	require.Contains(t, *filters.Filters, "modelFormat")
}

func TestServingRuntimeCatalogMockFilters(t *testing.T) {
	repo := NewServingRuntimeCatalogRepository(&mocks.ModelCatalogClientMock{})
	for _, tt := range []struct {
		name  string
		query url.Values
		count int
	}{
		{"search", url.Values{"q": {"VLLM"}}, 1},
		{"name pattern", url.Values{"name": {"%server"}}, 1},
		{"source", url.Values{"source": {"redhat-runtimes"}}, 2},
		{"multiple sources", url.Values{"source": {"redhat-runtimes", "community-runtimes"}}, 5},
		{"source label", url.Values{"sourceLabel": {"null"}}, 3},
		{"filter", url.Values{"filterQuery": {"hardware='nvidia.com/gpu' AND modelFormat IN ('safetensors')"}}, 1},
		{"accelerator", url.Values{"filterQuery": {"hardware='nvidia.com/gpu'"}}, 2},
		{"format", url.Values{"filterQuery": {"modelFormat IN ('onnx', 'sklearn')"}}, 3},
		{"huggingface", url.Values{"filterQuery": {"modelFormat='huggingface'"}}, 1},
		{"cpu or gpu", url.Values{"filterQuery": {"hardware='cpu-or-gpu'"}}, 1},
		{"unrepresented accelerator", url.Values{"filterQuery": {"hardware='amd.com/gpu'"}}, 0},
		{"empty", url.Values{"q": {"no-such-runtime"}}, 0},
		{"end of results", url.Values{"nextPageToken": {"9223372036854775807"}}, 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			list, err := repo.List(tt.query)
			require.NoError(t, err)
			require.NotNil(t, list.Items)
			require.Len(t, list.Items, tt.count)
		})
	}
	versions, err := repo.Versions("1", url.Values{"filterQuery": {"supportLevel='techPreview'"}})
	require.NoError(t, err)
	require.Len(t, versions.Items, 1)
	require.Equal(t, "0.6.0", versions.Items[0].Version)
}

func TestServingRuntimeCatalogMockErrors(t *testing.T) {
	repo := NewServingRuntimeCatalogRepository(&mocks.ModelCatalogClientMock{})
	for _, query := range []url.Values{
		{"pageSize": {"0"}}, {"pageSize": {"2147483648"}}, {"nextPageToken": {"-1"}},
		{"filterQuery": {"modelFormat LIKE 'onn%'"}}, {"filterQuery": {"unknown='value'"}}, {"sortOrder": {"invalid"}},
		{"filterQuery": {"provider='Red Hat'"}}, {"filterQuery": {"tags='gpu'"}},
		{"filterQuery": {"capabilities.supportedAccelerators='nvidia.com/gpu'"}},
		{"filterQuery": {"supportedModelFormats.name='onnx'"}},
	} {
		_, err := repo.List(query)
		var httpErr *httpclient.HTTPError
		require.ErrorAs(t, err, &httpErr)
		require.Equal(t, 400, httpErr.StatusCode)
	}
	_, err := repo.Versions("missing", nil)
	var httpErr *httpclient.HTTPError
	require.ErrorAs(t, err, &httpErr)
	require.Equal(t, 404, httpErr.StatusCode)
}
