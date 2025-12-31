package api

import (
	"context"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GuardrailsStatusEnvelope is the response envelope for guardrails status
type GuardrailsStatusEnvelope = Envelope[models.GuardrailsStatus, None]

// setupGuardrailsEndpoint performs common setup for guardrails endpoints
func (app *App) setupGuardrailsEndpoint(ctx context.Context) (*integrations.RequestIdentity, kubernetes.KubernetesClientInterface, error) {
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		return nil, nil, fmt.Errorf("missing RequestIdentity in context")
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	if app.repositories.Guardrails == nil {
		return nil, nil, fmt.Errorf("guardrails repository not initialized")
	}

	return identity, k8sClient, nil
}

// GuardrailsStatusHandler handles GET /gen-ai/api/v1/guardrails/status
// Returns status of the "custom-guardrails" CR from dashboard namespace
func (app *App) GuardrailsStatusHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	identity, k8sClient, err := app.setupGuardrailsEndpoint(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Fetch from dashboard namespace (opendatahub/redhat-ods-applications)
	status, err := app.repositories.Guardrails.GetGuardrailsStatus(k8sClient, ctx, identity, app.dashboardNamespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := GuardrailsStatusEnvelope{
		Data: *status,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
