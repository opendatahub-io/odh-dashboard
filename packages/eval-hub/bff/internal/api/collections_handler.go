package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

type CollectionsEnvelope Envelope[evalhub.CollectionsResponse, None]
type CollectionEnvelope Envelope[evalhub.Collection, None]

func validateCollectionPatchOperations(operations []evalhub.CollectionPatchOperation) error {
	if len(operations) == 0 {
		return fmt.Errorf("at least one patch operation is required")
	}

	for index, operation := range operations {
		if operation.Op != "add" && operation.Op != "replace" && operation.Op != "remove" {
			return fmt.Errorf("invalid patch operation at index %d: op must be add, replace, or remove", index)
		}
		if strings.TrimSpace(operation.Path) == "" {
			return fmt.Errorf("invalid patch operation at index %d: path is required", index)
		}
		if (operation.Op == "add" || operation.Op == "replace") && len(operation.Value) == 0 {
			return fmt.Errorf("invalid patch operation at index %d: value is required for %s", index, operation.Op)
		}
		if operation.Op == "remove" && len(operation.Value) > 0 {
			return fmt.Errorf("invalid patch operation at index %d: value is not allowed for remove", index)
		}
	}

	return nil
}

// benchmarkWriteTracker tracks which benchmark positions in the patched
// collection were written by the patch operations. Positions shift as add and
// remove operations change the array, so operations are replayed in order.
// Whole-array writes conservatively mark every resulting benchmark as written.
type benchmarkWriteTracker struct {
	all     bool
	indices map[int]struct{}
	length  int
}

func newBenchmarkWriteTracker(length int) *benchmarkWriteTracker {
	return &benchmarkWriteTracker{indices: make(map[int]struct{}), length: length}
}

// written reports whether the benchmark at the given patched index must be
// validated.
func (t *benchmarkWriteTracker) written(index int) bool {
	if t.all {
		return true
	}
	_, ok := t.indices[index]
	return ok
}

func (t *benchmarkWriteTracker) markAll() {
	t.all = true
}

func (t *benchmarkWriteTracker) mark(index int) {
	if !t.all {
		t.indices[index] = struct{}{}
	}
}

// insert records an add at index, shifting existing marks at or past index up.
func (t *benchmarkWriteTracker) insert(index int) {
	t.length++
	if t.all {
		return
	}
	shifted := make(map[int]struct{}, len(t.indices)+1)
	for i := range t.indices {
		if i >= index {
			i++
		}
		shifted[i] = struct{}{}
	}
	shifted[index] = struct{}{}
	t.indices = shifted
}

// removeAt records a remove at index, dropping its mark and shifting marks past
// index down.
func (t *benchmarkWriteTracker) removeAt(index int) {
	t.length--
	if t.all {
		return
	}
	shifted := make(map[int]struct{}, len(t.indices))
	for i := range t.indices {
		switch {
		case i == index:
		case i > index:
			shifted[i-1] = struct{}{}
		default:
			shifted[i] = struct{}{}
		}
	}
	t.indices = shifted
}

// apply replays a single patch operation against the tracker.
func (t *benchmarkWriteTracker) apply(op, path string) {
	if path == "/benchmarks" {
		// Whole-array operations rewrite every benchmark.
		t.markAll()
		return
	}
	rest, ok := strings.CutPrefix(path, "/benchmarks/")
	if !ok {
		return // the operation does not touch the benchmarks array
	}
	token, field, deeper := strings.Cut(rest, "/")
	if token == "-" {
		if op == "add" {
			t.insert(t.length)
		} else {
			// '-' is only valid for add; anything else fails to apply.
			t.markAll()
		}
		return
	}
	index, err := strconv.Atoi(token)
	if err != nil || index < 0 {
		t.markAll()
		return
	}
	if deeper {
		// A write inside an existing benchmark object; the array is unchanged.
		// Only writes to the test data reference itself (or a field inside it)
		// require validation — edits to unrelated fields such as weight must
		// not re-validate an unchanged legacy reference.
		if field == "test_data_ref" || strings.HasPrefix(field, "test_data_ref/") {
			t.mark(index)
		}
		return
	}
	switch op {
	case "add":
		t.insert(index)
	case "remove":
		t.removeAt(index)
	default:
		t.mark(index)
	}
}

