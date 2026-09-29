package api

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

const ConnectionDeletePath = ApiPathPrefix + "/connections/:id"

func (app *App) DeleteConnectionHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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
	if !app.authorizeNamespace(w, r, namespace, identity, "delete", "data-connections") {
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
	if app.config.MockHTTPClient {
		w.WriteHeader(http.StatusNoContent)
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
	connectionID := url.PathEscape(params.ByName("id"))
	if _, err := client.DELETE("/api/v1alpha1/data/connections/" + connectionID); err != nil {
		if app.upstreamErrorResponse(w, r, err) {
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to delete data connection: %w", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
