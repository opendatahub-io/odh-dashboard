package proxy

import (
	"net/http"
	"net/http/httptest"
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
		buildTargetWSURL("wss", "k8s.example.com", "/k8s/clusters/c-1/", req))
}
