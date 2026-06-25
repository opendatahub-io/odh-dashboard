package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
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

	// RBAC: verify the caller can create all agent resources in the target namespace.
	// Skip when auth is disabled (local dev / mock mode) — matches RequireAccessToService pattern.
	if app.config.AuthMethod != config.AuthMethodDisabled {
		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.forbiddenResponse(w, r, "missing request identity")
			return
		}

		k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get kubernetes client: %w", err))
			return
		}

		canDeploy, err := k8sClient.CanDeployAgentInNamespace(ctx, identity, req.Namespace, req.CreateRoute)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("RBAC check failed: %w", err))
			return
		}
		if !canDeploy {
			app.forbiddenResponse(w, r, fmt.Sprintf("user does not have permission to deploy agents in namespace %q", req.Namespace))
			return
		}
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
