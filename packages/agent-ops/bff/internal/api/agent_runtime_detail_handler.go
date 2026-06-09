package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type AgentRuntimeDetailEnvelope Envelope[*models.AgentRuntimeDetail, None]

// GetAgentRuntimeDetailHandler handles GET /api/v1/agents/runtimes/:ns/:name.
func (app *App) GetAgentRuntimeDetailHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Fetching agent runtime detail", slog.String("namespace", namespace), slog.String("name", name))

	result, err := app.repositories.AgentRuntimes.GetAgentRuntimeDetail(r.Context(), namespace, name)
	if err != nil {
		logger.Error("Failed to get agent runtime detail",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}
	if result == nil {
		err = fmt.Errorf("agent runtime detail repository returned nil result without error for namespace=%q name=%q", namespace, name)
		logger.Error("Invalid repository contract",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	envelope := AgentRuntimeDetailEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Int("status", http.StatusOK),
			slog.Any("error", err))
	}
}
