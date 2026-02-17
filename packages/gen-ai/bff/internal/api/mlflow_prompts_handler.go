package api

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// validPromptName matches alphanumerics, hyphens, underscores, and dots (MLflow naming rules).
var validPromptName = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)

// MLflowPromptsEnvelope is the response envelope for MLflow prompts
type MLflowPromptsEnvelope = Envelope[models.MLflowPromptsResponse, None]

// MLflowPromptVersionEnvelope is the response envelope for a single prompt version
type MLflowPromptVersionEnvelope = Envelope[models.MLflowPromptVersion, None]

// MLflowPromptVersionsEnvelope is the response envelope for listing prompt versions
type MLflowPromptVersionsEnvelope = Envelope[models.MLflowPromptVersionsResponse, None]

// MLflowListPromptsHandler handles GET /api/v1/mlflow/prompts
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")
	nameFilter := r.URL.Query().Get("name")

	result, err := app.repositories.MLflowPrompts.ListPrompts(ctx, pageToken, maxResults, nameFilter)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MLflowPromptsEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowRegisterPromptHandler handles POST /api/v1/mlflow/prompts
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

	result, err := app.repositories.MLflowPrompts.RegisterPrompt(ctx, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionEnvelope{
		Data: *result,
	}

	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s?version=%d", constants.MLflowPromptsPath, result.Name, result.Version)},
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowLoadPromptHandler handles GET /api/v1/mlflow/prompts/:name
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

	result, err := app.repositories.MLflowPrompts.LoadPrompt(ctx, name, version)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowListPromptVersionsHandler handles GET /api/v1/mlflow/prompts/:name/versions
func (app *App) MLflowListPromptVersionsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	result, err := app.repositories.MLflowPrompts.ListPromptVersions(ctx, name, pageToken, maxResults)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MLflowPromptVersionsEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowDeletePromptHandler handles DELETE /api/v1/mlflow/prompts/:name
func (app *App) MLflowDeletePromptHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	if err := app.repositories.MLflowPrompts.DeletePrompt(ctx, name); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// MLflowDeletePromptVersionHandler handles DELETE /api/v1/mlflow/prompts/:name/versions/:version
func (app *App) MLflowDeletePromptVersionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	name := ps.ByName("name")

	version, err := strconv.Atoi(ps.ByName("version"))
	if err != nil {
		app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
		return
	}

	if err := app.repositories.MLflowPrompts.DeletePromptVersion(ctx, name, version); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
