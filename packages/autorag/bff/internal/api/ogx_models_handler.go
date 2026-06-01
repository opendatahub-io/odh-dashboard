package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type OGXModelsEnvelope Envelope[*models.OGXModelsData, None]

// OGXModelsHandler handles GET /api/v1/ogx/models
// Returns all available models from Open GenAI Stack Distribution.
func (app *App) OGXModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	secretName := r.URL.Query().Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: secretName"))
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

	modelsData, err := app.repositories.OGXModels.GetOGXModels(ctx, namespace, secretName)
	if err != nil {
		app.handleOGXOrK8sError(w, r, err)
		return
	}

	ogxModelsEnvelope := OGXModelsEnvelope{
		Data: modelsData,
	}

	err = app.WriteJSON(w, http.StatusOK, ogxModelsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
