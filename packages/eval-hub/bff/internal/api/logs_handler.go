package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

func parseLogQueryParams(query func(string) string) (evalhub.GetJobLogsParams, error) {
	var params evalhub.GetJobLogsParams

	if v := query("tail_lines"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			return params, fmt.Errorf("tail_lines must be a non-negative integer")
		}
		params.TailLines = v
	}

	if v := query("since_seconds"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			return params, fmt.Errorf("since_seconds must be a non-negative integer")
		}
		params.SinceSeconds = v
	}

	if v := query("timestamps"); v != "" {
		if v != "true" && v != "false" {
			return params, fmt.Errorf("timestamps must be a boolean (true or false)")
		}
		params.Timestamps = v
	}

	return params, nil
}

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

	params, err := parseLogQueryParams(r.URL.Query().Get)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logs, err := client.GetEvaluationJobLogs(ctx, id, namespace, params)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get evaluation job logs")
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err = w.Write([]byte(logs)); err != nil {
		app.logger.Error("failed to write job logs response", "error", err)
	}
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

	params, err := parseLogQueryParams(r.URL.Query().Get)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logs, err := client.GetEvaluationJobBenchmarkLogs(ctx, id, benchmarkIndex, namespace, params)
	if err != nil {
		app.evalHubErrorResponse(w, r, err, "failed to get evaluation job benchmark logs")
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if _, err = w.Write([]byte(logs)); err != nil {
		app.logger.Error("failed to write benchmark logs response", "error", err)
	}
}