// validatePatchedBenchmarks applies the patch operations to the current
// collection's original upstream JSON and validates the test data references
// of benchmarks the patch added or changed, so a patch cannot bypass the
// checks that create and clone enforce (e.g. embedded Git credentials or
// non-HTTPS URLs with a secret reference) while edits that leave other stored
// references untouched are not blocked by them. The original JSON is used
// rather than a re-marshal of the decoded collection because re-marshaling
// drops nullable and unknown fields, which can make valid patches fail to
// apply. Patches that do not touch the benchmarks are passed through without
// applying them.
func validatePatchedBenchmarks(currentJSON json.RawMessage, current *evalhub.Collection, operations []evalhub.CollectionPatchOperation) error {
	tracker := newBenchmarkWriteTracker(len(current.Benchmarks))
	touchesBenchmarks := false
	for _, operation := range operations {
		if operation.Path == "/benchmarks" || strings.HasPrefix(operation.Path, "/benchmarks/") {
			touchesBenchmarks = true
			tracker.apply(operation.Op, operation.Path)
		}
	}
	if !touchesBenchmarks {
		return nil
	}

	operationsJSON, err := json.Marshal(operations)
	if err != nil {
		return fmt.Errorf("failed to encode patch operations: %w", err)
	}
	patch, err := jsonpatch.DecodePatch(operationsJSON)
	if err != nil {
		return fmt.Errorf("failed to decode patch operations: %w", err)
	}
	patchedJSON, err := patch.Apply(currentJSON)
	if err != nil {
		return fmt.Errorf("patch does not apply to the current collection: %w", err)
	}

	var patched evalhub.Collection
	if err := json.Unmarshal(patchedJSON, &patched); err != nil {
		return fmt.Errorf("failed to decode patched collection: %w", err)
	}
	for index, benchmark := range patched.Benchmarks {
		if !tracker.written(index) {
			continue
		}
		if err := benchmark.TestDataRef.Validate(); err != nil {
			id := benchmark.ID
			if id == "" {
				id = strconv.Itoa(index)
			}
			return fmt.Errorf("benchmark %s: %w", id, err)
		}
	}
	return nil
}

