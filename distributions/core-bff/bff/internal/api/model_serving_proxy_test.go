package api

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"syscall"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
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

func TestModelServingProxyTransportFailureContract(t *testing.T) {
	spec, err := openapi3.NewLoader().LoadFromFile("../../openapi/src/core-bff.yaml")
	require.NoError(t, err)
	for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch} {
		for _, tc := range []struct {
			name    string
			cause   error
			status  int
			code    string
			message string
		}{
			{"unavailable", &net.OpError{Op: "dial", Err: syscall.ECONNREFUSED}, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "the upstream service is temporarily unavailable"},
			{"timeout", context.DeadlineExceeded, http.StatusGatewayTimeout, "GATEWAY_TIMEOUT", "the upstream request timed out"},
		} {
			t.Run(method+"/"+tc.name, func(t *testing.T) {
				app := newTestApp(func(a *App) {
					a.config.ModelServingServiceHost = "http://upstream.invalid"
					a.config.DevMode = true
					a.config.MockK8Client = false
				})
				require.NoError(t, app.initModelServingProxy())
				// Fail only dialing: route wiring, request identity, transport and error handling remain real.
				transport := app.modelServingProxy.(*httputil.ReverseProxy).Transport.(httpcontract.Transport).Base.(*http.Transport)
				transport.DialContext = func(context.Context, string, string) (net.Conn, error) { return nil, tc.cause }
				request := httptest.NewRequest(method, modelServingPathPrefix+"/v1/models", nil)
				request.Header.Set(app.config.AuthTokenHeader, k8mocks.DefaultTestUsers[0].Token)
				response := httptest.NewRecorder()
				app.Routes().ServeHTTP(response, request)
				require.Equal(t, tc.status, response.Code)
				var failure httpcontract.HTTPError
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &failure))
				require.Equal(t, tc.code, failure.Error.Code)
				require.Equal(t, tc.message, failure.Error.Message)
				require.Equal(t, response.Header().Get(httpcontract.RequestIDHeader), failure.Error.RequestID)
				operation := spec.Paths.Value("/api/service/model-serving/{path}").GetOperation(method)
				documented := operation.Responses.Status(tc.status)
				require.NotNil(t, documented)
				var body any
				require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
				require.NoError(t, documented.Value.Content.Get("application/json").Schema.Value.VisitJSON(body))
			})
		}
	}
}
