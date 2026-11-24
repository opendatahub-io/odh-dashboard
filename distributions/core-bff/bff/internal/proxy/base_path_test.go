package proxy

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJoinBasePath(t *testing.T) {
	for _, tc := range []struct{ base, route, want string }{
		{"", "/api/v1/pods", "/api/v1/pods"},
		{"/", "/api/v1/pods", "/api/v1/pods"},
		{"/serving", "/v1/models", "/serving/v1/models"},
		{"/serving/", "/v1/models", "/serving/v1/models"},
		{"/k8s/clusters/c-1", "api/v1", "/k8s/clusters/c-1/api/v1"},
		{"/serving", "", "/serving"},
	} {
		assert.Equal(t, tc.want, JoinBasePath(tc.base, tc.route), tc)
	}
}

// A kubeconfig server can sit behind a path prefix (for example a cluster
// manager's /k8s/clusters/<id>). The proxies must call the route under it.
func TestK8sProxy_KeepsTheAPIServerBasePath(t *testing.T) {
	got := make(chan string, 1)
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.URL.Path
	}))
	defer api.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(api.URL + "/k8s/clusters/c-1"))
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/namespaces", nil).WithContext(newIdentityContext("t"))
	handler.ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, "/k8s/clusters/c-1/api/v1/namespaces", <-got)
}

func TestBuildTargetWSURL_KeepsTheAPIServerBasePath(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=1", nil)
	assert.Equal(t, "wss://k8s.example.com/k8s/clusters/c-1/api/v1/pods?watch=1",
		buildTargetWSURL("wss", "k8s.example.com", mustURL(t, "https://k8s.example.com/k8s/clusters/c-1/"), req))
}

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	require.NoError(t, err)
	return u
}

// An escaped base must keep its escaping: %2F is part of one segment, and %23
// is not a fragment delimiter.
func TestK8sProxy_KeepsAnEscapedBasePath(t *testing.T) {
	got := make(chan string, 1)
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.RequestURI
	}))
	defer api.Close()

	for _, tc := range []struct{ base, want string }{
		{"/tenant%2Fblue", "/tenant%2Fblue/api/v1/namespaces?limit=1"},
		{"/tenant%23blue", "/tenant%23blue/api/v1/namespaces?limit=1"},
		{"/tenant%20blue", "/tenant%20blue/api/v1/namespaces?limit=1"},
	} {
		handler, err := NewK8sProxyHandler(testK8sProxyConfig(api.URL + tc.base))
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/namespaces?limit=1", nil).WithContext(newIdentityContext("t"))
		handler.ServeHTTP(httptest.NewRecorder(), req)
		assert.Equal(t, tc.want, <-got, tc.base)
	}
}

// The route keeps its own escaping too, behind a plain or an escaped base.
func TestK8sProxy_KeepsAnEscapedRoute(t *testing.T) {
	got := make(chan string, 1)
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got <- r.RequestURI
	}))
	defer api.Close()

	handler, err := NewK8sProxyHandler(testK8sProxyConfig(api.URL + "/tenant%2Fblue"))
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodGet, "/api/k8s/api/v1/namespaces/ns/configmaps/a%2Fb", nil).WithContext(newIdentityContext("t"))
	handler.ServeHTTP(httptest.NewRecorder(), req)
	assert.Equal(t, "/tenant%2Fblue/api/v1/namespaces/ns/configmaps/a%2Fb", <-got)
}

func TestBuildTargetWSURL_KeepsAnEscapedBasePath(t *testing.T) {
	for _, tc := range []struct{ base, want string }{
		{"https://k8s.example.com/tenant%23blue", "wss://k8s.example.com/tenant%23blue/api/v1/pods?watch=1"},
		{"https://k8s.example.com/tenant%2Fblue", "wss://k8s.example.com/tenant%2Fblue/api/v1/pods?watch=1"},
	} {
		req := httptest.NewRequest(http.MethodGet, "/wss/k8s/api/v1/pods?watch=1", nil)
		got := buildTargetWSURL("wss", "k8s.example.com", mustURL(t, tc.base), req)
		assert.Equal(t, tc.want, got, tc.base)
		u, err := url.Parse(got)
		require.NoError(t, err)
		assert.Empty(t, u.Fragment, "an escaped # must not become a fragment")
		assert.Equal(t, "watch=1", u.RawQuery)
	}
}
