package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
)

const backendHealthTimeout = 5 * time.Second

func (app *App) BackendHealthHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if app.config.MockHTTPClient {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	apiURL := app.config.DataConnectHubAPIURL
	if app.dataConnectHubAPIURL != nil {
		apiURL = app.dataConnectHubAPIURL.Get()
	}
	if apiURL == "" {
		app.serviceUnavailableResponse(w, r, errors.New("Data Connect Hub API URL is not configured"))
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), backendHealthTimeout)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL+"/health", nil)
	if err != nil {
		app.serviceUnavailableResponse(w, r, fmt.Errorf("failed to create backend health request: %w", err))
		return
	}
	if authorization := r.Header.Get("Authorization"); authorization != "" {
		request.Header.Set("Authorization", authorization)
	}

	transport := app.dataConnectHubHTTPTransport
	if transport == nil {
		transport = httpclient.NewSharedHTTPTransport(app.config.InsecureSkipVerify, app.rootCAs)
	}
	client := &http.Client{
		Transport: transport,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return errors.New("redirects are not allowed")
		},
	}
	response, err := client.Do(request)
	if err != nil {
		app.serviceUnavailableResponse(w, r, fmt.Errorf("failed to request upstream health: %w", err))
		return
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		app.serviceUnavailableResponse(
			w,
			r,
			fmt.Errorf("upstream health endpoint returned status %d", response.StatusCode),
		)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