func (app *App) PatchCollectionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := strings.TrimPrefix(ps.ByName("id"), "/")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("collection id is required"))
		return
	}

	var operations []evalhub.CollectionPatchOperation
	if err := app.ReadJSON(w, r, &operations); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if err := validateCollectionPatchOperations(operations); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	currentCollection, currentJSON, err := client.GetCollection(ctx, id, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to check collection before patch")
		return
	}
	if currentCollection == nil {
		app.notFoundResponse(w, r)
		return
	}
	if currentCollection.Status != nil && currentCollection.Status.RunCount > 0 {
		app.conflictResponse(w, r, fmt.Errorf("collection cannot be edited after it has been run"))
		return
	}
	if err := validatePatchedBenchmarks(currentJSON, currentCollection, operations); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	collection, err := client.PatchCollection(ctx, id, namespace, operations)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to patch collection")
		return
	}
	if collection == nil {
		app.notFoundResponse(w, r)
		return
	}

	if collection.Resource.ID == "" || collection.Name == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned collection with missing required fields (id=%q, name=%q)", collection.Resource.ID, collection.Name))
		return
	}

	envelope := CollectionEnvelope{Data: *collection}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) DeleteCollectionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := strings.TrimPrefix(ps.ByName("id"), "/")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("collection id is required"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if err := client.DeleteCollection(ctx, id, namespace); err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to delete collection")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (app *App) GetCollectionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := strings.TrimPrefix(ps.ByName("id"), "/")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("collection id is required"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	collection, _, err := client.GetCollection(ctx, id, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get collection")
		return
	}
	if collection == nil {
		app.notFoundResponse(w, r)
		return
	}

	if collection.Resource.ID == "" || collection.Name == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned collection with missing required fields (id=%q, name=%q)", collection.Resource.ID, collection.Name))
		return
	}

	envelope := CollectionEnvelope{Data: *collection}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) CollectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	query := r.URL.Query()
	sortBy := query.Get("sort_by")
	if sortBy != "" && sortBy != "curation_order" {
		app.badRequestResponse(w, r, fmt.Errorf("invalid sort_by parameter: must be curation_order"))
		return
	}

	// The dashboard keeps "curated" as a UI-facing scope, while the deployed
	// EvalHub API exposes those system-owned collections as "system".
	scope := query.Get("scope")
	if scope == "curated" {
		scope = "system"
	}

	params := evalhub.ListCollectionsParams{
		Namespace:         query.Get("namespace"),
		Name:              query.Get("name"),
		Category:          query.Get("category"),
		Tags:              query.Get("tags"),
		Scope:             scope,
		SortBy:            sortBy,
		Domains:           query.Get("domains"),
		Industries:        query.Get("industries"),
		EvaluationTargets: query.Get("evaluation_targets"),
	}

	if limitStr := query.Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid limit parameter: must be a positive integer"))
			return
		}
		params.Limit = limit
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("invalid offset parameter: must be a non-negative integer"))
			return
		}
		params.Offset = offset
	}

	result, err := client.ListCollections(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list collections: %w", err))
		return
	}

	envelope := CollectionsEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) CreateCollectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	var input evalhub.CreateCollectionRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(input.Name) == "" {
		app.badRequestResponse(w, r, fmt.Errorf("name is required"))
		return
	}
	if len(input.Benchmarks) == 0 {
		app.badRequestResponse(w, r, fmt.Errorf("at least one benchmark is required"))
		return
	}
	for _, benchmark := range input.Benchmarks {
		if strings.TrimSpace(benchmark.ID) == "" {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark id is required"))
			return
		}
		if benchmark.Weight < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark weight must be non-negative"))
			return
		}
		if err := benchmark.TestDataRef.Validate(); err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark %s: %w", benchmark.ID, err))
			return
		}
	}
	// TODO: Remove this temporary mapping once the EvalHub API is deployed.
	input.Category = strings.TrimSpace(input.Category)
	if input.Category == "" && len(input.Domains) > 0 {
		input.Category = strings.TrimSpace(input.Domains[0])
	}

	collection, err := client.CreateCollection(ctx, namespace, input)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to create collection")
		return
	}
	if collection == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned empty response for collection"))
		return
	}

	if collection.Resource.ID == "" || collection.Name == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned collection with missing required fields (id=%q, name=%q)", collection.Resource.ID, collection.Name))
		return
	}

	envelope := CollectionEnvelope{Data: *collection}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) CloneCollectionHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := strings.TrimSuffix(ps.ByName("id"), "/")
	if !strings.HasSuffix(id, "/clones") {
		app.notFoundResponse(w, r)
		return
	}
	id = strings.TrimPrefix(strings.TrimSuffix(id, "/clones"), "/")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("collection id is required"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	var input evalhub.CloneCollectionRequest
	if r.Body != http.NoBody {
		var request *evalhub.CloneCollectionRequest
		if err := app.ReadJSON(w, r, &request); err != nil {
			if !errors.Is(err, errEmptyBody) {
				app.badRequestResponse(w, r, err)
				return
			}
		} else if request == nil {
			app.badRequestResponse(w, r, fmt.Errorf("body must not be null"))
			return
		} else {
			input = *request
		}
	}
	for _, benchmark := range input.Benchmarks {
		if strings.TrimSpace(benchmark.ID) == "" {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark id is required"))
			return
		}
		if benchmark.Weight < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark weight must be non-negative"))
			return
		}
		if err := benchmark.TestDataRef.Validate(); err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("benchmark %s: %w", benchmark.ID, err))
			return
		}
	}

	collection, err := client.CloneCollection(ctx, id, namespace, input)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to clone collection")
		return
	}
	if collection == nil {
		app.notFoundResponse(w, r)
		return
	}

	if collection.Resource.ID == "" || collection.Name == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned cloned collection with missing required fields (id=%q, name=%q)", collection.Resource.ID, collection.Name))
		return
	}

	envelope := CollectionEnvelope{Data: *collection}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
