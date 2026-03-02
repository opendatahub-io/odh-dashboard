package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

const (
	defaultProvidersLimit = 50
	maxProvidersLimit     = 100
)

type ProvidersEnvelope Envelope[evalhub.ProvidersResponse, None]

func (app *App) ProvidersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	// Parse pagination query parameters, matching the official eval-hub API spec.
	limit := defaultProvidersLimit
	offset := 0

	if v := r.URL.Query().Get("limit"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 || parsed > maxProvidersLimit {
			app.badRequestResponse(w, r, fmt.Errorf("limit must be an integer between 1 and %d", maxProvidersLimit))
			return
		}
		limit = parsed
	}

	if v := r.URL.Query().Get("offset"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("offset must be a non-negative integer"))
			return
		}
		offset = parsed
	}

	result, err := client.ListProviders(ctx, limit, offset)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list providers: %w", err))
		return
	}

	envelope := ProvidersEnvelope{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
