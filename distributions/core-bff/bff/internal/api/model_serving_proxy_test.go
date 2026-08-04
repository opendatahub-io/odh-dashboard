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
	req := httptest.NewRequest(http.MethodGet, modelServingPathPrefix+"/v1/models", nil)
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
}

func TestModelServingProxy_MockMode(t *testing.T) {
	app := newTestApp(func(a *App) {
		a.config.MockK8Client = true
	})

	err := app.initModelServingProxy()
	require.NoError(t, err)
	require.NotNil(t, app.modelServingProxy)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, modelServingPathPrefix+"/v1/models", nil)

	app.modelServingProxy.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), `"mock":true`)
}
