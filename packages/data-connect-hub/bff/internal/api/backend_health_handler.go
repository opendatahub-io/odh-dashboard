package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/constants"
	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
	k8s "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
)

const backendHealthTimeout = 5 * time.Second

func (app *App) BackendHealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
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
		app.serviceUnavailableResponse(w, r)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), backendHealthTimeout)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL+"/health", nil)
	if err != nil {
		app.serviceUnavailableResponse(w, r)
		return
	}

	transport := app.dataConnectHubHTTPTransport
	if transport == nil {
		transport = httpclient.NewSharedHTTPTransport(app.config.InsecureSkipVerify, app.rootCAs)
	}
	client := &http.Client{Transport: transport}
	response, err := client.Do(request)
	if err != nil {
		app.serviceUnavailableResponse(w, r)
		return
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		app.serviceUnavailableResponse(w, r)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
