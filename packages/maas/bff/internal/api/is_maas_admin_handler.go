package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
)

const (
	maasAdminGroup     = "maas.opendatahub.io"
	maasAdminResource  = "maasauthpolicies"
	maasAdminVerb      = "create"
	maasAdminNamespace = "models-as-a-service"
)

// IsMaasAdminHandler handles GET /api/v1/is-maas-admin
// It checks whether the requesting user can create maasauthpolicies in the
// models-as-a-service namespace, which is the signal for MaaS admin access.
//
// Token selection follows the same priority as AccessReviewHandler:
//  1. Authorization: Bearer <token> — correctly substituted when using ODH impersonation
//  2. x-forwarded-access-token — fallback for standalone federated dev mode
func IsMaasAdminHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	token := extractBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		token = r.Header.Get("x-forwarded-access-token")
	}
	if token == "" {
		app.badRequestResponse(w, r, fmt.Errorf("no authentication token found in Authorization or x-forwarded-access-token headers"))
		return
	}

	client, err := k8s.NewTokenKubernetesClient(token, app.logger)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create Kubernetes client: %w", err))
		return
	}

	allowed, err := client.CheckSelfAccess(ctx, maasAdminGroup, maasAdminResource, maasAdminVerb, maasAdminNamespace)
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
