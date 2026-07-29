package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
)

type LifecycleActionResponseBody struct {
	Success   bool   `json:"success"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Action    string `json:"action"`
	Message   string `json:"message"`
}

type LifecycleActionEnvelope Envelope[*LifecycleActionResponseBody, None]

func (app *App) StopAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	app.handleLifecycleAction(w, r, ps, "stop", app.repositories.AgentRuntimes.StopAgent)
}

func (app *App) StartAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	app.handleLifecycleAction(w, r, ps, "start", app.repositories.AgentRuntimes.StartAgent)
}

func (app *App) RestartAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	app.handleLifecycleAction(w, r, ps, "restart", app.repositories.AgentRuntimes.RestartAgent)
}

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
	logger.Info(fmt.Sprintf("Agent %s requested", action),
		slog.String("namespace", namespace),
		slog.String("name", name))

	if err := repoFn(r.Context(), namespace, name); err != nil {
		logger.Error(fmt.Sprintf("Failed to %s agent", action),
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	envelope := LifecycleActionEnvelope{
		Data: &LifecycleActionResponseBody{
			Success:   true,
			Name:      name,
			Namespace: namespace,
			Action:    action,
			Message:   fmt.Sprintf("Agent %s completed successfully", action),
		},
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write response", slog.Any("error", err))
	}
}
