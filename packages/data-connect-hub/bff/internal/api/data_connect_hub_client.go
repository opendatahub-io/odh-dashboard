package api

import (
	"net/http"

	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
)

func (app *App) newDataConnectHubHTTPClient(apiURL string, headers http.Header) (httpclient.HTTPClientInterface, error) {
	transport := app.dataConnectHubHTTPTransport
	if transport == nil {
		transport = httpclient.NewSharedHTTPTransport(app.config.InsecureSkipVerify, app.rootCAs)
	}
	return httpclient.NewHTTPClientWithTransport(
		app.logger,
		"",
		apiURL,
		headers,
		app.config.InsecureSkipVerify,
		app.rootCAs,
		transport,
	)
}
