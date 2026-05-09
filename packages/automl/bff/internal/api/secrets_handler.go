package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
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
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*corek8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

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

	// Call autox-core service - single method handles everything (validation, fetching, filtering, type detection)
	secretInfos, err := app.k8sService.GetFilteredSecrets(ctx, identity, namespace, secretType)
	if err != nil {
		// Check if it's a Kubernetes API error and handle accordingly
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				httpError := &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("namespace '%s' does not exist or is not accessible", namespace),
					},
				}
				app.errorResponse(w, r, httpError)
				return
			}
			if apierrors.IsForbidden(statusErr) {
				app.forbiddenResponse(w, r, "insufficient permissions to access secrets in this namespace")
				return
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, "access unauthorized")
				return
			}
			if apierrors.IsBadRequest(statusErr) || apierrors.IsInvalid(statusErr) {
				httpError := &integrations.HTTPError{
					StatusCode: http.StatusBadRequest,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusBadRequest),
						Message: fmt.Sprintf("invalid request for namespace '%s'", namespace),
					},
				}
				app.errorResponse(w, r, httpError)
				return
			}
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Convert []SecretInfo to []models.SecretListItem
	secrets := make([]models.SecretListItem, len(secretInfos))
	for i, info := range secretInfos {
		secrets[i] = models.SecretListItem{
			UUID:        info.UUID,
			Name:        info.Name,
			Type:        info.Type,
			Data:        info.Data,
			DisplayName: info.DisplayName,
			Description: info.Description,
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
