package api

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

	collection, err := client.GetCollection(ctx, id, namespace)
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

	params := evalhub.ListCollectionsParams{
		Namespace:  query.Get("namespace"),
		Name:       query.Get("name"),
		Category:   query.Get("category"),
		Tags:       query.Get("tags"),
		Scope:      query.Get("scope"),
		SortBy:     sortBy,
		Domains:    query.Get("domains"),
		Industries: query.Get("industries"),
		AIEntities: query.Get("ai_entities"),
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
