package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type AgentDeploymentListEnvelope = Envelope[models.AgentDeploymentListResponse, None]

// ListAgentDeploymentsHandler handles GET /api/v1/agent-deployments.
func (app *App) ListAgentDeploymentsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if !app.isSandboxAvailable() {
		app.sandboxUnavailableResponse(w, r)
		return
	}

	ctx := r.Context()
	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadRequest,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "missing_namespace",
				Message: "namespace parameter is required",
			},
		})
		return
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response, err := k8sClient.ListAgentDeployments(ctx, namespace, r.URL.Query().Get("agentProfileId"))
	if err != nil {
		if httpErr, ok := err.(*integrations.HTTPError); ok {
			switch httpErr.StatusCode {
			case http.StatusForbidden:
				app.forbiddenResponse(w, r, httpErr.Message)
			case http.StatusServiceUnavailable:
				app.errorResponse(w, r, httpErr)
			default:
				app.serverErrorResponse(w, r, httpErr)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, AgentDeploymentListEnvelope{Data: *response}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
