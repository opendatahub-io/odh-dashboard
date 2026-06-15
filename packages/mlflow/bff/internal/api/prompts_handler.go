package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

var validPromptName = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)

func validatePromptName(name string) error {
	if name == "" || !validPromptName.MatchString(name) {
		return fmt.Errorf("invalid prompt name %q: must start with an alphanumeric character and contain only alphanumerics, hyphens, underscores, or dots", name)
	}
	return nil
}

type PromptsEnvelope = Envelope[models.PromptsResponse, None]
type PromptVersionEnvelope = Envelope[models.PromptVersion, None]
type PromptVersionsEnvelope = Envelope[models.PromptVersionsResponse, None]

const globalNamespaceFetchTimeout = 10 * time.Second

// MLflowListPromptsHandler returns all prompts from the user's workspace and
// any configured global namespaces, annotated with scope and sorted by name.
//
// TODO(RHOAIUX-2614): pagination is deferred until UX designs clarify how
// project and global prompts should be paginated.
func (app *App) MLflowListPromptsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	nameFilter := r.URL.Query().Get("filter_name")
	workspace, _ := ctx.Value(constants.WorkspaceQueryParameterKey).(string)
	globalNamespaces := app.getGlobalNamespaces()

	app.logger.Debug("listing prompts",
		slog.String("workspace", workspace),
		slog.String("filter_name", nameFilter),
		slog.Int("global_namespaces", len(globalNamespaces)))

	type projectResult struct {
		resp *models.PromptsResponse
		err  error
	}
	projectCh := make(chan projectResult, 1)
	go func() {
		noPageToken, noMaxResults := "", ""
		resp, err := app.repositories.Prompts.ListPrompts(ctx, noPageToken, noMaxResults, nameFilter)
		projectCh <- projectResult{resp, err}
	}()

	type globalResult struct {
		prompts []models.Prompt
		failed  []string
	}
	globalCh := make(chan globalResult, 1)
	if len(globalNamespaces) > 0 {
		go func() {
			p, f := app.fetchGlobalPrompts(r, globalNamespaces, nameFilter)
			globalCh <- globalResult{p, f}
		}()
	} else {
		globalCh <- globalResult{}
	}

	pr := <-projectCh
	if pr.err != nil {
		app.handleMLflowClientError(w, r, pr.err)
		return
	}
	if pr.resp == nil {
		pr.resp = &models.PromptsResponse{}
	}
	result := pr.resp

	gr := <-globalCh

	for i := range result.Prompts {
		result.Prompts[i].Scope = models.PromptScope{
			Type:      models.PromptScopeProject,
			Namespace: workspace,
		}
	}

	result.Prompts = append(result.Prompts, gr.prompts...)
	result.FailedNamespaces = gr.failed

	sort.SliceStable(result.Prompts, func(i, j int) bool {
		if result.Prompts[i].Name != result.Prompts[j].Name {
			return result.Prompts[i].Name < result.Prompts[j].Name
		}
		return result.Prompts[i].Scope.Namespace < result.Prompts[j].Scope.Namespace
	})

	response := PromptsEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// fetchGlobalPrompts queries global namespaces in parallel using the user's
// token for RBAC. Each namespace gets a 10s timeout. Failed queries are skipped.
func (app *App) fetchGlobalPrompts(r *http.Request, globalNamespaces []string, nameFilter string) ([]models.Prompt, []string) {
	var token string
	if app.config.AuthMethod != config.AuthMethodDisabled {
		identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if ok && identity != nil {
			token = identity.Token.Raw()
		}
	}

	var mu sync.Mutex
	var all []models.Prompt
	var failed []string
	var wg sync.WaitGroup

	const maxConcurrentGlobalFetches = 10
	sem := make(chan struct{}, maxConcurrentGlobalFetches)

	for _, ns := range globalNamespaces {
		wg.Add(1)
		sem <- struct{}{}
		go func(ns string) {
			defer wg.Done()
			defer func() { <-sem }()

			ctx, cancel := context.WithTimeout(r.Context(), globalNamespaceFetchTimeout)
			defer cancel()

			client, err := app.getMLflowClientFactory().GetClient(ctx, token, ns)
			if err != nil {
				app.logger.Warn("Failed to create MLflow client for global namespace",
					slog.String("namespace", ns), slog.Any("error", err))
				mu.Lock()
				failed = append(failed, ns)
				mu.Unlock()
				return
			}

			resp, err := app.repositories.Prompts.ListPromptsWithClient(ctx, client, "", "", nameFilter)
			if err != nil {
				app.logger.Warn("Failed to fetch prompts from global namespace",
					slog.String("namespace", ns), slog.Any("error", err))
				mu.Lock()
				failed = append(failed, ns)
				mu.Unlock()
				return
			}

			for i := range resp.Prompts {
				resp.Prompts[i].Scope = models.PromptScope{
					Type:      models.PromptScopeGlobal,
					Namespace: ns,
				}
			}

			mu.Lock()
			all = append(all, resp.Prompts...)
			mu.Unlock()
		}(ns)
	}

	wg.Wait()

	sort.Strings(failed)
	return all, failed
}

// MLflowRegisterPromptHandler handles POST /api/v1/prompts
func (app *App) MLflowRegisterPromptHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.RegisterPromptRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validatePromptName(req.Name); err != nil {
		app.badRequestResponse(w, r, err)
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
	if hasMessages {
		for i, m := range req.Messages {
			if strings.TrimSpace(m.Role) == "" || strings.TrimSpace(m.Content) == "" {
				app.badRequestResponse(w, r, fmt.Errorf("messages[%d]: role and content are required", i))
				return
			}
		}
	}

	// TOCTOU: not atomic, but MLflow's RegisterPrompt is idempotent (worst case
	// is a duplicate version, not corruption). Atomic create requires server support.
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
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("RegisterPrompt returned nil for %q", req.Name))
		return
	}

	response := PromptVersionEnvelope{Data: *result}
	workspace, _ := r.Context().Value(constants.WorkspaceQueryParameterKey).(string)
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

	if err := validatePromptName(name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var version *int
	if v := r.URL.Query().Get("version"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
			return
		}
		if n <= 0 {
			app.badRequestResponse(w, r, errors.New("version must be a positive integer"))
			return
		}
		version = &n
	}

	result, err := app.repositories.Prompts.LoadPrompt(ctx, name, version)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("LoadPrompt returned nil for %q", name))
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

	if err := validatePromptName(name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	result, err := app.repositories.Prompts.ListPromptVersions(ctx, name, pageToken, maxResults)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("ListPromptVersions returned nil for %q", name))
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

	if err := validatePromptName(name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

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

	if err := validatePromptName(name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	version, err := strconv.Atoi(ps.ByName("version"))
	if err != nil {
		app.badRequestResponse(w, r, errors.New("version must be a valid integer"))
		return
	}
	if version <= 0 {
		app.badRequestResponse(w, r, errors.New("version must be a positive integer"))
		return
	}

	if err := app.repositories.Prompts.DeletePromptVersion(ctx, name, version); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
