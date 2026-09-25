package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
)

type authorizationTestClient struct {
	allowed  bool
	err      error
	token    string
	verb     string
	group    string
	resource string
}

func (c *authorizationTestClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *authorizationTestClient) CanAccessResource(_ context.Context, _ *k8s.RequestIdentity, _ string, verb, group, resource string) (bool, error) {
	c.verb = verb
	c.group = group
	c.resource = resource
	return c.allowed, c.err
}

func (c *authorizationTestClient) IsClusterAdmin(*k8s.RequestIdentity) (bool, error) {
	return false, nil
}
func (c *authorizationTestClient) GetUser(*k8s.RequestIdentity) (string, error) {
	return "test-user", nil
}
func (c *authorizationTestClient) BearerToken() (string, error) { return c.token, nil }

type authorizationTestFactory struct{ client k8s.KubernetesClientInterface }

func (f *authorizationTestFactory) GetClient(context.Context) (k8s.KubernetesClientInterface, error) {
	return f.client, nil
}

func (f *authorizationTestFactory) ExtractRequestIdentity(http.Header) (*k8s.RequestIdentity, error) {
	return &k8s.RequestIdentity{UserID: "test-user"}, nil
}

func (f *authorizationTestFactory) ValidateRequestIdentity(*k8s.RequestIdentity) error { return nil }

func requestWithIdentity(t *testing.T, method, path string) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	identity := &k8s.RequestIdentity{UserID: "test-user", Token: "test-token"}
	ctx := context.WithValue(context.Background(), constants.RequestIdentityKey, identity)
	req := httptest.NewRequest(method, path, nil).WithContext(ctx)
	return httptest.NewRecorder(), req
}

func TestGetConnectionsHandlerReturnsMockConnections(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true}, logger: slog.Default()}
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project")

	app.GetConnectionsHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var envelope ConnectionsEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.Len(t, envelope.Data, 2)
	require.Equal(t, "warehouse", envelope.Data[0].Resource.Name)
}

func TestGetConnectionTypesHandlerReturnsMockTypes(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true}, logger: slog.Default()}
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connection-types?namespace=test-project")

	app.GetConnectionTypesHandler(response, request, httprouter.Params{})

	require.Equal(t, http.StatusOK, response.Code)
	body, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var envelope ConnectionTypesEnvelope
	require.NoError(t, json.Unmarshal(body, &envelope))
	require.Len(t, envelope.Data, 2)
	require.Equal(t, "PostgreSQL", envelope.Data[0].Resource.Name)
}

func TestMutationHandlersReturnNoContentInMockMode(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true}, logger: slog.Default()}

	readinessResponse, readinessRequest := requestWithIdentity(t, http.MethodPost, "/api/v1/connections/connection-1/readiness?namespace=test-project")
	app.CheckConnectionReadinessHandler(readinessResponse, readinessRequest, httprouter.Params{{Key: "id", Value: "connection-1"}})
	require.Equal(t, http.StatusNoContent, readinessResponse.Code)

	deleteResponse, deleteRequest := requestWithIdentity(t, http.MethodDelete, "/api/v1/connections/connection-1?namespace=test-project")
	app.DeleteConnectionHandler(deleteResponse, deleteRequest, httprouter.Params{{Key: "id", Value: "connection-1"}})
	require.Equal(t, http.StatusNoContent, deleteResponse.Code)
}

func TestGetConnectionsHandlerAuthorization(t *testing.T) {
	tests := []struct {
		name           string
		allowed        bool
		clientErr      error
		expectedStatus int
	}{
		{name: "allowed", allowed: true, expectedStatus: http.StatusOK},
		{name: "denied", allowed: false, expectedStatus: http.StatusForbidden},
		{name: "SSAR error", clientErr: fmt.Errorf("SSAR unavailable"), expectedStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := &App{
				config:                  config.EnvConfig{MockHTTPClient: true},
				logger:                  slog.Default(),
				kubernetesClientFactory: &authorizationTestFactory{client: &authorizationTestClient{allowed: tt.allowed, err: tt.clientErr}},
				repositories:            repositories.NewRepositories(),
			}
			response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project")

			app.GetConnectionsHandler(response, request, httprouter.Params{})

			assert.Equal(t, tt.expectedStatus, response.Code)
		})
	}
}

