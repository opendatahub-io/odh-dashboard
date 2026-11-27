package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/config"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/require"
)

func TestConnectionTypeResolution(t *testing.T) {
	for _, single := range []bool{false, true} {
		for _, query := range []string{"", "&resolve_connection_types=false", "&resolve_connection_types=true"} {
			t.Run(map[bool]string{false: "list", true: "single"}[single]+query, func(t *testing.T) {
				connections := mockConnections("test-project")
				// Resolve postgres and s3 in one batch, including a repeated type ID.
				sharedConnection := connections[0]
				sharedConnection.Metadata.ID = "550e8400-e29b-41d4-a716-446655440005"
				sharedConnection.Resource.DataConnectionTypeID = strings.ToUpper(sharedConnection.Resource.DataConnectionTypeID)
				connections = append(connections, sharedConnection)
				types := mockConnectionTypes("test-project")[:2]
				// Credential-free types must retain an empty array rather than null.
				types[0].Resource.CredentialsFields = []ConnectionTypeCredentialField{}
				calls := []string{}
				upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					calls = append(calls, r.URL.Path)
					require.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
					require.Equal(t, "test-project", r.Header.Get("X-Tenant-ID"))
					require.Equal(t, "test-user", r.Header.Get("X-Remote-User"))
					w.Header().Set("Content-Type", "application/json")
					var payload any
					switch r.URL.Path {
					case "/api/v1alpha1/data/connections":
						payload = map[string]any{"items": connections}
					case "/api/v1alpha1/data/connections/" + connections[0].Metadata.ID:
						payload = connections[0]
					case "/api/v1alpha1/data/connection-types":
						payload = map[string]any{"items": types}
					case "/api/v1alpha1/data/connection-types/" + types[0].Metadata.ID:
						payload = types[0]
					default:
						t.Errorf("unexpected upstream request: %s", r.URL.Path)
						w.WriteHeader(500)
						return
					}
					require.NoError(t, json.NewEncoder(w).Encode(payload))
				}))
				defer upstream.Close()
				app := &App{config: config.EnvConfig{DataConnectHubAPIURL: upstream.URL, MockK8Client: true}, logger: slog.Default()}
				response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project"+query)
				var result []Connection
				if single {
					app.GetConnectionHandler(response, request, httprouter.Params{{Key: "id", Value: connections[0].Metadata.ID}})
					var envelope ConnectionResponse
					require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
					result = []Connection{envelope.Data}
				} else {
					app.GetConnectionsHandler(response, request, nil)
					var envelope ConnectionsEnvelope
					require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
					result = envelope.Data
				}
				require.Equal(t, http.StatusOK, response.Code, response.Body.String())
				require.NotEmpty(t, result)
				resolve := strings.HasSuffix(query, "=true")
				if resolve {
					require.Len(t, calls, 2)
				} else {
					require.Len(t, calls, 1)
				}
				for _, connection := range result {
					require.NotEmpty(t, connection.Resource.DataConnectionTypeID)
					if resolve {
						require.NotNil(t, connection.Resource.DataConnectionType)
						expectedType := types[0]
						if strings.EqualFold(connection.Resource.DataConnectionTypeID, types[1].Metadata.ID) {
							expectedType = types[1]
						}
						require.Equal(t, expectedType.Resource.Provider, connection.Resource.DataConnectionType.Resource.Provider)
						require.Equal(t, expectedType.Resource.Name, connection.Resource.DataConnectionType.Resource.Name)
						require.NotNil(t, connection.Resource.DataConnectionType.Resource.CredentialsFields)
						require.Equal(t, expectedType.Resource.CredentialsFields, connection.Resource.DataConnectionType.Resource.CredentialsFields)
					} else {
						require.Nil(t, connection.Resource.DataConnectionType)
						require.NotContains(t, response.Body.String(), `"data_connection_type":`)
					}
				}
			})
		}
	}
}

