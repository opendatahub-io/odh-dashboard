package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"

	"github.com/julienschmidt/httprouter"
	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

var validPromptName = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)

type PromptsEnvelope = Envelope[models.MLflowPromptsResponse, None]
type PromptVersionEnvelope = Envelope[models.MLflowPromptVersion, None]
type PromptVersionsEnvelope = Envelope[models.MLflowPromptVersionsResponse, None]

// MLflowListPromptsHandler handles GET /api/v1/prompts
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")
	nameFilter := r.URL.Query().Get("filter_name")

	result, err := app.repositories.Prompts.ListPrompts(ctx, pageToken, maxResults, nameFilter)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := PromptsEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowRegisterPromptHandler handles POST /api/v1/prompts
func (app *App) MLflowRegisterPromptHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

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

	// TOCTOU: LoadPrompt + RegisterPrompt is not atomic. A concurrent request could
	// create the same prompt between the check and the register. The MLflow server's
	// RegisterPrompt is idempotent (creates a new version), so the worst case is a
	// duplicate version rather than data corruption. An atomic "create-if-not-exists"
	// would require server-side support (e.g., a conditional create API).
	if req.CreateOnly {
		_, err := app.repositories.Prompts.LoadPrompt(ctx, req.Name, nil)
		if err == nil {
			app.conflictResponse(w, r, fmt.Errorf("a prompt with the name %q already exists", req.Name))
			return
		}
		var apiErr *sdkmlflow.APIError
		if !errors.As(err, &apiErr) || apiErr.StatusCode != http.StatusNotFound {
			app.handleMLflowClientError(w, r, err)
			return
		}
	}

	result, err := app.repositories.Prompts.RegisterPrompt(ctx, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := PromptVersionEnvelope{Data: *result}
	workspace := r.URL.Query().Get("workspace")
	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s?workspace=%s&version=%d", PromptsPath, url.PathEscape(result.Name), url.QueryEscape(workspace), result.Version)},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowLoadPromptHandler handles GET /api/v1/prompts/:name
func (app *App) MLflowLoadPromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
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

	result, err := app.repositories.Prompts.LoadPrompt(ctx, name, version)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := PromptVersionEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowListPromptVersionsHandler handles GET /api/v1/prompts/:name/versions
func (app *App) MLflowListPromptVersionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	result, err := app.repositories.Prompts.ListPromptVersions(ctx, name, pageToken, maxResults)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := PromptVersionsEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowDeletePromptHandler handles DELETE /api/v1/prompts/:name
func (app *App) MLflowDeletePromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	if err := app.repositories.Prompts.DeletePrompt(ctx, name); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MLflowDeletePromptVersionHandler handles DELETE /api/v1/prompts/:name/versions/:version
func (app *App) MLflowDeletePromptVersionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	version, err := strconv.Atoi(ps.ByName("version"))
	if err != nil {
		app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
		return
	}

	if err := app.repositories.Prompts.DeletePromptVersion(ctx, name, version); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
