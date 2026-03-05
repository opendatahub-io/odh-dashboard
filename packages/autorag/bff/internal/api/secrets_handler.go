package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

type SecretsEnvelope Envelope[[]models.SecretListItem, None]

// GetSecretsHandler retrieves secrets from a namespace with optional filtering based on type.
// Query parameters:
//   - resource (required): The namespace name to query secrets from
//   - type (optional): Filter type - "storage" for AWS secrets, "lls" for LLS secrets, or empty for all secrets
func (app *App) GetSecretsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Parse query parameters
	queryParams := r.URL.Query()

	// Resource (namespace) is required
	namespace := queryParams.Get("resource")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'resource' is required"))
		return
	}

	// Parse type (optional, default to empty string which means all secrets)
	secretType := queryParams.Get("type")
	// Validate type parameter
	if secretType != "" && secretType != "storage" && secretType != "lls" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'type' must be 'storage', 'lls', or omitted"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Fetch filtered secrets from repository
	secrets, err := app.repositories.Secret.GetFilteredSecrets(client, ctx, namespace, identity, secretType)
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
				app.forbiddenResponse(w, r, err.Error())
				return
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, err.Error())
				return
			}
		}
		app.serverErrorResponse(w, r, err)
		return
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
