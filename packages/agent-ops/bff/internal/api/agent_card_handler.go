package api

import (
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type AgentCardEnvelope Envelope[*models.AgentCard, None]

// GetAgentCardHandler handles GET /api/v1/agents/cards/:ns/:name.
func (app *App) GetAgentCardHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Fetching agent card", slog.String("namespace", namespace), slog.String("name", name))

	result, err := app.repositories.AgentRuntimes.GetAgentCard(r.Context(), namespace, name)
	if err != nil {
		logger.Error("Failed to get agent card",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	logger.Info("Agent card retrieved successfully",
		slog.String("namespace", namespace),
		slog.String("name", name),
		slog.String("version", result.Version))

	envelope := AgentCardEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Int("status", http.StatusOK),
			slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
	}
}
