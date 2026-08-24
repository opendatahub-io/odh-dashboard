package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
var validNamespace = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

func validatePromptName(name string) error {
	if name == "" || !validPromptName.MatchString(name) {
		return fmt.Errorf("invalid prompt name %q: must start with an alphanumeric character and contain only alphanumerics, hyphens, underscores, or dots", name)
	}
	return nil
}

func validateNamespace(namespace string) error {
	if namespace == "" {
		return errors.New("namespace cannot be empty")
	}
	if len(namespace) > 63 {
		return errors.New("namespace must be 63 characters or fewer")
	}
	if !validNamespace.MatchString(namespace) {
		return errors.New("namespace must be lowercase alphanumeric characters or hyphens, and must start and end with an alphanumeric character")
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

			// MLflow OSS search indexing bug: registered-models/search with tag
			// filters can permanently return empty when a RegisteredModel and its
			// first ModelVersion are created in rapid succession (<50ms). Try an
			// unfiltered search and apply the is_prompt tag check in code.
			if len(resp.Prompts) == 0 {
				if fallback := app.listPromptsUnfilteredSearch(ctx, token, ns, nameFilter); len(fallback) > 0 {
					resp.Prompts = fallback
				}
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

// extractAndValidateWorkspace extracts the workspace from context, validates it,
// and writes an error response if validation fails. Returns the workspace and true
// if valid, empty string and false if invalid (response already written).
func (app *App) extractAndValidateWorkspace(
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
) (string, bool) {
	workspace, _ := ctx.Value(constants.WorkspaceQueryParameterKey).(string)
	if strings.TrimSpace(workspace) == "" {
		app.badRequestResponse(w, r, errors.New("workspace query parameter is required"))
		return "", false
	}
	if err := validateNamespace(workspace); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid workspace: %w", err))
		return "", false
	}
	return workspace, true
}

// enforceWritePermission checks if the user has write permissions in the namespace.
// Returns true if allowed, false if denied or error occurred (response already written).
// The verb parameter should be "create" for save operations or "delete" for delete operations.
// Delegates the auth-disabled bypass, error handling, and forbidden-response
// shape to enforceResourceWritePermission (permissions.go), shared with
// enforceMCPWritePermission (mcp_registry_handler.go).
func (app *App) enforceWritePermission(
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
	workspace string,
	verb string,
) bool {
	return app.enforceResourceWritePermission(ctx, w, r, workspace, verb, "registeredmodels",
		"insufficient permissions to write prompts",
		func(k8sClient k8s.KubernetesClientInterface) resourceWriteChecker {
			return k8sClient.CanWritePromptsInNamespace
		})
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

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	// Use "create" verb for both new prompts and version appends. The current
	// mlflow-edit ClusterRole grants create, update, patch, and delete, so this
	// check passes for both operations. If mlflow-edit is later restricted to
	// separate create from update, this may need to distinguish the two cases.
	if !app.enforceWritePermission(ctx, w, r, workspace, "create") {
		return
	}

	// TOCTOU: not atomic, but MLflow's RegisterPrompt is idempotent (worst case
	// is a duplicate version, not corruption). Atomic create requires server support.
	if req.CreateOnly {
		v := 1
		_, err := app.repositories.Prompts.LoadPrompt(ctx, req.Name, &v)
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

	// When no version is requested, resolve the latest version explicitly to
	// avoid the MLflow SDK's reserved "latest" alias path.
	if version == nil {
		versions, err := app.repositories.Prompts.ListPromptVersions(ctx, name, "", "1")
		if err != nil {
			app.handleMLflowClientError(w, r, err)
			return
		}
		if len(versions.Versions) == 0 {
			app.notFoundResponse(w, r)
			return
		}
		v := versions.Versions[0].Version
		version = &v
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

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceWritePermission(ctx, w, r, workspace, "delete") {
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

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	if err := app.repositories.Prompts.DeletePromptVersion(ctx, name, version); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listPromptsUnfilteredSearch works around the MLflow OSS search indexing bug.
// It calls registered-models/search WITHOUT the is_prompt tag filter, then
// filters the results in code. Only used as a fallback when the SDK's
// tag-filtered search returns empty for a global namespace.
func (app *App) listPromptsUnfilteredSearch(ctx context.Context, token, namespace, nameFilter string) []models.Prompt {
	if app.mlflowTrackingURL == "" {
		return nil
	}

	u, err := url.Parse(app.mlflowTrackingURL + "/api/2.0/mlflow/registered-models/search")
	if err != nil {
		return nil
	}

	q := u.Query()
	q.Set("max_results", "100")
	if nameFilter != "" {
		q.Set("filter", fmt.Sprintf("name LIKE '%s%%'", nameFilter))
	}
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil
	}
	req.Header.Set("X-MLFLOW-WORKSPACE", namespace)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		RootCAs:            app.rootCAs,
		InsecureSkipVerify: app.config.InsecureSkipVerify, // #nosec G402
		MinVersion:         tls.VersionTLS12,
	}
	httpClient := &http.Client{Transport: transport, Timeout: 10 * time.Second}

	resp, err := httpClient.Do(req)
	if err != nil {
		app.logger.Debug("Search fallback HTTP request failed",
			slog.String("namespace", namespace), slog.Any("error", err))
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		app.logger.Debug("Search fallback returned non-200",
			slog.String("namespace", namespace), slog.Int("status", resp.StatusCode))
		return nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	var searchResp unfilteredSearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		app.logger.Debug("Search fallback failed to parse response",
			slog.String("namespace", namespace), slog.Any("error", err))
		return nil
	}

	var prompts []models.Prompt
	for _, rm := range searchResp.RegisteredModels {
		if !rm.hasTag("mlflow.prompt.is_prompt", "true") {
			continue
		}
		p := models.Prompt{
			Name:        rm.Name,
			Description: rm.Description,
		}
		if rm.CreationTimestamp > 0 {
			p.CreationTimestamp = time.UnixMilli(rm.CreationTimestamp)
		}
		if len(rm.LatestVersions) > 0 {
			maxVer := 0
			for _, lv := range rm.LatestVersions {
				if v, _ := strconv.Atoi(lv.Version); v > maxVer {
					maxVer = v
				}
			}
			p.LatestVersion = maxVer
		}
		prompts = append(prompts, p)
	}

	if len(prompts) > 0 {
		app.logger.Info("Search fallback discovered prompts in global namespace",
			slog.String("namespace", namespace), slog.Int("count", len(prompts)))
	}

	return prompts
}

type unfilteredSearchResponse struct {
	RegisteredModels []unfilteredRegisteredModel `json:"registered_models"`
}

type unfilteredRegisteredModel struct {
	Name             string                        `json:"name"`
	Description      string                        `json:"description"`
	CreationTimestamp int64                         `json:"creation_timestamp"`
	Tags             []unfilteredRegisteredModelTag `json:"tags"`
	LatestVersions   []unfilteredModelVersion       `json:"latest_versions"`
}

type unfilteredRegisteredModelTag struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type unfilteredModelVersion struct {
	Version string `json:"version"`
}

func (rm *unfilteredRegisteredModel) hasTag(key, value string) bool {
	for _, tag := range rm.Tags {
		if tag.Key == key && tag.Value == value {
			return true
		}
	}
	return false
}
