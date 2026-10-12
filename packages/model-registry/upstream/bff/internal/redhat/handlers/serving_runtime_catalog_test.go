package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync/atomic"
	"testing"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/config"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	"github.com/kubeflow/hub/ui/bff/internal/mocks"
	"github.com/kubeflow/hub/ui/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServingRuntimeCatalogRoutes(t *testing.T) {
	tests := []struct {
		name, path string
		status     int
	}{
		{"list", api.ServingRuntimeListPath + "?namespace=catalog-ns", 200},
		{"filters", api.ServingRuntimeFilterOptionsPath + "?namespace=catalog-ns", 200},
		{"get", api.ServingRuntimeListPath + "/1?namespace=catalog-ns", 200},
		{"versions", api.ServingRuntimeListPath + "/1/versions?namespace=catalog-ns", 200},
		{"missing runtime", api.ServingRuntimeListPath + "/missing?namespace=catalog-ns", 404},
		{"missing versions parent", api.ServingRuntimeListPath + "/missing/versions?namespace=catalog-ns", 404},
		{"missing namespace", api.ServingRuntimeListPath, 400},
		{"invalid page size", api.ServingRuntimeListPath + "?namespace=catalog-ns&pageSize=-1", 400},
		{"invalid versions token", api.ServingRuntimeListPath + "/1/versions?namespace=catalog-ns&nextPageToken=oops", 400},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := api.NewTestApp(config.EnvConfig{MockMRCatalogClient: true, DeploymentMode: config.DeploymentModeFederated}, noopLogger(), &runtimeCatalogKubeFactory{client: &runtimeCatalogKubeClient{address: "catalog.invalid:8080", allow: true}}, repositories.NewRepositories(nil, &mocks.ModelCatalogClientMock{}))
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

type runtimeCatalogKubeClient struct {
	k8s.KubernetesClientInterface
	address        string
	allow          bool
	https          bool
	discoveryError error
}

func (c *runtimeCatalogKubeClient) CanListServicesInNamespace(context.Context, *k8s.RequestIdentity, string) (bool, error) {
	return c.allow, nil
}
func (c *runtimeCatalogKubeClient) GetSelfSubjectRulesReview(context.Context, *k8s.RequestIdentity, string) ([]string, error) {
	return nil, nil
}
func (c *runtimeCatalogKubeClient) GetServiceDetailsByName(_ context.Context, namespace, name, component string) (k8s.ServiceDetails, error) {
	if namespace != "catalog-ns" || name != repositories.ModelCatalogServiceName || component != k8s.ComponentLabelValueCatalog {
		return k8s.ServiceDetails{}, fmt.Errorf("unexpected catalog discovery request")
	}
	return k8s.ServiceDetails{Name: name, ExternalAddressRest: c.address, IsHTTPS: c.https}, c.discoveryError
}

type runtimeCatalogKubeFactory struct{ client *runtimeCatalogKubeClient }

func (f *runtimeCatalogKubeFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}
func (f *runtimeCatalogKubeFactory) ExtractRequestIdentity(http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "test-user", Token: "test-token"}, nil
}
func (f *runtimeCatalogKubeFactory) ValidateRequestIdentity(*k8s.RequestIdentity) error { return nil }

func TestServingRuntimeCatalogLiveRoutes(t *testing.T) {
	for _, secure := range []bool{false, true} {
		t.Run(fmt.Sprintf("https=%t", secure), func(t *testing.T) {
			for _, tt := range []struct {
				name, bffPath, upstreamPath, body string
				query                             url.Values
			}{
				{"list", api.ServingRuntimeListPath, "/serving_runtimes", `{"items":[{"id":"live-1","name":"live-runtime"}],"size":1,"pageSize":2,"nextPageToken":"next"}`, url.Values{"q": {"runtime"}, "name": {"live%"}, "source": {"source-a,source-b"}, "sourceLabel": {"Red Hat"}, "filterQuery": {"hardware='cpu'"}, "pageSize": {"2"}, "nextPageToken": {"cursor"}, "orderBy": {"RECOMMENDED"}, "sortOrder": {"DESC"}}},
				{"filters", api.ServingRuntimeFilterOptionsPath, "/serving_runtimes/filter_options", `{"filters":{"hardware":{"type":"string","values":["cpu"]}}}`, nil},
				{"detail", api.ServingRuntimeListPath + "/live-1", "/serving_runtimes/live-1", `{"id":"live-1","name":"live-runtime"}`, nil},
				{"versions", api.ServingRuntimeListPath + "/live-1/versions", "/serving_runtimes/live-1/versions", `{"items":[{"artifactType":"serving-runtime-version","version":"1.0","image":"example/image:1"}],"size":1,"pageSize":2,"nextPageToken":""}`, url.Values{"pageSize": {"2"}, "nextPageToken": {"cursor"}, "orderBy": {"CREATE_TIME"}, "sortOrder": {"ASC"}, "filterQuery": {"version='1.0'"}}},
			} {
				t.Run(tt.name, func(t *testing.T) {
					var called atomic.Bool
					handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						called.Store(true)
						if r.URL.Path != repositories.ServingRuntimeCatalogAPIPath+tt.upstreamPath {
							t.Errorf("unexpected backend path: %s", r.URL.Path)
						}
						assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
						expected := tt.query
						if expected == nil {
							expected = url.Values{}
						}
						assert.Equal(t, expected, r.URL.Query())
						w.Header().Set("Content-Type", "application/json")
						_, _ = w.Write([]byte(tt.body))
					})
					var server *httptest.Server
					if secure {
						server = httptest.NewTLSServer(handler)
					} else {
						server = httptest.NewServer(handler)
					}
					defer server.Close()
					endpoint, err := url.Parse(server.URL)
					require.NoError(t, err)
					factory := &runtimeCatalogKubeFactory{client: &runtimeCatalogKubeClient{address: endpoint.Host, allow: true, https: secure}}
					app := api.NewTestApp(config.EnvConfig{DeploymentMode: config.DeploymentModeFederated, AuthMethod: config.AuthMethodUser, InsecureSkipVerify: secure}, noopLogger(), factory, repositories.NewRepositories(nil, nil))
					query := url.Values{"namespace": {"catalog-ns"}}
					for key, values := range tt.query {
						query[key] = values
					}
					response := httptest.NewRecorder()
					app.Routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, tt.bffPath+"?"+query.Encode(), nil))
					require.Equal(t, 200, response.Code, response.Body.String())
					require.True(t, called.Load())
					var envelope struct {
						Data json.RawMessage `json:"data"`
					}
					require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
					require.JSONEq(t, tt.body, string(envelope.Data))
				})
			}
		})
	}
}

