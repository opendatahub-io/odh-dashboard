package api

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

const ConnectionReadinessPath = ApiPathPrefix + "/connections/:id/readiness"

func (app *App) CheckConnectionReadinessHandler(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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
	if _, err := client.POST("/api/v1alpha1/data/connections/"+connectionID+"/readiness", bytes.NewReader(nil)); err != nil {
		var upstreamErr *httpclient.HTTPError
		if errors.As(err, &upstreamErr) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: upstreamErr.StatusCode,
				Error: ErrorPayload{
					Code:    upstreamErr.Code,
					Message: upstreamErr.Message,
				},
			})
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to verify data connection: %w", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
