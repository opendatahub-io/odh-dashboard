package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

type ConnectionType struct {
	Metadata struct {
		ID        string `json:"id"`
		TenantID  string `json:"tenant_id,omitempty"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	} `json:"metadata"`
	Resource struct {
		Name              string `json:"name"`
		Provider          string `json:"provider"`
		Description       string `json:"description,omitempty"`
		CredentialsFields []struct {
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
		} `json:"credentials_fields"`
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

const ConnectionTypesPath = ApiPathPrefix + "/connection-types"

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

func mockConnectionTypes(namespace string) []ConnectionType {
	types := make([]ConnectionType, 2)
	types[0].Metadata.ID = "postgresql"
	types[0].Metadata.TenantID = namespace
	types[0].Resource.Name = "PostgreSQL"
	types[0].Resource.Provider = "postgresql"
	types[1].Metadata.ID = "s3"
	types[1].Metadata.TenantID = namespace
	types[1].Resource.Name = "S3"
	types[1].Resource.Provider = "s3"
	return types
}