func TestServingRuntimeCatalogLiveFailures(t *testing.T) {
	for _, route := range []struct{ name, path string }{
		{"list", api.ServingRuntimeListPath},
		{"filters", api.ServingRuntimeFilterOptionsPath},
		{"detail", api.ServingRuntimeListPath + "/live-1"},
		{"versions", api.ServingRuntimeListPath + "/live-1/versions"},
	} {
		t.Run(route.name, func(t *testing.T) {
			for _, tt := range []struct {
				name, namespace, body    string
				allow                    bool
				discoveryError           error
				upstreamStatus, expected int
			}{
				{"missing namespace", "", `{}`, true, nil, 200, 400},
				{"forbidden", "catalog-ns", `{}`, false, nil, 200, 403},
				{"catalog missing", "catalog-ns", `{}`, true, fmt.Errorf("not found"), 200, 404},
				{"upstream bad request", "catalog-ns", `{"code":"400","message":"invalid filter"}`, true, nil, 400, 400},
				{"upstream forbidden", "catalog-ns", `{"code":"403","message":"access denied"}`, true, nil, 403, 403},
				{"upstream server error", "catalog-ns", `{"code":"500","message":"backend failure"}`, true, nil, 500, 500},
				{"upstream not found", "catalog-ns", `{"code":"404","message":"runtime missing"}`, true, nil, 404, 404},
				{"upstream unauthorized", "catalog-ns", `{"code":"401","message":"unauthorized"}`, true, nil, 401, 401},
				{"upstream unavailable", "catalog-ns", `{"code":"503","message":"unavailable"}`, true, nil, 503, 503},
				{"wrong response type", "catalog-ns", `[]`, true, nil, 200, 500},
				{"empty response", "catalog-ns", ``, true, nil, 200, 500},
				{"invalid response", "catalog-ns", `not JSON`, true, nil, 200, 500},
			} {
				t.Run(tt.name, func(t *testing.T) {
					var calls atomic.Int64
					server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						calls.Add(1)
						w.WriteHeader(tt.upstreamStatus)
						_, _ = w.Write([]byte(tt.body))
					}))
					defer server.Close()
					endpoint, err := url.Parse(server.URL)
					require.NoError(t, err)
					factory := &runtimeCatalogKubeFactory{client: &runtimeCatalogKubeClient{address: endpoint.Host, allow: tt.allow, discoveryError: tt.discoveryError}}
					app := api.NewTestApp(config.EnvConfig{DeploymentMode: config.DeploymentModeFederated}, noopLogger(), factory, repositories.NewRepositories(nil, nil))
					response := httptest.NewRecorder()
					app.Routes().ServeHTTP(response, httptest.NewRequest(http.MethodGet, route.path+"?namespace="+tt.namespace, nil))
					require.Equal(t, tt.expected, response.Code, response.Body.String())
					if tt.namespace == "" || !tt.allow || tt.discoveryError != nil {
						require.Zero(t, calls.Load())
					} else {
						require.Equal(t, int64(1), calls.Load())
						if tt.upstreamStatus != http.StatusOK {
							var envelope struct {
								Error json.RawMessage `json:"error"`
							}
							require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
							require.JSONEq(t, tt.body, string(envelope.Error))
						}
					}
				})
			}
		})
	}
}
