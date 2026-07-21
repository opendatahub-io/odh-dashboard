package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// validPromptName matches alphanumerics, hyphens, underscores, and dots (MLflow naming rules).
var validPromptName = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)

// bffCallTimeout is the timeout for all MLflow BFF inter-BFF HTTP calls.
const bffCallTimeout = 5 * time.Second

// MLflowPromptsEnvelope is the response envelope for MLflow prompts
type MLflowPromptsEnvelope = Envelope[models.MLflowPromptsResponse, None]

// MLflowPromptVersionEnvelope is the response envelope for a single prompt version
type MLflowPromptVersionEnvelope = Envelope[models.MLflowPromptVersion, None]

// MLflowPromptVersionsEnvelope is the response envelope for listing prompt versions
type MLflowPromptVersionsEnvelope = Envelope[models.MLflowPromptVersionsResponse, None]

// MLflowListPromptsHandler handles GET /api/v1/mlflow/prompts
// Calls MLflow BFF via inter-BFF HTTPS to aggregate prompts from user workspace + global namespaces
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	nameFilter := r.URL.Query().Get("filter_name")
	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		// Graceful degradation: List operations return 200 + empty array (write operations return 503).
		logger := helper.GetContextLoggerFromReq(r)
		logger.Warn("MLflow BFF client unavailable, returning empty prompts list")
		response := MLflowPromptsEnvelope{
			Data: models.MLflowPromptsResponse{
				Prompts:    []models.MLflowPrompt{},
				TotalCount: 0,
			},
		}
		w.Header().Set("X-MLflow-BFF-Unavailable", "true")
		if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// SECURITY: Gen AI BFF performs generic namespace access check via RequireAccessToService
	// (OGX SAR). MLflow-specific RBAC (mlflow.kubeflow.org/registeredmodels) is enforced by
	// MLflow BFF, which SAR-checks the workspace param against the forwarded user token.
	// Auth errors (401/403) from MLflow BFF are propagated to the client (lines 84-90).
	// This architectural trust boundary allows MLflow BFF to be the authoritative source for
	// MLflow-specific permissions while Gen AI BFF validates general namespace access.
	// Global namespace aggregation (user ns + global namespaces from OdhDashboardConfig) is
	// performed by MLflow BFF; prompts are returned with scope annotations and failed_namespaces.
	path := "/prompts?workspace=" + url.QueryEscape(namespace)
	if nameFilter != "" {
		path += "&filter_name=" + url.QueryEscape(nameFilter)
	}
	if pageToken != "" {
		path += "&page_token=" + url.QueryEscape(pageToken)
	}
	if maxResults != "" {
		path += "&max_results=" + url.QueryEscape(maxResults)
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	var bffResponse struct {
		Data models.MLflowPromptsResponse `json:"data"`
	}
	err := mlflowClient.Call(callCtx, "GET", path, nil, &bffResponse)
	if err != nil {
		var bffErr *bffclient.BFFClientError
		if errors.As(err, &bffErr) {
			if bffErr.Code == bffclient.ErrCodeUnauthorized || bffErr.Code == bffclient.ErrCodeForbidden {
				app.handleBFFClientError(w, r, err)
				return
			}
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Warn("Failed to call MLflow BFF, returning empty prompts list", "error", err)
		response := MLflowPromptsEnvelope{
			Data: models.MLflowPromptsResponse{
				Prompts:    []models.MLflowPrompt{},
				TotalCount: 0,
			},
		}
		w.Header().Set("X-MLflow-BFF-Error", "true")
		if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// MLflow BFF may not include total_count (cross-namespace aggregation). Heuristic: If
	// TotalCount=0 but Prompts is non-empty, assume TotalCount was omitted and compute from
	// len(Prompts). This works because MLflow returns Prompts=[] when there are no results,
	// not Prompts=[...] + TotalCount=0. Future-proof: If MLflow BFF needs to distinguish "not
	// provided" from "explicitly 0", change TotalCount to *int in the OpenAPI spec.
	if bffResponse.Data.TotalCount == 0 && len(bffResponse.Data.Prompts) > 0 {
		bffResponse.Data.TotalCount = len(bffResponse.Data.Prompts)
	}

	for i := range bffResponse.Data.Prompts {
		if bffResponse.Data.Prompts[i].Scope.Type == models.MLflowPromptScopeGlobal {
			bffResponse.Data.Prompts[i].Scope.ReadOnly = true
		}
	}

	response := MLflowPromptsEnvelope{
		Data: bffResponse.Data,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowRegisterPromptHandler handles POST /api/v1/mlflow/prompts
// Calls MLflow BFF via inter-BFF HTTPS to register prompts in the user's workspace
func (app *App) MLflowRegisterPromptHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)

	var req models.MLflowRegisterPromptRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.Name == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if !validPromptName.MatchString(req.Name) {
		app.badRequestResponse(w, r, fmt.Errorf("invalid prompt name %q: must start with an alphanumeric character and contain only alphanumerics, hyphens, underscores, or dots", req.Name))
		return
	}

	hasMessages := len(req.Messages) > 0
	hasTemplate := req.Template != ""
	if !hasMessages && !hasTemplate {
		app.badRequestResponse(w, r, errors.New("either messages or template is required"))
		return
	}
	if hasMessages && hasTemplate {
		app.badRequestResponse(w, r, errors.New("cannot specify both messages and template"))
		return
	}

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for prompt registration")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// MLflow BFF enforces CreateOnly field (returns 409 if prompt exists when CreateOnly=true).
	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/prompts?workspace=" + url.QueryEscape(namespace)
	var bffResponse struct {
		Data models.MLflowPromptVersion `json:"data"`
	}
	err := mlflowClient.Call(callCtx, "POST", path, req, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionEnvelope{
		Data: bffResponse.Data,
	}

	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s?version=%d", constants.MLflowPromptsPath, bffResponse.Data.Name, bffResponse.Data.Version)},
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowLoadPromptHandler handles GET /api/v1/mlflow/prompts/:name
func (app *App) MLflowLoadPromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if ws := r.URL.Query().Get("workspace"); ws != "" {
		namespace = ws
	}
	name := ps.ByName("name")

	var version *int
	if v := r.URL.Query().Get("version"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
			return
		}
		version = &n
	}

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for load prompt")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/prompts/" + url.PathEscape(name) + "?workspace=" + url.QueryEscape(namespace)
	if version != nil {
		path += "&version=" + strconv.Itoa(*version)
	}

	var bffResponse struct {
		Data models.MLflowPromptVersion `json:"data"`
	}
	err := mlflowClient.Call(callCtx, "GET", path, nil, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionEnvelope{
		Data: bffResponse.Data,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowListPromptVersionsHandler handles GET /api/v1/mlflow/prompts/:name/versions
func (app *App) MLflowListPromptVersionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if ws := r.URL.Query().Get("workspace"); ws != "" {
		namespace = ws
	}
	name := ps.ByName("name")

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for list prompt versions")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/prompts/" + url.PathEscape(name) + "/versions?workspace=" + url.QueryEscape(namespace)
	if pageToken != "" {
		path += "&page_token=" + url.QueryEscape(pageToken)
	}
	if maxResults != "" {
		path += "&max_results=" + url.QueryEscape(maxResults)
	}

	var bffResponse struct {
		Data models.MLflowPromptVersionsResponse `json:"data"`
	}
	err := mlflowClient.Call(callCtx, "GET", path, nil, &bffResponse)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionsEnvelope{
		Data: bffResponse.Data,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowDeletePromptHandler handles DELETE /api/v1/mlflow/prompts/:name
func (app *App) MLflowDeletePromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	name := ps.ByName("name")

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for delete prompt")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/prompts/" + url.PathEscape(name) + "?workspace=" + url.QueryEscape(namespace)
	err := mlflowClient.Call(callCtx, "DELETE", path, nil, nil)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MLflowDeletePromptVersionHandler handles DELETE /api/v1/mlflow/prompts/:name/versions/:version
func (app *App) MLflowDeletePromptVersionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	name := ps.ByName("name")

	version, err := strconv.Atoi(ps.ByName("version"))
	if err != nil {
		app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
		return
	}

	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for delete prompt version")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	path := "/prompts/" + url.PathEscape(name) + "/versions/" + strconv.Itoa(version) + "?workspace=" + url.QueryEscape(namespace)
	err = mlflowClient.Call(callCtx, "DELETE", path, nil, nil)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
