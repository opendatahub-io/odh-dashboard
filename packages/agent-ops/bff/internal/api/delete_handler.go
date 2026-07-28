package api

import (
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
)

func (app *App) DeleteAgentHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Deleting agent", slog.String("namespace", namespace), slog.String("name", name))

	if err := app.repositories.AgentRuntimes.DeleteAgent(r.Context(), namespace, name); err != nil {
		logger.Error("Failed to delete agent",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	logger.Info("Agent deleted", slog.String("namespace", namespace), slog.String("name", name))
	w.WriteHeader(http.StatusNoContent)
}
