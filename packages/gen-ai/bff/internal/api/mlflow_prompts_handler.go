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

	// Get MLflow BFF client from context (set by AttachBFFMLflowClient middleware)
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		// Graceful degradation for read operations: MLflow BFF unavailable, return empty results with warning.
		// Design decision: List operations return HTTP 200 + [] to allow UI to render with local state,
		// while write operations (register/delete) return 503 to prevent silent data loss.
		// The X-MLflow-BFF-Unavailable header signals degraded mode for monitoring and UI warnings.
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

	// Build query parameters for MLflow BFF
	// MLflow BFF expects workspace query parameter for namespace context.
	//
	// SECURITY NOTE: The Gen AI BFF forwards the user token via x-forwarded-access-token header.
	// The MLflow BFF MUST perform its own SubjectAccessReview (SAR) check against the workspace
	// namespace using this forwarded token to verify the user has read/write access. The Gen AI
	// BFF does NOT independently verify namespace access before making the inter-BFF call — it
	// relies on the MLflow BFF to enforce namespace-scoped RBAC. If the MLflow BFF blindly trusts
	// the ?workspace= parameter without SAR verification, any authenticated Gen AI caller could
	// read/write prompts in arbitrary namespaces by manipulating the workspace query parameter.
	//
	// TODO(RHOAIENG-72315): Aggregate prompts from global namespaces in addition to user namespace.
	// Current implementation queries only the user's namespace. To fully satisfy AC#4, we need to:
	// 1. Call RHAISTRAT-1727 API to get the list of global namespaces
	// 2. Make parallel requests to MLflow BFF for user namespace + each global namespace
	// 3. Merge and deduplicate the results before returning to frontend
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

	// Call MLflow BFF with 5 second timeout per query
	callCtx, cancel := context.WithTimeout(ctx, bffCallTimeout)
	defer cancel()

	var bffResponse struct {
		Data models.MLflowPromptsResponse `json:"data"`
	}
	err := mlflowClient.Call(callCtx, "GET", path, nil, &bffResponse)
	if err != nil {
		// Check if error is an authorization failure (401/403) - propagate those
		var bffErr *bffclient.BFFClientError
		if errors.As(err, &bffErr) {
			if bffErr.Code == bffclient.ErrCodeUnauthorized || bffErr.Code == bffclient.ErrCodeForbidden {
				// Auth errors should be propagated, not gracefully degraded
				app.handleBFFClientError(w, r, err)
				return
			}
		}

		// Graceful degradation for connection/timeout errors: log and return empty results
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

	// Populate total_count from actual prompts length if not set by MLflow BFF.
	// The MLflow BFF aggregates prompts across namespaces and may not include total_count.
	// For unpaginated responses (no page token provided), total_count = len(prompts).
	// For paginated responses, this is a lower bound — the frontend uses it for "Showing X prompts".
	if bffResponse.Data.TotalCount == 0 && len(bffResponse.Data.Prompts) > 0 {
		bffResponse.Data.TotalCount = len(bffResponse.Data.Prompts)
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

	// Get MLflow BFF client from context
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for prompt registration")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// Call MLflow BFF to register prompt with 5 second timeout.
	// The req includes the CreateOnly field from the frontend. The MLflow BFF is responsible
	// for enforcing this field: if true, it must perform a pre-flight existence check and
	// return 409 Conflict if the prompt already exists. This Gen AI BFF does not independently
	// verify CreateOnly semantics — it forwards the full request and relies on the MLflow BFF
	// to enforce the constraint and return appropriate status codes (201 on success, 409 on
	// collision).
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

	// Get MLflow BFF client from context
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for load prompt")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// Call MLflow BFF to load prompt with 5 second timeout
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
	name := ps.ByName("name")

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	// Get MLflow BFF client from context
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for list prompt versions")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// Call MLflow BFF to list prompt versions with 5 second timeout
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

	// Get MLflow BFF client from context
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for delete prompt")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// Call MLflow BFF to delete prompt with 5 second timeout
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

	// Get MLflow BFF client from context
	mlflowClient := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow)
	if mlflowClient == nil {
		logger := helper.GetContextLoggerFromReq(r)
		logger.Error("MLflow BFF client unavailable for delete prompt version")
		app.handleBFFClientError(w, r, bffclient.NewServerUnavailableError(bffclient.BFFTargetMLflow))
		return
	}

	// Call MLflow BFF to delete prompt version with 5 second timeout
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
