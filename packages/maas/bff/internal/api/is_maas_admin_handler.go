package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
)

const (
	maasAdminGroup     = "maas.opendatahub.io"
	maasAdminResource  = "maasauthpolicies"
	maasAdminVerb      = "create"
	maasAdminNamespace = "models-as-a-service"
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

// // extractBearerToken returns the token from an Authorization: Bearer <token> header value,
// // or an empty string if the value is not a Bearer token.
func extractBearerToken(authHeader string) string {
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return ""
}

// requestToken returns the caller token used for SelfSubjectAccessReview checks.
// Priority matches AccessReviewHandler / IsMaasAdminHandler:
//  1. Authorization: Bearer <token> — correctly substituted when using ODH impersonation
//  2. x-forwarded-access-token — fallback for standalone federated dev mode
func requestToken(r *http.Request) string {
	token := extractBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		token = r.Header.Get("x-forwarded-access-token")
	}
	return token
}

// checkIsMaasAdmin reports whether the caller can create maasauthpolicies in the
// models-as-a-service namespace (MaaS admin signal). Returns false when no token
// is present so callers can fall back without failing the request.
func checkIsMaasAdmin(app *App, r *http.Request) (bool, error) {
	token := requestToken(r)
	if token == "" {
		return false, nil
	}

	client, err := k8s.NewTokenKubernetesClient(token, app.logger)
	if err != nil {
		return false, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return client.CheckSelfAccess(r.Context(), maasAdminGroup, maasAdminResource, maasAdminVerb, maasAdminNamespace)
}

// IsMaasAdminHandler handles GET /api/v1/is-maas-admin
// It checks whether the requesting user can create maasauthpolicies in the
// models-as-a-service namespace, which is the signal for MaaS admin access.
func IsMaasAdminHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if requestToken(r) == "" {
		app.badRequestResponse(w, r, fmt.Errorf("no authentication token found in Authorization or x-forwarded-access-token headers"))
		return
	}

	allowed, err := checkIsMaasAdmin(app, r)
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
