package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type AgentRuntimesEnvelope Envelope[*models.AgentRuntimesResponse, None]

// ListAgentRuntimesHandler handles GET /api/v1/agents/runtimes.
func (app *App) ListAgentRuntimesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Listing agent runtimes", slog.String("method", r.Method), slog.String("path", r.URL.Path))

	result, err := app.repositories.AgentRuntimes.ListAgentRuntimes(r.Context())
	if err != nil {
		logger.Error("Failed to list agent runtimes",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}
	if result == nil {
		err = fmt.Errorf("agent runtimes repository returned nil result without error")
		logger.Error("Invalid repository contract",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Any("error", err))
		app.serverErrorResponse(w, r, err)
		return
	}

	resultCount := 0
	if result != nil && result.Runtimes != nil {
		resultCount = len(result.Runtimes)
	}
	logger.Info("Agent runtimes listed successfully",
		slog.Int("result_count", resultCount))

	envelope := AgentRuntimesEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", http.StatusOK),
			slog.Any("error", err))
	}
}
