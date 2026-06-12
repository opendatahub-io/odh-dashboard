package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
)

// BFFMLflowListPromptsHandler handles GET /api/v1/mlflow/prompts
// Proxies the request to the MLflow BFF which performs global namespace aggregation.
func (app *App) BFFMLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	// Forward query parameters to MLflow BFF
	// The gen-ai frontend sends "namespace" (via mod-arch-core), but the MLflow BFF expects "workspace"
	params := url.Values{}
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		params.Set("workspace", ns)
	}
	if v := r.URL.Query().Get("page_token"); v != "" {
		params.Set("page_token", v)
	}
	if v := r.URL.Query().Get("max_results"); v != "" {
		params.Set("max_results", v)
	}
	if v := r.URL.Query().Get("filter_name"); v != "" {
		params.Set("filter_name", v)
	}

	path := "/prompts"
	if len(params) > 0 {
		path += "?" + params.Encode()
	}

	var response json.RawMessage
	if err := mlflowClient.Call(ctx, "GET", path, nil, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response) //nolint:errcheck
}

// BFFMLflowRegisterPromptHandler handles POST /api/v1/mlflow/prompts
// Proxies the request to the MLflow BFF to register a new prompt.
func (app *App) BFFMLflowRegisterPromptHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	// Read request body to forward
	var body json.RawMessage
	if err := app.ReadJSON(w, r, &body); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	path := "/prompts"
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		path += "?workspace=" + url.QueryEscape(ns)
	}

	var response json.RawMessage
	if err := mlflowClient.Call(ctx, "POST", path, body, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	w.Write(response) //nolint:errcheck
}

// BFFMLflowGetPromptHandler handles GET /api/v1/mlflow/prompts/:name
// Proxies the request to the MLflow BFF to get a specific prompt.
func (app *App) BFFMLflowGetPromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	params := url.Values{}
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		params.Set("workspace", ns)
	}
	if v := r.URL.Query().Get("version"); v != "" {
		params.Set("version", v)
	}

	path := fmt.Sprintf("/prompts/%s", url.PathEscape(name))
	if len(params) > 0 {
		path += "?" + params.Encode()
	}

	var response json.RawMessage
	if err := mlflowClient.Call(ctx, "GET", path, nil, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response) //nolint:errcheck
}

// BFFMLflowDeletePromptHandler handles DELETE /api/v1/mlflow/prompts/:name
// Proxies the request to the MLflow BFF to delete a prompt.
func (app *App) BFFMLflowDeletePromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	path := fmt.Sprintf("/prompts/%s", url.PathEscape(name))
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		path += "?workspace=" + url.QueryEscape(ns)
	}

	if err := mlflowClient.Call(ctx, "DELETE", path, nil, nil); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// BFFMLflowListPromptVersionsHandler handles GET /api/v1/mlflow/prompts/:name/versions
// Proxies the request to the MLflow BFF to list versions of a prompt.
func (app *App) BFFMLflowListPromptVersionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	params := url.Values{}
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		params.Set("workspace", ns)
	}
	if v := r.URL.Query().Get("page_token"); v != "" {
		params.Set("page_token", v)
	}
	if v := r.URL.Query().Get("max_results"); v != "" {
		params.Set("max_results", v)
	}

	path := fmt.Sprintf("/prompts/%s/versions", url.PathEscape(name))
	if len(params) > 0 {
		path += "?" + params.Encode()
	}

	var response json.RawMessage
	if err := mlflowClient.Call(ctx, "GET", path, nil, &response); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response) //nolint:errcheck
}

// BFFMLflowDeletePromptVersionHandler handles DELETE /api/v1/mlflow/prompts/:name/versions/:version
// Proxies the request to the MLflow BFF to delete a specific prompt version.
func (app *App) BFFMLflowDeletePromptVersionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")
	version := ps.ByName("version")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "MLflow BFF is not available",
			},
		})
		return
	}

	path := fmt.Sprintf("/prompts/%s/versions/%s", url.PathEscape(name), url.PathEscape(version))
	if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && ns != "" {
		path += "?workspace=" + url.QueryEscape(ns)
	}

	if err := mlflowClient.Call(ctx, "DELETE", path, nil, nil); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
