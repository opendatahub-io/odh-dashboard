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

type ConnectionTypeCredentialField struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
	Type        string `json:"type"`
	EnumValues  []struct {
		Value string `json:"value"`
		Label string `json:"label"`
	} `json:"enum_values,omitzero"`
	DefaultValue string `json:"default_value,omitempty"`
}

type ConnectionType struct {
	Metadata struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id,omitempty"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"metadata"`
	Resource struct {
		Name              string                          `json:"name"`
		Provider          string                          `json:"provider"`
		Description       string                          `json:"description,omitempty"`
		CredentialsFields []ConnectionTypeCredentialField `json:"credentials_fields"`
	} `json:"resource"`
	Status struct {
		Capabilities struct {
			Flight bool `json:"flight"`
			Rest   bool `json:"rest"`
		} `json:"capabilities"`
	} `json:"status"`
}

type upstreamConnectionTypeList struct {
	Items []ConnectionType `json:"items"`
}

type ConnectionTypesEnvelope Envelope[[]ConnectionType, None]
type ConnectionTypeEnvelope Envelope[ConnectionType, None]

const ConnectionTypesPath = ApiPathPrefix + "/connection-types"
const ConnectionTypePath = ApiPathPrefix + "/connection-types/:connection_type_id"

func (app *App) GetConnectionTypesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connection-types") {
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

	var types []ConnectionType
	if app.config.MockHTTPClient {
		types = mockConnectionTypes(namespace)
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
		body, err := client.GET("/api/v1alpha1/data/connection-types")
		if err != nil {
			if app.upstreamErrorResponse(w, r, err) {
				return
			}
			app.serverErrorResponse(w, r, fmt.Errorf("failed to list connection types: %w", err))
			return
		}
		var response upstreamConnectionTypeList
		if err := json.Unmarshal(body, &response); err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to decode connection types: %w", err))
			return
		}
		types = response.Items
		if types == nil {
			types = []ConnectionType{}
		}
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionTypesEnvelope{Data: types}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetConnectionTypeHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "get", "data-connection-types") {
		return
	}

	connectionTypeID := params.ByName("connection_type_id")
	if connectionTypeID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("path parameter 'connection_type_id' is required and cannot be empty"))
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

	var connectionType ConnectionType
	if app.config.MockHTTPClient {
		var found bool
		connectionType, found = mockConnectionType(namespace, connectionTypeID)
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
		body, err := client.GET("/api/v1alpha1/data/connection-types/" + url.PathEscape(connectionTypeID))
		if err != nil {
			if app.upstreamErrorResponse(w, r, err) {
				return
			}
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get connection type: %w", err))
			return
		}
		if err := json.Unmarshal(body, &connectionType); err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to decode connection type: %w", err))
			return
		}
	}

	if err := app.WriteJSON(w, http.StatusOK, ConnectionTypeEnvelope{Data: connectionType}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func mockConnectionType(namespace, connectionTypeID string) (ConnectionType, bool) {
	for _, connectionType := range mockConnectionTypes(namespace) {
		if connectionType.Metadata.ID == connectionTypeID {
			return connectionType, true
		}
	}
	return ConnectionType{}, false
}

func mockConnectionTypes(namespace string) []ConnectionType {
	description := "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor."
	types := make([]ConnectionType, 2)
	types[0].Metadata.ID = "postgresql"
	types[0].Metadata.TenantID = namespace
	types[0].Metadata.CreatedAt = "2026-01-01T00:00:00Z"
	types[0].Metadata.UpdatedAt = "2026-01-01T00:00:00Z"
	types[0].Resource.Name = "PostgreSQL"
	types[0].Resource.Provider = "postgres"
	types[0].Resource.Description = description
	types[0].Resource.CredentialsFields = []ConnectionTypeCredentialField{
		{
			Name:        "url",
			Label:       "Connection URL",
			Description: "The URL used to connect to the PostgreSQL database.",
			Required:    true,
			Type:        "string",
			EnumValues: []struct {
				Value string `json:"value"`
				Label string `json:"label"`
			}{
				{Value: "us-east-1", Label: "US East"},
			},
			DefaultValue: "postgresql://localhost:5432/database",
		},
	}
	types[0].Status.Capabilities.Flight = true
	types[0].Status.Capabilities.Rest = true

	types[1].Metadata.ID = "s3"
	types[1].Metadata.TenantID = namespace
	types[1].Metadata.CreatedAt = "2026-01-01T00:00:00Z"
	types[1].Metadata.UpdatedAt = "2026-01-01T00:00:00Z"
	types[1].Resource.Name = "S3"
	types[1].Resource.Provider = "s3"
	types[1].Resource.Description = description
	types[1].Resource.CredentialsFields = []ConnectionTypeCredentialField{
		{
			Name:        "region",
			Label:       "Region",
			Description: "The AWS region containing the S3 bucket.",
			Required:    true,
			Type:        "string",
			EnumValues: []struct {
				Value string `json:"value"`
				Label string `json:"label"`
			}{
				{Value: "us-east-1", Label: "US East"},
			},
			DefaultValue: "us-east-1",
		},
	}
	types[1].Status.Capabilities.Flight = true
	types[1].Status.Capabilities.Rest = true
	return types
}
