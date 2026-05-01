package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type NemoGuardrailsInitEnvelope Envelope[*models.NemoGuardrailsInitModel, None]

// NemoGuardrailsInitHandler handles POST /api/v1/nemo-guardrails/init.
// It creates a placeholder ConfigMap and NemoGuardrails CR in the namespace.
// The actual model, prompts, and API key are supplied at request time via inline
// config in the guardrail/checks call — no per-model K8s resources are needed.
func (app *App) NemoGuardrailsInitHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in the context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.NemoGuardrails.InitNemoGuardrails(client, ctx, namespace)
	if err != nil {
		var alreadyInit *models.ErrNemoGuardrailsAlreadyInitialised
		if errors.As(err, &alreadyInit) {
			app.conflictResponse(w, r, err)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, NemoGuardrailsInitEnvelope{Data: result}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
