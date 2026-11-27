package api

import (
	"context"
	"fmt"
	"net/http"

	httpclient "github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/httpclient"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/models"
	"github.com/opendatahub-io/data-connect-hub/bff/internal/repositories"
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

// dataConnectHubReader is shared by the real repository and local mock fixtures.
type dataConnectHubReader interface {
	ListConnections(context.Context) ([]models.Connection, error)
	GetConnection(context.Context, string) (models.Connection, error)
	ListConnectionTypes(context.Context) ([]models.ConnectionType, error)
	GetConnectionType(context.Context, string) (models.ConnectionType, error)
}

func (app *App) dataConnectHubRepository(ctx context.Context, identity *kubernetes.RequestIdentity, namespace string) (dataConnectHubReader, error) {
	if app.config.MockHTTPClient {
		return mockDataConnectHubRepository{namespace: namespace}, nil
	}
	apiURL := app.config.DataConnectHubAPIURL
	if app.dataConnectHubAPIURL != nil {
		apiURL = app.dataConnectHubAPIURL.Get()
	}
	if apiURL == "" {
		return nil, fmt.Errorf("data connect hub API URL is not configured")
	}
	headers, err := app.dataConnectHubHeaders(ctx, identity, namespace)
	if err != nil {
		return nil, err
	}
	client, err := app.newDataConnectHubHTTPClient(apiURL, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to create Data Connect Hub client: %w", err)
	}
	return repositories.NewDataConnectHubRepository(client), nil
}

func (app *App) dataConnectHubErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	if !app.upstreamErrorResponse(w, r, err) {
		app.serverErrorResponse(w, r, err)
	}
}
