package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type SecretsEnvelope Envelope[[]models.SecretListItem, None]

// GetSecretsHandler retrieves secrets from a namespace with optional filtering based on type.
// Query parameters:
//   - namespace (required): The namespace name to query secrets from
//   - type (optional): Filter type - "storage" for AWS secrets, or empty for all secrets
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Get namespace from context (set by AttachNamespace middleware)
	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	// Parse type (optional, default to empty string which means all secrets)
	secretType := r.URL.Query().Get("type")
	// Validate type parameter
	if secretType != "" && secretType != "storage" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'type' must be 'storage' or omitted"))
		return
	}

	// Call repository which uses autox-core for fetching and applies module-specific filtering
	secrets, err := app.repositories.Secret.GetFilteredSecrets(app.k8sService, ctx, namespace, secretType)
	if err != nil {
		// Check for specific domain errors from autox-core
		switch {
		case errors.Is(err, corek8s.ErrNotFound):
			app.notFoundResponseWithMessage(w, r, fmt.Sprintf("namespace '%s' does not exist or is not accessible", namespace))
			return
		case errors.Is(err, corek8s.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to access secrets in this namespace")
			return
		case errors.Is(err, corek8s.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
			return
		case errors.Is(err, corek8s.ErrInvalid), errors.Is(err, corek8s.ErrBadRequest):
			app.badRequestResponse(w, r, fmt.Errorf("invalid request for namespace '%s'", namespace))
			return
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	// Return response with envelope pattern
	secretsEnvelope := SecretsEnvelope{
		Data: secrets,
	}

	err = app.WriteJSON(w, http.StatusOK, secretsEnvelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
