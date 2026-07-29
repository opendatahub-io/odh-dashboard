package api

import (
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type DeployAgentEnvelope Envelope[*models.DeployAgentResponse, None]

// DeployAgentHandler handles POST /api/v1/agents/deploy.
func (app *App) DeployAgentHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)
	logger.Info("Deploying agent", slog.String("method", r.Method), slog.String("path", r.URL.Path))

	var req models.DeployAgentRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	applyDeployDefaults(&req)

	if err := validateDeployRequest(&req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	params := mapDeployRequestToParams(&req)

	result, err := app.repositories.AgentRuntimes.DeployAgent(ctx, params)
	if err != nil {
		logger.Error("Failed to deploy agent",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Any("error", err))
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	logger.Info("Agent deployed successfully",
		slog.String("name", result.Name),
		slog.String("namespace", result.Namespace))

	envelope := DeployAgentEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusCreated, envelope, nil); err != nil {
		logger.Error("Failed to write JSON response",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", http.StatusCreated),
			slog.Any("error", err))
	}
}
