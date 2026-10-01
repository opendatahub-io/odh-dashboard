package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestMutationHandlersReturnNoContentInMockMode(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true}, logger: slog.Default()}

	readinessResponse, readinessRequest := requestWithIdentity(t, http.MethodPost, "/api/v1/connections/connection-1/readiness?namespace=test-project")
	app.CheckConnectionReadinessHandler(readinessResponse, readinessRequest, httprouter.Params{{Key: "id", Value: "connection-1"}})
	require.Equal(t, http.StatusNoContent, readinessResponse.Code)

	deleteResponse, deleteRequest := requestWithIdentity(t, http.MethodDelete, "/api/v1/connections/connection-1?namespace=test-project")
	app.DeleteConnectionHandler(deleteResponse, deleteRequest, httprouter.Params{{Key: "id", Value: "connection-1"}})
	require.Equal(t, http.StatusNoContent, deleteResponse.Code)

	testResponse, testRequest := requestWithIdentity(t, http.MethodPost, "/api/v1/test/credentials?namespace=test-project")
	testRequest.Body = io.NopCloser(bytes.NewBufferString(`{"data_connection_type_id":"postgresql","credentials":{"URI":"postgres://example"}}`))
	app.TestCredentialsHandler(testResponse, testRequest, httprouter.Params{})
	require.Equal(t, http.StatusNoContent, testResponse.Code)

	createResponse, createRequest := requestWithIdentity(t, http.MethodPost, "/api/v1/connections?namespace=test-project")
	createRequest.Body = io.NopCloser(bytes.NewBufferString(`{"name":"new-connection","data_connection_type_id":"postgresql","format":"tabular","credentials":{"secret":"new-connection","properties":{"URI":"postgres://example"}},"properties":{}}`))
	app.CreateConnectionHandler(createResponse, createRequest, httprouter.Params{})
	require.Equal(t, http.StatusCreated, createResponse.Code)
}

func TestCreateConnectionRequestValidation(t *testing.T) {
	valid := CreateConnectionRequest{
		Name:                 "connection",
		DataConnectionTypeID: "postgresql",
		Format:               "tabular",
		Properties:           map[string]string{},
	}
	valid.Credentials.Secret = "connection"
	valid.Credentials.Properties = map[string]string{"URI": "postgres://example"}

	tests := []struct {
		name   string
		mutate func(*CreateConnectionRequest)
	}{
		{name: "unsupported format", mutate: func(request *CreateConnectionRequest) { request.Format = "json" }},
		{name: "missing properties", mutate: func(request *CreateConnectionRequest) { request.Properties = nil }},
		{name: "missing credentials properties", mutate: func(request *CreateConnectionRequest) { request.Credentials.Properties = nil }},
		{name: "invalid secret name", mutate: func(request *CreateConnectionRequest) { request.Credentials.Secret = "Invalid Secret" }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := valid
			tt.mutate(&request)
			require.Error(t, validateCreateConnectionRequest(request))
		})
	}

	require.NoError(t, validateCreateConnectionRequest(valid))
	require.Error(t, validateCreatedConnection(Connection{}))
	require.NoError(t, validateCreatedConnection(mockConnections("test-project")[0]))
}

func TestCreateConnectionHandlerNegativePaths(t *testing.T) {
	validBody := `{"name":"new-connection","data_connection_type_id":"postgresql","format":"tabular","credentials":{"secret":"new-connection","properties":{"URI":"postgres://example"}},"properties":{}}`

	tests := []struct {
		name           string
		body           string
		allowed        bool
		upstreamStatus int
		upstreamBody   string
		expectedStatus int
	}{
		{
			name:           "authorization denied",
			body:           validBody,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "malformed body",
			body:           "{invalid",
			allowed:        true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "oversized body",
			body:           strings.Repeat("x", 1_048_577),
			allowed:        true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "unsupported format",
			body:           strings.Replace(validBody, `"tabular"`, `"json"`, 1),
			allowed:        true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid secret name",
			body:           strings.Replace(validBody, `"secret":"new-connection"`, `"secret":"Invalid Secret"`, 1),
			allowed:        true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing properties",
			body:           strings.Replace(validBody, `,"properties":{}`, "", 1),
			allowed:        true,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "upstream error",
			body:           validBody,
			allowed:        true,
			upstreamStatus: http.StatusBadGateway,
			upstreamBody:   `{"code":"upstream_error","message":"upstream failed"}`,
			expectedStatus: http.StatusBadGateway,
		},
		{
			name:           "malformed upstream response",
			body:           validBody,
			allowed:        true,
			upstreamStatus: http.StatusCreated,
			upstreamBody:   `{}`,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var upstream *httptest.Server
			if tt.upstreamStatus != 0 {
				upstream = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(tt.upstreamStatus)
					_, _ = w.Write([]byte(tt.upstreamBody))
				}))
				defer upstream.Close()
			}

			app := &App{
				config: config.EnvConfig{
					MockHTTPClient: tt.upstreamStatus == 0,
					DataConnectHubAPIURL: func() string {
						if upstream != nil {
							return upstream.URL
						}
						return ""
					}(),
				},
				logger:                  slog.Default(),
				kubernetesClientFactory: &authorizationTestFactory{client: &authorizationTestClient{allowed: tt.allowed}},
			}
			response, request := requestWithIdentity(t, http.MethodPost, "/api/v1/connections?namespace=test-project")
			request.Body = io.NopCloser(bytes.NewBufferString(tt.body))

			app.CreateConnectionHandler(response, request, httprouter.Params{})

			require.Equal(t, tt.expectedStatus, response.Code)
		})
	}
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
			name:             "connection type",
			method:           http.MethodGet,
			path:             "/api/v1/connection-types/postgresql?namespace=test-project",
			params:           httprouter.Params{{Key: "connection_type_id", Value: "postgresql"}},
			expectedVerb:     "get",
			expectedResource: "data-connection-types",
			expectedStatus:   http.StatusOK,
			invoke: func(app *App, w *httptest.ResponseRecorder, r *http.Request, p httprouter.Params) {
				app.GetConnectionTypeHandler(w, r, p)
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
			name:             "test credentials",
			method:           http.MethodPost,
			path:             "/api/v1/test/credentials?namespace=test-project",
			expectedVerb:     "get",
			expectedResource: "data-connections",
			expectedStatus:   http.StatusNoContent,
			invoke: func(app *App, w *httptest.ResponseRecorder, r *http.Request, p httprouter.Params) {
				r.Body = io.NopCloser(bytes.NewBufferString(`{"data_connection_type_id":"postgresql","credentials":{"URI":"postgres://example"}}`))
				app.TestCredentialsHandler(w, r, p)
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

func TestDataConnectHubHeadersAllowsTokenInLocalInsecureTLSMode(t *testing.T) {
	app := &App{config: config.EnvConfig{DevMode: true, InsecureSkipVerify: true}, logger: slog.Default()}

	headers, err := app.dataConnectHubHeaders(
		context.Background(),
		&k8s.RequestIdentity{UserID: "test-user", Token: "user-token"},
		"test-project",
	)

	require.NoError(t, err)
	require.Equal(t, "Bearer user-token", headers.Get("Authorization"))
	require.Equal(t, "test-project", headers.Get("X-Tenant-ID"))
}
