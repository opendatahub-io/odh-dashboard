package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

type CollectionsEnvelope Envelope[evalhub.CollectionsResponse, None]

func (app *App) CollectionsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	query := r.URL.Query()

	params := evalhub.ListCollectionsParams{
		Namespace: query.Get("namespace"),
		Name:      query.Get("name"),
		Category:  query.Get("category"),
		Tags:      query.Get("tags"),
		Scope:     query.Get("scope"),
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
