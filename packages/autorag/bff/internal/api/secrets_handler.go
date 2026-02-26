package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

type SecretsEnvelope Envelope[[]models.SecretListItem, None]

// GetSecretsHandler retrieves secrets from a namespace with optional filtering based on type.
// Query parameters:
//   - resource (required): The namespace name to query secrets from
//   - type (optional): Filter type - "storage" for AWS secrets, "lls" for LLS secrets, or empty for all secrets
//   - limit (optional): Maximum number of secrets to return (default: all)
//   - offset (optional): Number of secrets to skip for pagination (default: 0)
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

	// Parse limit (optional, default to 0 which means no limit)
	limit := 0
	if limitStr := queryParams.Get("limit"); limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("query parameter 'limit' must be a non-negative integer"))
			return
		}
	}

	// Parse offset (optional, default to 0)
	offset := 0
	if offsetStr := queryParams.Get("offset"); offsetStr != "" {
		var err error
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			app.badRequestResponse(w, r, fmt.Errorf("query parameter 'offset' must be a non-negative integer"))
			return
		}
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Fetch filtered secrets from repository
	secrets, err := app.repositories.Secret.GetFilteredSecrets(client, ctx, namespace, identity, secretType, limit, offset)
	if err != nil {
		// Check if it's a namespace not found error using typed error checking
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) && apierrors.IsNotFound(statusErr) {
			app.badRequestResponse(w, r, fmt.Errorf("namespace '%s' does not exist or is not accessible", namespace))
			return
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
