package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
)

type AgentRuntimesEnvelope Envelope[*models.AgentRuntimesResponse, None]

func parseListAgentRuntimesOptions(r *http.Request) (models.ListAgentRuntimesOptions, error) {
	opts := models.ListAgentRuntimesOptions{
		Namespace:     r.URL.Query().Get("namespace"),
		Limit:         repositories.DefaultAgentRuntimesLimit,
		ContinueToken: r.URL.Query().Get("continueToken"),
	}

	if ns := opts.Namespace; ns != "" {
		if !isValidDNS1123Label(ns) {
			return models.ListAgentRuntimesOptions{}, fmt.Errorf("invalid namespace %q: must match RFC 1123 label format (lowercase alphanumeric and hyphens, max 63 chars)", ns)
		}
	}

	limitValue := r.URL.Query().Get("limit")
	if limitValue == "" {
		return opts, nil
	}

	limit, err := strconv.Atoi(limitValue)
	if err != nil || limit < 1 || limit > repositories.MaxAgentRuntimesLimit {
		return models.ListAgentRuntimesOptions{}, fmt.Errorf("limit must be an integer between 1 and %d", repositories.MaxAgentRuntimesLimit)
	}

	opts.Limit = limit
	return opts, nil
}

// ListAgentRuntimesHandler handles GET /api/v1/agents/runtimes.
func (app *App) ListAgentRuntimesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Listing agent runtimes", slog.String("method", r.Method), slog.String("path", r.URL.Path))

	opts, err := parseListAgentRuntimesOptions(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.AgentRuntimes.ListAgentRuntimes(r.Context(), opts)
	if err != nil {
		logger.Error("Failed to list agent runtimes",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Any("error", err))
		if errors.Is(err, repositories.ErrInvalidContinueToken) {
			app.badRequestResponse(w, r, err)
			return
		}
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
