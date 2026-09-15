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
	allowed bool
	err     error
	token   string
}

func (c *authorizationTestClient) GetNamespaces(context.Context, *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	return nil, nil
}

func (c *authorizationTestClient) CanAccessResource(context.Context, *k8s.RequestIdentity, string, string, string, string) (bool, error) {
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