func TestConnectionTypeResolutionFailures(t *testing.T) {
	for _, single := range []bool{false, true} {
		for _, tc := range []struct {
			name, body   string
			status, want int
		}{
			{"forbidden", `{"code":"403","message":"denied"}`, 403, 403},
			{"unavailable", `{"code":"503","message":"unavailable"}`, 503, 503},
			{"not found", `{"code":"404","message":"missing"}`, 404, 404},
			{"invalid json", `{`, 200, 500},
			{"missing type", `{"items":[]}`, 200, 500},
			{"missing provider", `{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440003"},"resource":{}}`, 200, 500},
			{"mismatched type", `{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440099"},"resource":{"provider":"s3"}}`, 200, 500},
			{"missing credentials fields", `{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440003","created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"},"resource":{"name":"PostgreSQL","provider":"postgres"}}`, 200, 500},
			{"null credentials fields", `{"metadata":{"id":"550e8400-e29b-41d4-a716-446655440003","created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"},"resource":{"name":"PostgreSQL","provider":"postgres","credentials_fields":null}}`, 200, 500},
		} {
			t.Run(map[bool]string{false: "list/", true: "single/"}[single]+tc.name, func(t *testing.T) {
				connections := mockConnections("test-project")[:1]
				upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					if strings.Contains(r.URL.Path, "connection-types") {
						w.WriteHeader(tc.status)
						body := tc.body
						if !single && strings.HasPrefix(body, `{"metadata":`) {
							body = "{\"items\":[" + body + "]}"
						}
						_, err := w.Write([]byte(body))
						require.NoError(t, err)
						return
					}
					if single {
						require.NoError(t, json.NewEncoder(w).Encode(connections[0]))
					} else {
						require.NoError(t, json.NewEncoder(w).Encode(map[string]any{"items": connections}))
					}
				}))
				defer upstream.Close()
				app := &App{config: config.EnvConfig{DataConnectHubAPIURL: upstream.URL, MockK8Client: true}, logger: slog.Default()}
				response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project&resolve_connection_types=true")
				if single {
					app.GetConnectionHandler(response, request, httprouter.Params{{Key: "id", Value: connections[0].Metadata.ID}})
				} else {
					app.GetConnectionsHandler(response, request, nil)
				}
				require.Equal(t, tc.want, response.Code, response.Body.String())
				require.NotContains(t, response.Body.String(), `"data":`)
			})
		}
	}
}

type resolutionAuthorizationClient struct {
	authorizationTestClient
	resources []string
}

func (c *resolutionAuthorizationClient) CanAccessResource(_ context.Context, _ *k8s.RequestIdentity, namespace, verb, group, resource string) (bool, error) {
	c.resources = append(c.resources, resource)
	return resource == "data-connections", nil
}

func TestConnectionTypeResolutionAuthorizationAndValidation(t *testing.T) {
	for _, single := range []bool{false, true} {
		for _, query := range []string{"true", "false", "", "yes", "true&resolve_connection_types=false"} {
			t.Run(map[bool]string{false: "list/", true: "single/"}[single]+query, func(t *testing.T) {
				client := &resolutionAuthorizationClient{}
				app := &App{config: config.EnvConfig{MockHTTPClient: true}, logger: slog.Default(), kubernetesClientFactory: &authorizationTestFactory{client: client}}
				response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project&resolve_connection_types="+query)
				if single {
					app.GetConnectionHandler(response, request, httprouter.Params{{Key: "id", Value: mockConnections("test-project")[0].Metadata.ID}})
				} else {
					app.GetConnectionsHandler(response, request, nil)
				}
				want := 400
				switch query {
				case "true":
					want = 403
					require.Equal(t, []string{"data-connections", "data-connection-types"}, client.resources)
				case "false":
					want = 200
					require.Equal(t, []string{"data-connections"}, client.resources)
				}
				require.Equal(t, want, response.Code, response.Body.String())
			})
		}
	}
}

func TestConnectionTypeResolutionSkipsLookupForEmptyList(t *testing.T) {
	calls := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		require.Equal(t, "/api/v1alpha1/data/connections", r.URL.Path)
		_, err := w.Write([]byte(`{"items":[]}`))
		require.NoError(t, err)
	}))
	defer upstream.Close()
	app := &App{config: config.EnvConfig{DataConnectHubAPIURL: upstream.URL, MockK8Client: true}, logger: slog.Default()}
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project&resolve_connection_types=true")
	app.GetConnectionsHandler(response, request, nil)
	require.Equal(t, 200, response.Code)
	require.JSONEq(t, `{"data":[]}`, response.Body.String())
	require.Equal(t, 1, calls)
}

func TestConnectionTypeResolutionWithMocks(t *testing.T) {
	app := &App{config: config.EnvConfig{MockHTTPClient: true, MockK8Client: true}, logger: slog.Default()}
	response, request := requestWithIdentity(t, http.MethodGet, "/api/v1/connections?namespace=test-project&resolve_connection_types=true")
	app.GetConnectionsHandler(response, request, nil)
	require.Equal(t, 200, response.Code)
	var envelope ConnectionsEnvelope
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &envelope))
	require.Len(t, envelope.Data, 2)
	require.Equal(t, "postgres", envelope.Data[0].Resource.DataConnectionType.Resource.Provider)
	require.Equal(t, "s3", envelope.Data[1].Resource.DataConnectionType.Resource.Provider)
}
