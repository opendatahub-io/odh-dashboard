package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

type TestCredentialsRequest struct {
	DataConnectionTypeID string            `json:"data_connection_type_id"`
	Credentials          map[string]string `json:"credentials"`
}

const TestCredentialsPath = ApiPathPrefix + "/test/credentials"

func (app *App) TestCredentialsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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

	var request TestCredentialsRequest
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if request.DataConnectionTypeID == "" || request.Credentials == nil {
		app.badRequestResponse(w, r, fmt.Errorf("data_connection_type_id and credentials are required"))
		return
	}

	if app.config.MockHTTPClient {
		w.WriteHeader(http.StatusNoContent)
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
		app.serverErrorResponse(w, r, fmt.Errorf("failed to encode test credentials request: %w", err))
		return
	}
	if _, err := client.POST("/api/v1alpha1/data/test/credentials", bytes.NewReader(body)); err != nil {
		if app.upstreamErrorResponse(w, r, err) {
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to test credentials: %w", err))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
