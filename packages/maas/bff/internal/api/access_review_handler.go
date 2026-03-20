package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
)

type AccessReviewRequest struct {
	Group     string `json:"group"`
	Resource  string `json:"resource"`
	Verb      string `json:"verb"`
	Namespace string `json:"namespace,omitempty"`
}

type AccessReviewResult struct {
	Allowed bool `json:"allowed"`
}

// extractBearerToken returns the token from an Authorization: Bearer <token> header value,
// or an empty string if the value is not a Bearer token.
func extractBearerToken(authHeader string) string {
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return ""
}

// AccessReviewHandler handles POST /api/v1/access-review
// It performs a SelfSubjectAccessReview via the BFF's Kubernetes client.
//
// Token selection (in priority order):
//  1. Authorization: Bearer <token> — set by the ODH dashboard backend, and correctly
//     substituted with the impersonated user's token when using the ODH dev impersonation
//     feature (DEV_IMPERSONATE_USER). This ensures the SSAR evaluates the right identity.
//  2. x-forwarded-access-token — fallback for standalone federated dev mode where the
//     webpack proxy injects the real user's token directly.
func AccessReviewHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	token := extractBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		token = r.Header.Get("x-forwarded-access-token")
	}
	if token == "" {
		app.badRequestResponse(w, r, fmt.Errorf("no authentication token found in Authorization or x-forwarded-access-token headers"))
		return
	}

	var request Envelope[AccessReviewRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	client, err := k8s.NewTokenKubernetesClient(token, app.logger)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create Kubernetes client: %w", err))
		return
	}

	allowed, err := client.CheckSelfAccess(ctx, request.Data.Group, request.Data.Resource, request.Data.Verb, request.Data.Namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[AccessReviewResult, None]{
		Data: AccessReviewResult{Allowed: allowed},
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
