package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

const collectionGenerationPath = "/evaluations/collections/generation"

type CollectionGenerationEnvelope Envelope[evalhub.CollectionGenerationResource, None]

// collectionRouteTail returns the unescaped route tail after /evaluations/collections/.
// Inspecting EscapedPath keeps IDs containing encoded slashes on the legacy collection path.
func collectionRouteTail(r *http.Request) (string, bool) {
	path := r.URL.EscapedPath()
	prefix := ApiPathPrefix + "/evaluations/collections/"
	index := strings.Index(path, prefix)
	if index < 0 {
		return "", false
	}
	return path[index+len(prefix):], true
}

func isCollectionGenerationPath(tail string) bool {
	return tail == "generation" || strings.HasPrefix(tail, "generation/")
}

// CollectionGetByIDHandler routes the reserved generation poll path before the
// catch-all collection ID handler while retaining encoded-slash collection IDs.
func (app *App) CollectionGetByIDHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	tail, ok := collectionRouteTail(r)
	if ok && strings.HasPrefix(tail, "generation/") {
		encodedID := strings.TrimPrefix(tail, "generation/")
		if encodedID == "" || strings.Contains(encodedID, "/") {
			app.notFoundResponse(w, r)
			return
		}
		id, err := url.PathUnescape(encodedID)
		if err != nil || strings.TrimSpace(id) == "" || strings.Contains(id, "/") {
			app.badRequestResponse(w, r, fmt.Errorf("invalid collection generation id"))
			return
		}
		app.GetCollectionGenerationHandler(w, r, id)
		return
	}
	if ok && tail == "generation" {
		app.methodNotAllowedResponse(w, r)
		return
	}
	app.GetCollectionHandler(w, r, ps)
}

// CollectionPostByIDHandler routes collection generation creation before the
// collection clone catch-all. Other paths under /generation remain not found.
func (app *App) CollectionPostByIDHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	tail, ok := collectionRouteTail(r)
	if ok && tail == "generation" {
		app.CreateCollectionGenerationHandler(w, r)
		return
	}
	if ok && strings.HasPrefix(tail, "generation/") {
		app.notFoundResponse(w, r)
		return
	}
	app.CloneCollectionHandler(w, r, ps)
}

func (app *App) CollectionPatchByIDHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if tail, ok := collectionRouteTail(r); ok && isCollectionGenerationPath(tail) {
		app.methodNotAllowedResponse(w, r)
		return
	}
	app.PatchCollectionHandler(w, r, ps)
}

func (app *App) CollectionDeleteByIDHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if tail, ok := collectionRouteTail(r); ok && isCollectionGenerationPath(tail) {
		app.methodNotAllowedResponse(w, r)
		return
	}
	app.DeleteCollectionHandler(w, r, ps)
}

func validateCollectionGenerationRequest(input evalhub.CreateCollectionGenerationRequest) error {
	goalLength := utf8.RuneCountInString(input.EvaluationGoal)
	if strings.TrimSpace(input.EvaluationGoal) == "" {
		return fmt.Errorf("evaluation_goal is required")
	}
	if goalLength > 2000 {
		return fmt.Errorf("evaluation_goal must be at most 2000 characters")
	}
	if strings.TrimSpace(input.Model.Name) == "" {
		return fmt.Errorf("model name is required")
	}
	if strings.TrimSpace(input.Model.URL) == "" {
		return fmt.Errorf("model url is required")
	}
	if input.ProviderFilter != "" && strings.TrimSpace(input.ProviderFilter) == "" {
		return fmt.Errorf("provider_filter must not be blank")
	}
	if input.MaxBenchmarks != nil && (*input.MaxBenchmarks < 1 || *input.MaxBenchmarks > 50) {
		return fmt.Errorf("max_benchmarks must be between 1 and 50")
	}
	if input.Strictness != "" && input.Strictness != "lenient" && input.Strictness != "moderate" && input.Strictness != "strict" {
		return fmt.Errorf("strictness must be lenient, moderate, or strict")
	}
	if input.GenerationEffort != "" && input.GenerationEffort != "low" && input.GenerationEffort != "standard" && input.GenerationEffort != "high" {
		return fmt.Errorf("generation_effort must be low, standard, or high")
	}
	return nil
}

