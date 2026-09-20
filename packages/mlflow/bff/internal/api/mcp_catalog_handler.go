package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

type mcpServerToolsListEnvelope Envelope[*models.McpToolList, None]

// Converter response uses opaque JSON for the CR tree (documented in OpenAPI).
type mcpServerCREnvelope Envelope[json.RawMessage, None]

func (app *App) modelRegistryClientOrUnavailable(w http.ResponseWriter, r *http.Request) (bffclient.BFFClientInterface, bool) {
	mrClient := bffclient.GetClient(r.Context(), bffclient.BFFTargetModelRegistry)
	if mrClient == nil {
		app.modelRegistryBFFUnavailableResponse(w, r)
		return nil, false
	}
	return mrClient, true
}

func (app *App) requireCatalogServerIDAndNamespace(w http.ResponseWriter, r *http.Request, ps httprouter.Params) (string, string, bool) {
	serverID := ps.ByName("id")
	if serverID == "" {
		app.catalogBadRequest(w, r, fmt.Errorf("server id is required"))
		return "", "", false
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		app.catalogBadRequest(w, r, fmt.Errorf("namespace query parameter is required"))
		return "", "", false
	}

	return serverID, namespace, true
}

// GetMcpServerToolsHandler proxies GET /api/v1/mcp-catalog/servers/:id/tools to the
// model-registry catalog BFF (GET /mcp_catalog/mcp_servers/:id/tools).
func (app *App) GetMcpServerToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	serverID, namespace, ok := app.requireCatalogServerIDAndNamespace(w, r, ps)
	if !ok {
		return
	}

	mrClient, ok := app.modelRegistryClientOrUnavailable(w, r)
	if !ok {
		return
	}

	query := url.Values{}
	query.Set("namespace", namespace)
	for _, key := range []string{"filterQuery", "pageSize", "orderBy", "sortOrder", "nextPageToken"} {
		if value := r.URL.Query().Get(key); value != "" {
			query.Set(key, value)
		}
	}

	path := fmt.Sprintf("/mcp_catalog/mcp_servers/%s/tools?%s", url.PathEscape(serverID), query.Encode())

	var response mcpServerToolsListEnvelope
	if err := mrClient.Call(r.Context(), http.MethodGet, path, nil, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetMcpServerConverterHandler proxies GET /api/v1/mcp-catalog/servers/:id/mcpserver
// to MR GET /mcp_catalog/mcp_servers/:id/mcpserver.
func (app *App) GetMcpServerConverterHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	serverID, namespace, ok := app.requireCatalogServerIDAndNamespace(w, r, ps)
	if !ok {
		return
	}

	mrClient, ok := app.modelRegistryClientOrUnavailable(w, r)
	if !ok {
		return
	}

	query := url.Values{}
	query.Set("namespace", namespace)
	path := fmt.Sprintf("/mcp_catalog/mcp_servers/%s/mcpserver?%s", url.PathEscape(serverID), query.Encode())

	var response mcpServerCREnvelope
	if err := mrClient.Call(r.Context(), http.MethodGet, path, nil, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) catalogBadRequest(w http.ResponseWriter, r *http.Request, err error) {
	httpError := &HTTPError{
		StatusCode: http.StatusBadRequest,
		Error: ErrorPayload{
			Code:    apiErrorCodeForStatus(http.StatusBadRequest),
			Message: err.Error(),
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) modelRegistryBFFUnavailableResponse(w http.ResponseWriter, r *http.Request) {
	httpError := &HTTPError{
		StatusCode: http.StatusServiceUnavailable,
		Error: ErrorPayload{
			Code:    apiErrorCodeForStatus(http.StatusServiceUnavailable),
			Message: "Model Registry BFF is not available",
		},
	}
	app.errorResponse(w, r, httpError)
}

func (app *App) handleBFFClientError(w http.ResponseWriter, r *http.Request, err error) {
	var bffErr *bffclient.BFFClientError
	if errors.As(err, &bffErr) {
		statusCode := bffErr.StatusCode
		if statusCode < 100 || statusCode > 999 {
			statusCode = http.StatusBadGateway
		}

		message := bffErr.Message
		if statusCode >= 500 {
			app.logger.Error("BFF client error (5xx)", "status", statusCode, "code", bffErr.Code)
			message = http.StatusText(statusCode)
			if message == "" {
				message = "internal server error"
			}
		}

		httpError := &HTTPError{
			StatusCode: statusCode,
			Error: ErrorPayload{
				Code:    apiErrorCodeForStatus(statusCode),
				Message: message,
			},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	app.serverErrorResponse(w, r, err)
}
