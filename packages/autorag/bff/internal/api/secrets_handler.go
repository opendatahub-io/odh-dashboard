package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type SecretsEnvelope Envelope[[]models.SecretListItem, None]

// GetSecretsHandler retrieves secrets from a namespace filtered by the presence of aws_access_key_id key.
// Query parameters:
//   - resource (required): The namespace name to query secrets from
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
	secrets, err := app.repositories.Secret.GetFilteredSecrets(client, ctx, namespace, identity, limit, offset)
	if err != nil {
		// Check if it's a namespace not found error
		if isNamespaceNotFoundError(err) {
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

// isNamespaceNotFoundError checks if the error indicates a namespace was not found
func isNamespaceNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	return containsAny(errMsg, []string{
		"does not exist",
		"not found",
		"not accessible",
	})
}

// containsAny checks if a string contains any of the given substrings
func containsAny(s string, substrs []string) bool {
	for _, substr := range substrs {
		if len(s) >= len(substr) {
			for i := 0; i <= len(s)-len(substr); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
		}
	}
	return false
}
