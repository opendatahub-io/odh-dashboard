package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
)

type McpServerListEnvelope Envelope[*models.McpServerList, None]
type McpServerFilterOptionsListEnvelope Envelope[*models.FilterOptionsList, None]
type McpServerEnvelope Envelope[*models.McpServer, None]
type McpServerToolsListEnvelope Envelope[*models.McpToolList, None]

func (app *App) GetAllMcpServersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("catalog REST client not found"))
		return
	}

	mcpServers, err := app.repositories.ModelCatalogClient.GetAllMcpServers(client, r.URL.Query())

	if err != nil {
		var httpErr *httpclient.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, httpErr)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	mcpServerList := McpServerListEnvelope{
		Data: mcpServers,
	}

	err = app.WriteJSON(w, http.StatusOK, mcpServerList, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetMcpServersFiltersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("catalog REST client not found"))
		return
	}

	mcpServerFilterOptions, err := app.repositories.ModelCatalogClient.GetMcpServersFilter(client)

	if err != nil {
		var httpErr *httpclient.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, httpErr)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	mcpServerFilterOptionsList := McpServerFilterOptionsListEnvelope{
		Data: mcpServerFilterOptions,
	}

	err = app.WriteJSON(w, http.StatusOK, mcpServerFilterOptionsList, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetMcpServerHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("catalog REST client not found"))
		return
	}

	serverId := ps.ByName(McpServerId)

	if serverId == "" {
		app.badRequestResponse(w, r, fmt.Errorf("server_id is required"))
		return
	}

	server, err := app.repositories.ModelCatalogClient.GetMcpServer(client, serverId, r.URL.Query())

	if err != nil {
		var httpErr *httpclient.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, httpErr)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	mcpServer := McpServerEnvelope{
		Data: server,
	}

	err = app.WriteJSON(w, http.StatusOK, mcpServer, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *App) GetMcpServersToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("catalog REST client not found"))
		return
	}

	serverId := ps.ByName(McpServerId)

	if serverId == "" {
		app.badRequestResponse(w, r, fmt.Errorf("server_id is required"))
		return
	}

	mcpServerTools, err := app.repositories.ModelCatalogClient.GetMcpServersTools(client, serverId)

	if err != nil {
		var httpErr *httpclient.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, httpErr)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	mcpServerToolList := McpServerToolsListEnvelope{
		Data: mcpServerTools,
	}

	err = app.WriteJSON(w, http.StatusOK, mcpServerToolList, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetMcpServerLogoHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)

	if !ok {
		app.serverErrorResponse(w, r, errors.New("catalog REST client not found"))
		return
	}

	serverId := ps.ByName(McpServerId)

	if serverId == "" {
		app.badRequestResponse(w, r, fmt.Errorf("server_id is required"))
		return
	}

	resp, err := app.repositories.ModelCatalogClient.GetMcpServerLogo(client, serverId)

	// GetMcpServerLogo uses GETRaw, which only returns an error for transport-level
	// failures (never for upstream error statuses), so any non-nil err is a server error.
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Faithfully proxy the catalog logo response. For plain external-URL logos the
	// catalog replies with a redirect, which we pass through so the browser follows it;
	// for inline data-URI logos it replies with the decoded image bytes.
	if resp.StatusCode >= http.StatusMultipleChoices && resp.StatusCode < http.StatusBadRequest {
		if location := resp.Header.Get("Location"); location != "" {
			w.Header().Set("Location", location)
		}
		w.WriteHeader(resp.StatusCode)
		return
	}

	// GETRaw passes upstream error statuses through untouched, so translate any 4xx/5xx
	// into the structured JSON error the rest of the API returns instead of forwarding
	// the catalog's plaintext body (e.g. "404 page not found") verbatim.
	if resp.StatusCode >= http.StatusBadRequest {
		app.errorResponse(w, r, httpErrorFromRaw(resp))
		return
	}

	// Forward an allowlist of upstream headers. Besides Content-Type and Cache-Control,
	// this MUST include the catalog's protective headers (X-Content-Type-Options: nosniff
	// and the SVG Content-Security-Policy): since we re-serve these bytes under the
	// dashboard's own origin, dropping them would re-open the stored-XSS vector on
	// SVG logos that those headers exist to prevent.
	for _, h := range []string{
		"Content-Type",
		"Cache-Control",
		"X-Content-Type-Options",
		"Content-Security-Policy",
		"Content-Disposition",
	} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}

	w.WriteHeader(resp.StatusCode)
	if _, err := w.Write(resp.Body); err != nil {
		app.logger.Error("failed to write mcp server logo response", "error", err)
	}
}