func TestConnectionEndpointAuthorization(t *testing.T) {
	tests := []struct {
		name             string
		method           string
		path             string
		params           httprouter.Params
		expectedVerb     string
		expectedResource string
		expectedStatus   int
		invoke           func(*App, *httptest.ResponseRecorder, *http.Request, httprouter.Params)
	}{
		{
			name:             "connection types",
			method:           http.MethodGet,
			path:             "/api/v1/connection-types?namespace=test-project",
			expectedVerb:     "get",
			expectedResource: "data-connection-types",
			expectedStatus:   http.StatusOK,
			invoke: func(app *App, w *httptest.ResponseRecorder, r *http.Request, p httprouter.Params) {
				app.GetConnectionTypesHandler(w, r, p)
			},
		},
		{
			name:             "readiness",
			method:           http.MethodPost,
			path:             "/api/v1/connections/id/readiness?namespace=test-project",
			params:           httprouter.Params{{Key: "id", Value: "id"}},
			expectedVerb:     "create",
			expectedResource: "data-connections",
			expectedStatus:   http.StatusNoContent,
			invoke: func(app *App, w *httptest.ResponseRecorder, r *http.Request, p httprouter.Params) {
				app.CheckConnectionReadinessHandler(w, r, p)
			},
		},
		{
			name:             "delete",
			method:           http.MethodDelete,
			path:             "/api/v1/connections/id?namespace=test-project",
			params:           httprouter.Params{{Key: "id", Value: "id"}},
			expectedVerb:     "delete",
			expectedResource: "data-connections",
			expectedStatus:   http.StatusNoContent,
			invoke: func(app *App, w *httptest.ResponseRecorder, r *http.Request, p httprouter.Params) {
				app.DeleteConnectionHandler(w, r, p)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			outcomes := []struct {
				name           string
				allowed        bool
				clientErr      error
				expectedStatus int
			}{
				{name: "allowed", allowed: true, expectedStatus: tt.expectedStatus},
				{name: "denied", expectedStatus: http.StatusForbidden},
				{name: "SSAR error", clientErr: fmt.Errorf("SSAR unavailable"), expectedStatus: http.StatusInternalServerError},
			}
			for _, outcome := range outcomes {
				t.Run(outcome.name, func(t *testing.T) {
					client := &authorizationTestClient{allowed: outcome.allowed, err: outcome.clientErr}
					app := &App{
						config:                  config.EnvConfig{MockHTTPClient: true},
						logger:                  slog.Default(),
						kubernetesClientFactory: &authorizationTestFactory{client: client},
						repositories:            repositories.NewRepositories(),
					}
					response, request := requestWithIdentity(t, tt.method, tt.path)

					tt.invoke(app, response, request, tt.params)

					assert.Equal(t, outcome.expectedStatus, response.Code)
					require.Equal(t, tt.expectedVerb, client.verb)
					require.Equal(t, "dataconnecthub.opendatahub.io", client.group)
					require.Equal(t, tt.expectedResource, client.resource)
				})
			}
		})
	}
}

func TestDataConnectHubHeadersUsesServiceAccountTokenForInternalAuth(t *testing.T) {
	app := &App{
		config:                  config.EnvConfig{},
		logger:                  slog.Default(),
		kubernetesClientFactory: &authorizationTestFactory{client: &authorizationTestClient{token: "service-account-token"}},
	}

	headers, err := app.dataConnectHubHeaders(
		context.Background(),
		&k8s.RequestIdentity{UserID: "test-user"},
		"test-project",
	)

	require.NoError(t, err)
	require.Equal(t, "Bearer service-account-token", headers.Get("Authorization"))
	require.Equal(t, "test-project", headers.Get("X-Tenant-ID"))
}