func validateCollectionGenerationID(id string) error {
	if strings.TrimSpace(id) == "" || strings.TrimSpace(id) != id || id == "." || id == ".." ||
		strings.ContainsAny(id, "/\\") || strings.IndexFunc(id, unicode.IsControl) >= 0 {
		return fmt.Errorf("invalid collection generation id")
	}
	return nil
}

func validateCollectionGenerationResource(generation *evalhub.CollectionGenerationResource, namespace string) error {
	if generation == nil {
		return fmt.Errorf("upstream returned an empty collection generation")
	}
	if strings.TrimSpace(generation.Resource.ID) == "" || strings.TrimSpace(generation.Resource.Tenant) == "" ||
		strings.TrimSpace(generation.Resource.Owner) == "" || generation.Resource.CreatedAt == "" || generation.Resource.UpdatedAt == "" {
		return fmt.Errorf("upstream returned collection generation with incomplete resource metadata")
	}
	if generation.Resource.Tenant != namespace {
		return fmt.Errorf("upstream returned collection generation for a different tenant")
	}
	if err := validateCollectionGenerationID(generation.Resource.ID); err != nil {
		return err
	}
	if strings.TrimSpace(generation.Request.EvaluationGoal) == "" || strings.TrimSpace(generation.Request.Model.Name) == "" ||
		strings.TrimSpace(generation.Request.Model.URL) == "" || generation.Request.MaxBenchmarks < 1 || generation.Request.MaxBenchmarks > 50 {
		return fmt.Errorf("upstream returned collection generation with incomplete request summary")
	}
	if generation.Request.Strictness != "lenient" && generation.Request.Strictness != "moderate" && generation.Request.Strictness != "strict" {
		return fmt.Errorf("upstream returned collection generation with invalid strictness")
	}
	if generation.Request.GenerationEffort != "low" && generation.Request.GenerationEffort != "standard" && generation.Request.GenerationEffort != "high" {
		return fmt.Errorf("upstream returned collection generation with invalid generation effort")
	}
	switch generation.Status.State {
	case "pending", "running", "completed", "failed", "cancelled":
	default:
		return fmt.Errorf("upstream returned collection generation with invalid state %q", generation.Status.State)
	}
	hasResult := len(generation.Result) > 0 && string(generation.Result) != "null"
	hasError := len(generation.Status.Error) > 0 && string(generation.Status.Error) != "null"
	hasProgress := len(generation.Status.Progress) > 0 && string(generation.Status.Progress) != "null"
	if generation.Status.State == "completed" && !hasResult {
		return fmt.Errorf("upstream completed collection generation without a result")
	}
	if generation.Status.State != "completed" && hasResult {
		return fmt.Errorf("upstream returned a result for a non-completed collection generation")
	}
	if generation.Status.State == "failed" && !hasError {
		return fmt.Errorf("upstream failed collection generation without an error")
	}
	if generation.Status.State != "failed" && hasError {
		return fmt.Errorf("upstream returned an error for a non-failed collection generation")
	}
	if generation.Status.State != "running" && hasProgress {
		return fmt.Errorf("upstream returned progress for a non-running collection generation")
	}
	return nil
}

func (app *App) CreateCollectionGenerationHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	var input evalhub.CreateCollectionGenerationRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := validateCollectionGenerationRequest(input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	generation, err := client.CreateCollectionGeneration(ctx, namespace, input)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to create collection generation")
		return
	}
	if err := validateCollectionGenerationResource(generation, namespace); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	locationQuery := url.Values{"namespace": []string{namespace}}
	location := PathPrefix + ApiPathPrefix + collectionGenerationPath + "/" + url.PathEscape(generation.Resource.ID) + "?" + locationQuery.Encode()
	w.Header().Set("Location", location)
	if err := app.WriteJSON(w, http.StatusAccepted, CollectionGenerationEnvelope{Data: *generation}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetCollectionGenerationHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}
	if err := validateCollectionGenerationID(id); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	generation, err := client.GetCollectionGeneration(ctx, id, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get collection generation")
		return
	}
	if generation == nil {
		app.notFoundResponse(w, r)
		return
	}
	if generation.Resource.Tenant != namespace {
		app.notFoundResponse(w, r)
		return
	}
	if generation.Resource.ID != id {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned a different collection generation resource"))
		return
	}
	if err := validateCollectionGenerationResource(generation, namespace); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, CollectionGenerationEnvelope{Data: *generation}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
