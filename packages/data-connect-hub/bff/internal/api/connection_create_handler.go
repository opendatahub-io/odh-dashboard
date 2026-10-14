package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"k8s.io/apimachinery/pkg/util/validation"
)

type CreateConnectionRequest struct {
	Name                 string `json:"name"`
	DataConnectionTypeID string `json:"data_connection_type_id"`
	Format               string `json:"format"`
	Credentials          struct {
		Secret     string            `json:"secret"`
		Properties map[string]string `json:"properties"`
	} `json:"credentials"`
	Properties map[string]string `json:"properties"`
}

type ConnectionResponse Envelope[Connection, None]

func (app *App) CreateConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "create", "data-connections") {
		return
	}

	var request CreateConnectionRequest
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := validateCreateConnectionRequest(request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if app.config.MockHTTPClient {
		created := mockConnections(namespace)[0]
		created.Resource.Name = request.Name
		created.Resource.DataConnectionTypeID = request.DataConnectionTypeID
		created.Resource.Format = request.Format
		if err := app.WriteJSON(w, http.StatusCreated, ConnectionResponse{Data: created}, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

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
	body, err := json.Marshal(request)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to encode create connection request: %w", err))
		return
	}
	responseBody, err := client.POST("/api/v1alpha1/data/connections", bytes.NewReader(body))
	if err != nil {
		if app.upstreamErrorResponse(w, r, err) {
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create data connection: %w", err))
		return
	}
	var created Connection
	if err := json.Unmarshal(responseBody, &created); err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to decode created data connection: %w", err))
		return
	}
	if err := validateCreatedConnection(created); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if err := app.WriteJSON(w, http.StatusCreated, ConnectionResponse{Data: created}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func validateCreateConnectionRequest(request CreateConnectionRequest) error {
	missing := make([]string, 0, 5)
	if request.Name == "" {
		missing = append(missing, "name")
	}
	if request.DataConnectionTypeID == "" {
		missing = append(missing, "data_connection_type_id")
	}
	if request.Credentials.Secret == "" {
		missing = append(missing, "credentials.secret")
	}
	if request.Credentials.Properties == nil {
		missing = append(missing, "credentials.properties")
	}
	if request.Properties == nil {
		missing = append(missing, "properties")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required fields: %s", strings.Join(missing, ", "))
	}
	if request.Format != "tabular" && request.Format != "binary" {
		return fmt.Errorf("format must be either tabular or binary")
	}
	if errors := validation.IsDNS1123Label(request.Credentials.Secret); len(errors) > 0 {
		return fmt.Errorf("credentials.secret must be a valid DNS-1123 name: %s", errors[0])
	}
	return nil
}

func validateCreatedConnection(connection Connection) error {
	if connection.Metadata.ID == "" || connection.Resource.Name == "" ||
		connection.Resource.DataConnectionTypeID == "" ||
		(connection.Resource.Format != "tabular" && connection.Resource.Format != "binary") ||
		connection.Status.State == "" {
		return fmt.Errorf("created connection response is missing required fields")
	}
	return nil
}
