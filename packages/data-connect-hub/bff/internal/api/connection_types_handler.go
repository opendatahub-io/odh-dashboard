package api

import (
	"encoding/json"
	"fmt"
	"math/rand/v2"
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
		Tags              []string                        `json:"tags,omitzero"`
	} `json:"resource"`
	Status struct {
		FlightReady bool   `json:"flight_ready"`
		FlightURL   string `json:"flight_url,omitempty"`
		Message     string `json:"message,omitempty"`
		UpdatedAt   string `json:"updated_at,omitempty"`
	} `json:"status"`
}

type ConnectionTypeField struct {
	Name         string      `json:"name"`
	Label        string      `json:"label"`
	Description  string      `json:"description,omitempty"`
	Required     bool        `json:"required"`
	Type         string      `json:"type"`
	EnumValues   []EnumValue `json:"enum_values,omitempty"`
	DefaultValue string      `json:"default_value,omitempty"`
}

type EnumValue struct {
	Value string `json:"value"`
	Label string `json:"label"`
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
	if err := validateID("path parameter", "connection_type_id", connectionTypeID); err != nil {
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
	var baseMockConnectionType ConnectionType
	baseMockConnectionType.Metadata.ID = "00000000-0000-0000-0000-000000000000"
	baseMockConnectionType.Metadata.TenantID = namespace
	baseMockConnectionType.Metadata.CreatedAt = "2026-01-01T00:00:00Z"
	baseMockConnectionType.Metadata.UpdatedAt = "2026-01-01T00:00:00Z"
	baseMockConnectionType.Resource.Provider = "base_provider"
	baseMockConnectionType.Resource.Description = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor."
	baseMockConnectionType.Resource.CredentialsFields = []ConnectionTypeCredentialField{}
	baseMockConnectionType.Status.FlightReady = true
	baseMockConnectionType.Status.FlightURL = "https://dch-default-dataconnectservice-flight.redhat-ods-applications.svc:8443"
	baseMockConnectionType.Status.UpdatedAt = "2026-01-01T00:00:00Z"

	postgresql := baseMockConnectionType
	postgresql.Metadata.ID = "550e8400-e29b-41d4-a716-446655440003"
	postgresql.Resource.Name = "PostgreSQL"
	postgresql.Resource.Provider = "postgres"
	postgresql.Resource.Tags = []string{"domain: database", "engine: postgresql", "access: sql"}
	postgresql.Resource.CredentialsFields = []ConnectionTypeCredentialField{
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

	s3 := baseMockConnectionType
	s3.Metadata.ID = "550e8400-e29b-41d4-a716-446655440004"
	s3.Resource.Name = "S3"
	s3.Resource.Provider = "s3"
	s3.Resource.Tags = make([]string, 30)
	for i := range s3.Resource.Tags {
		s3.Resource.Tags[i] = fmt.Sprintf("tag: value-%d", i+1)
	}
	s3.Resource.CredentialsFields = []ConnectionTypeCredentialField{
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

	names := []string{"Analytics", "Warehouse", "Data Lake", "Reporting", "Archive", "Metrics"}
	tags := []string{"domain: database", "domain: storage", "access: sql", "access: read-only", "environment: dev", "environment: production"}
	types := []ConnectionType{postgresql, s3}
	for i := range 30 {
		dummyConnectionType := baseMockConnectionType
		dummyConnectionType.Metadata.ID = fmt.Sprintf("00000000-0000-0000-0000-%012d", i+1)
		dummyConnectionType.Resource.Name = fmt.Sprintf("%s %d", names[rand.IntN(len(names))], i+1)
		dummyConnectionType.Resource.Description = dummyConnectionType.Resource.Description[:rand.IntN(len(dummyConnectionType.Resource.Description)+1)]
		dummyConnectionType.Status.FlightReady = rand.IntN(2) == 0
		for _, j := range rand.Perm(len(tags))[:1+rand.IntN(len(tags))] {
			dummyConnectionType.Resource.Tags = append(dummyConnectionType.Resource.Tags, tags[j])
		}
		types = append(types, dummyConnectionType)
	}
	return types
}
