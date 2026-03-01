package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

const maxLimit = 100

type EvaluationJobsEnvelope Envelope[[]evalhub.EvaluationJob, None]

func (app *App) EvaluationJobsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	q := r.URL.Query()

	if limitStr := q.Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit < 0 || limit > maxLimit {
			app.badRequestResponse(w, r, fmt.Errorf("limit must be a number between 0 and %d", maxLimit))
			return
		}
	}
	if offsetStr := q.Get("offset"); offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("offset must be a non-negative number"))
			return
		}
	}

	params := evalhub.ListEvaluationJobsParams{
		Namespace: q.Get("namespace"),
		Limit:     q.Get("limit"),
		Offset:    q.Get("offset"),
		Status:    q.Get("status"),
		Name:      q.Get("name"),
		Tags:      q.Get("tags"),
	}

	jobs, err := client.ListEvaluationJobs(ctx, params)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list evaluation jobs: %w", err))
		return
	}

	if jobs == nil {
		jobs = []evalhub.EvaluationJob{}
	}

	envelope := EvaluationJobsEnvelope{Data: jobs}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
