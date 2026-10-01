package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelServingProxy_StripsHeaders(t *testing.T) {
	var receivedHeaders http.Header
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedHeaders = r.Header.Clone()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer backend.Close()

	app := newTestApp(func(a *App) {
		a.config.ModelServingServiceHost = backend.URL
		a.config.DevMode = true
		a.config.MockK8Client = false
		a.config.Namespace = "test-ns"
	})

	err := app.initModelServingProxy()
	require.NoError(t, err)
	require.NotNil(t, app.modelServingProxy)

	admin := k8mocks.DefaultTestUsers[0]
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, modelServingGatewaysPath+"?namespace=project-a", nil)
	req.Header.Set("Cookie", "session=abc123")
	req.Header.Set("X-Forwarded-For", "10.0.0.1")
	req.Header.Set("X-Forwarded-Host", "example.com")
	req.Header.Set("X-Real-Ip", "10.0.0.1")
	req.Header.Set("Forwarded", "for=10.0.0.1")

	req = reqWithIdentity(req, &k8s.RequestIdentity{
		UserID: admin.UserName,
		Groups: admin.Groups,
		Token:  k8s.NewBearerToken(admin.Token),
	})

	app.modelServingProxy.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	require.NotNil(t, receivedHeaders)
	assert.Empty(t, receivedHeaders.Get("Cookie"), "Cookie header should be stripped")
	assert.Empty(t, receivedHeaders.Get("X-Forwarded-For"), "X-Forwarded-For should be stripped")
	assert.Empty(t, receivedHeaders.Get("X-Forwarded-Host"), "X-Forwarded-Host should be stripped")
	assert.Empty(t, receivedHeaders.Get("X-Real-Ip"), "X-Real-Ip should be stripped")
	assert.Empty(t, receivedHeaders.Get("Forwarded"), "Forwarded should be stripped")
	assert.Equal(t, "Bearer "+admin.Token, receivedHeaders.Get("Authorization"))
}

func TestModelServingProxy_MockMode(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockK8Client = true
	})

	err := app.initModelServingProxy()
	require.NoError(t, err)
	require.NotNil(t, app.modelServingProxy)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, modelServingGatewaysPath+"?namespace=project-a", nil)

	app.modelServingProxy.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"gateways":`)
}

func TestModelServingProxy_Samples(t *testing.T) {
	const sample = "apiVersion: serving.kserve.io/v1alpha2\nkind: LLMInferenceServiceConfig\nmetadata:\n  name: sample\nspec: {}\n"
	for _, topology := range []string{
		"workload-single-node",
		"workload-multi-node-data-parallel",
		"workload-single-node-pd",
		"workload-multi-node-data-parallel-pd",
	} {
		for _, query := range []string{"type=" + topology, "type=router&topology=" + topology} {
			t.Run(query, func(t *testing.T) {
				var receivedPath, receivedQuery, receivedAuth, receivedCookie string
				backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					receivedPath, receivedQuery = r.URL.EscapedPath(), r.URL.RawQuery
					receivedAuth, receivedCookie = r.Header.Get("Authorization"), r.Header.Get("Cookie")
					w.Header().Set("Content-Type", "text/yaml")
					_, _ = w.Write([]byte(sample))
				}))
				defer backend.Close()
				app := newTestApp(func(a *App) {
					a.config.ModelServingServiceHost = backend.URL
					a.config.DevMode = true
					a.config.MockK8Client = false
				})
				require.NoError(t, app.initModelServingProxy())
				req := httptest.NewRequest(http.MethodGet, modelServingSamplesPath+"?"+query, nil)
				req.Header.Set("Cookie", "session=not-for-upstream")
				req = reqWithIdentity(req, &k8s.RequestIdentity{Token: k8s.NewBearerToken("caller-token")})
				rr := httptest.NewRecorder()
				app.modelServingProxy.ServeHTTP(rr, req)

				assert.Equal(t, http.StatusOK, rr.Code)
				assert.Equal(t, "/api/v1/samples/llm-d", receivedPath)
				assert.Equal(t, query, receivedQuery)
				assert.Equal(t, "Bearer caller-token", receivedAuth)
				assert.Empty(t, receivedCookie)
				assert.Equal(t, "text/yaml", rr.Header().Get("Content-Type"))
				assert.Equal(t, sample, rr.Body.String())
			})
		}
	}
}

func TestModelServingOperationsOnly(t *testing.T) {
	app := newTestApp()
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{http.MethodGet, modelServingGatewaysPath + "?namespace=project-a", http.StatusOK},
		{http.MethodPost, modelServingGatewaysPath + "?namespace=project-a", http.StatusMethodNotAllowed},
		{http.MethodGet, modelServingPathPrefix + "/api/v1/secrets?namespace=project-a", http.StatusNotFound},
		{http.MethodGet, modelServingGatewaysPath, http.StatusBadRequest},
		{http.MethodGet, modelServingGatewaysPath + "?namespace=../other", http.StatusBadRequest},
		{http.MethodGet, modelServingGatewaysPath + "?namespace=a&namespace=b", http.StatusBadRequest},
		{http.MethodGet, modelServingGatewaysPath + "?namespace=a&service=other", http.StatusBadRequest},
		{http.MethodGet, modelServingGatewaysPath + "?namespace=a&path=/secrets", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node", http.StatusOK},
		{http.MethodGet, modelServingSamplesPath + "?type=router&topology=workload-single-node", http.StatusOK},
		{http.MethodPost, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodPut, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodPatch, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodDelete, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodHead, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodOptions, modelServingSamplesPath + "?type=workload-single-node", http.StatusMethodNotAllowed},
		{http.MethodGet, modelServingSamplesPath + "/extra?type=workload-single-node", http.StatusNotFound},
		{http.MethodGet, modelServingPathPrefix + "/api/v1/samples/%6clm-d?type=workload-single-node", http.StatusNotFound},
		{http.MethodGet, modelServingPathPrefix + "/api/v1/samples/other?type=workload-single-node", http.StatusNotFound},
		{http.MethodGet, modelServingSamplesPath + "/../secrets?type=workload-single-node", http.StatusNotFound},
		{http.MethodGet, modelServingSamplesPath, http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=unknown", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=router", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=router&topology=unknown", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=router&topology=../other", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node&topology=workload-single-node", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node&type=router", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=router&topology=workload-single-node&topology=workload-single-node-pd", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node&service=other", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=router&topology=workload-single-node&path=/secrets", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node?extra=value", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node%3Fextra=value", http.StatusBadRequest},
		{http.MethodGet, modelServingSamplesPath + "?type=workload-single-node%ZZ", http.StatusBadRequest},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			called := false
			handler := app.modelServingOperationsOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				assert.Equal(t, tc.path, r.URL.RequestURI())
				w.WriteHeader(http.StatusOK)
			}))
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, httptest.NewRequest(tc.method, tc.path, nil))
			assert.Equal(t, tc.status, rr.Code)
			assert.Equal(t, tc.status == http.StatusOK, called)
			if tc.status == http.StatusMethodNotAllowed {
				assert.Equal(t, http.MethodGet, rr.Header().Get("Allow"))
			}
		})
	}
}
