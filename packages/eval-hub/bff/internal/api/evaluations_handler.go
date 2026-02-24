package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

type EvaluationJobsEnvelope Envelope[[]evalhub.EvaluationJob, None]

func (app *App) EvaluationJobsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	jobs, err := client.ListEvaluationJobs(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to list evaluation jobs: %w", err))
		return
	}

	envelope := EvaluationJobsEnvelope{Data: jobs}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
