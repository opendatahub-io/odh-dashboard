package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

type Connection struct {
	Metadata struct {
		ID       string `json:"id"`
		TenantID string `json:"tenant_id,omitempty"`
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
		if connections == nil {
			connections = []Connection{}
		}
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionsEnvelope{Data: connections}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func mockConnections(namespace string) []Connection {
	connections := make([]Connection, 2)
	connections[0].Metadata.ID = "connection-1"
	connections[0].Metadata.TenantID = namespace
	connections[0].Resource.Name = "warehouse"
	connections[0].Resource.DataConnectionTypeID = "postgresql"
	connections[0].Resource.Format = "tabular"
	connections[0].Status.State = "ready"
	connections[0].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	connections[1].Metadata.ID = "connection-2"
	connections[1].Metadata.TenantID = namespace
	connections[1].Resource.Name = "object-store"
	connections[1].Resource.DataConnectionTypeID = "s3"
	connections[1].Resource.Format = "binary"
	connections[1].Status.State = "not_ready"
	connections[1].Status.UpdatedAt = "2026-09-08T16:00:00Z"
	return connections
}
