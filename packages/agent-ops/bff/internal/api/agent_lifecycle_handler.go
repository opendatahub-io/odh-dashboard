package api

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
)

type LifecycleActionEnvelope Envelope[*LifecycleActionResponseBody, None]

type LifecycleActionResponseBody struct {
	Success   bool   `json:"success"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Action    string `json:"action"`
	Message   string `json:"message"`
}

// StopAgentHandler handles POST /api/v1/agents/runtimes/:ns/:name/stop.
func (app *App) StopAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	app.handleLifecycleAction(w, r, ps, "stop", app.repositories.AgentRuntimes.StopAgent)
}

// StartAgentHandler handles POST /api/v1/agents/runtimes/:ns/:name/start.
func (app *App) StartAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	app.handleLifecycleAction(w, r, ps, "start", app.repositories.AgentRuntimes.StartAgent)
}

// handleLifecycleAction is a shared implementation for stop/start handlers.
func (app *App) handleLifecycleAction(
	w http.ResponseWriter,
	r *http.Request,
	ps httprouter.Params,
	action string,
	repoFn func(ctx context.Context, namespace, name string) error,
) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Agent lifecycle action",
		slog.String("action", action),
		slog.String("namespace", namespace),
		slog.String("name", name))

	err := repoFn(r.Context(), namespace, name)
	if err != nil {
		logger.Error("Failed to execute lifecycle action",
			slog.String("action", action),
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	logger.Info("Agent lifecycle action completed",
		slog.String("action", action),
		slog.String("name", name),
		slog.String("namespace", namespace))

	envelope := LifecycleActionEnvelope{
		Data: &LifecycleActionResponseBody{
			Success:   true,
			Name:      name,
			Namespace: namespace,
			Action:    action,
			Message:   "Agent " + action + " completed successfully",
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response",
			slog.String("action", action),
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Int("status", http.StatusOK),
			slog.Any("error", err))
	}
}
