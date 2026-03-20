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
type EvaluationJobEnvelope Envelope[evalhub.EvaluationJob, None]
type CreateEvaluationJobEnvelope Envelope[evalhub.EvaluationJob, None]
type CancelEvaluationJobEnvelope Envelope[string, None]

func (app *App) CancelEvaluationJobHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := ps.ByName("id")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("evaluation job id is required"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	hardDeleteVal := r.URL.Query().Get("hard_delete")
	var hardDelete bool
	switch hardDeleteVal {
	case "", "false":
		hardDelete = false
	case "true":
		hardDelete = true
	default:
		app.badRequestResponse(w, r, fmt.Errorf("hard_delete must be \"true\" or \"false\""))
		return
	}

	if err := client.CancelEvaluationJob(ctx, id, namespace, hardDelete); err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to cancel evaluation job")
		return
	}

	envelope := CancelEvaluationJobEnvelope{Data: "ok"}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) GetEvaluationJobHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	id := ps.ByName("id")
	if id == "" {
		app.badRequestResponse(w, r, fmt.Errorf("evaluation job id is required"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	job, err := client.GetEvaluationJob(ctx, id, namespace)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get evaluation job")
		return
	}
	if job == nil {
		app.notFoundResponse(w, r)
		return
	}

	envelope := EvaluationJobEnvelope{Data: *job}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) CreateEvaluationJobHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	var input evalhub.CreateEvaluationJobRequest
	if err := app.ReadJSON(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("name is required"))
		return
	}
	if input.Model.Name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("model name is required"))
		return
	}

	job, err := client.CreateEvaluationJob(ctx, namespace, input)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to create evaluation job")
		return
	}
	if job == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("upstream returned empty response for evaluation job"))
		return
	}

	envelope := CreateEvaluationJobEnvelope{Data: *job}
	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *App) EvaluationJobsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	client, ok := ctx.Value(constants.EvalHubClientKey).(evalhub.EvalHubClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("EvalHub client not available in context"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

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
		Namespace: namespace,
		Limit:     q.Get("limit"),
		Offset:    q.Get("offset"),
		Status:    q.Get("status"),
		Name:      q.Get("name"),
		Tags:      q.Get("tags"),
	}

	jobs, err := client.ListEvaluationJobs(ctx, params)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to list evaluation jobs")
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
