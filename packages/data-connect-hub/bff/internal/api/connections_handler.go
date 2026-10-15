package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

type Connection struct {
	Metadata struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id,omitempty"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"metadata"`
	Resource struct {
		Name                 string `json:"name"`
		DataConnectionTypeID string `json:"data_connection_type_id"`
		Format               string `json:"format"`
		CredentialsRef       struct {
			Secret string `json:"secret"`
		} `json:"credentials_ref"`
		Properties map[string]string `json:"properties"`
	} `json:"resource"`
	Status struct {
		State     string `json:"state"`
		Message   string `json:"message,omitempty"`
		UpdatedAt string `json:"updated_at,omitempty"`
	} `json:"status"`
}

type upstreamConnectionList struct {
	Items []Connection `json:"items"`
}

type ConnectionsEnvelope Envelope[[]Connection, None]

const ConnectionsPath = ApiPathPrefix + "/connections"
const ConnectionPath = ApiPathPrefix + "/connections/:id"

func (app *App) GetConnectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
	if err := validateNamespace(namespace); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connections") {
		return
	}

	var connections []Connection
	if app.config.MockHTTPClient {
		connections = mockConnections(namespace)
	} else {
		apiURL := app.config.DataConnectHubAPIURL
		if app.dataConnectHubAPIURL != nil {
			apiURL = app.dataConnectHubAPIURL.Get()
		}
		if apiURL == "" {
			app.serverErrorResponse(w, r, fmt.Errorf("data connect hub API URL is not configured"))
			return
		}

		headers, err := app.dataConnectHubHeaders(r.Context(), identity, namespace)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		client, err := app.newDataConnectHubHTTPClient(apiURL, headers)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to create Data Connect Hub client: %w", err))
			return
		}
		body, err := client.GET("/api/v1alpha1/data/connections")
		if err != nil {
			if app.upstreamErrorResponse(w, r, err) {
				return
			}
			app.serverErrorResponse(w, r, fmt.Errorf("failed to list data connections: %w", err))
			return
		}

		var response upstreamConnectionList
		if err := json.Unmarshal(body, &response); err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to decode data connections: %w", err))
			return
		}
		connections = response.Items
		for i := range connections {
			normalizeConnectionProperties(&connections[i])
		}
		if connections == nil {
			connections = []Connection{}
		}
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionsEnvelope{Data: connections}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetConnectionHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
	if err := validateNamespace(namespace); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connections") {
		return
	}

	connectionID := params.ByName("id")
	if err := validateID("path parameter", "id", connectionID); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	apiURL := app.config.DataConnectHubAPIURL
	if app.dataConnectHubAPIURL != nil {
		apiURL = app.dataConnectHubAPIURL.Get()
	}
	if !app.config.MockHTTPClient && apiURL == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("data connect hub API URL is not configured"))
		return
	}

	var connection Connection
	if app.config.MockHTTPClient {
		var found bool
		connection, found = mockConnection(namespace, connectionID)
		if !found {
			app.notFoundResponse(w, r)
			return
		}
	} else {
		headers, err := app.dataConnectHubHeaders(r.Context(), identity, namespace)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		client, err := app.newDataConnectHubHTTPClient(apiURL, headers)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to create Data Connect Hub client: %w", err))
			return
		}
		body, err := client.GET("/api/v1alpha1/data/connections/" + url.PathEscape(connectionID))
		if err != nil {
			if app.upstreamErrorResponse(w, r, err) {
				return
			}
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get data connection: %w", err))
			return
		}
		if err := json.Unmarshal(body, &connection); err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to decode data connection: %w", err))
			return
		}
		if err := validateConnection(connection); err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if connection.Metadata.ID != connectionID {
			app.serverErrorResponse(w, r, fmt.Errorf("data connection response ID does not match the requested ID"))
			return
		}
		normalizeConnectionProperties(&connection)
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionResponse{Data: connection}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func mockConnection(namespace, connectionID string) (Connection, bool) {
	for _, connection := range mockConnections(namespace) {
		if connection.Metadata.ID == connectionID {
			return connection, true
		}
	}
	return Connection{}, false
}

func normalizeConnectionProperties(connection *Connection) {
	if connection.Resource.Properties == nil {
		connection.Resource.Properties = map[string]string{}
	}
}

func mockConnections(namespace string) []Connection {
	connections := make([]Connection, 2)
	connections[0].Metadata.ID = "550e8400-e29b-41d4-a716-446655440001"
	connections[0].Metadata.TenantID = namespace
	connections[0].Metadata.CreatedAt = "2026-09-07T16:00:00Z"
	connections[0].Metadata.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[0].Resource.Name = "warehouse"
	connections[0].Resource.DataConnectionTypeID = "550e8400-e29b-41d4-a716-446655440003"
	connections[0].Resource.Format = "tabular"
	connections[0].Resource.CredentialsRef.Secret = "warehouse"
	connections[0].Resource.Properties = map[string]string{}
	connections[0].Status.State = "ready"
	connections[0].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[1].Metadata.ID = "550e8400-e29b-41d4-a716-446655440002"
	connections[1].Metadata.TenantID = namespace
	connections[1].Metadata.CreatedAt = "2026-09-07T16:00:00Z"
	connections[1].Metadata.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[1].Resource.Name = "object-store"
	connections[1].Resource.DataConnectionTypeID = "550e8400-e29b-41d4-a716-446655440004"
	connections[1].Resource.Format = "binary"
	connections[1].Resource.CredentialsRef.Secret = "object-store"
	connections[1].Resource.Properties = map[string]string{}
	connections[1].Status.State = "not_ready"
	connections[1].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	return connections
}
