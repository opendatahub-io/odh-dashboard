package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

func (app *App) GetEvaluationJobLogsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

	params := evalhub.GetJobLogsParams{
		TailLines:    r.URL.Query().Get("tail_lines"),
		Timestamps:   r.URL.Query().Get("timestamps"),
		SinceSeconds: r.URL.Query().Get("since_seconds"),
	}

	logs, err := client.GetEvaluationJobLogs(ctx, id, namespace, params)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get evaluation job logs")
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(logs))
}

func (app *App) GetEvaluationJobBenchmarkLogsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

	benchmarkIndexStr := ps.ByName("benchmark_index")
	benchmarkIndex, err := strconv.Atoi(benchmarkIndexStr)
	if err != nil || benchmarkIndex < 0 {
		app.badRequestResponse(w, r, fmt.Errorf("benchmark_index must be a non-negative integer"))
		return
	}

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	params := evalhub.GetJobLogsParams{
		TailLines:    r.URL.Query().Get("tail_lines"),
		Timestamps:   r.URL.Query().Get("timestamps"),
		SinceSeconds: r.URL.Query().Get("since_seconds"),
	}

	logs, err := client.GetEvaluationJobBenchmarkLogs(ctx, id, benchmarkIndex, namespace, params)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get evaluation job benchmark logs")
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(logs))
}
