package api

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

type SecretDataEnvelope Envelope[map[string]string, None]

// GetSecretHandler retrieves OGX credentials (OGX_CLIENT_BASE_URL, OGX_CLIENT_API_KEY) from a named secret, base64-encoded.
func (app *App) GetSecretHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	name := ps.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing secret name in path"))
		return
	}
	if !isValidDNS1123Subdomain(name) {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secret name: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	secret, err := client.GetSecret(ctx, namespace, name, identity)
	if err != nil {
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				httpError := &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("secret '%s' not found in namespace '%s'", name, namespace),
					},
				}
				app.errorResponse(w, r, httpError)
				return
			}
			if apierrors.IsForbidden(statusErr) {
				app.forbiddenResponse(w, r, "insufficient permissions to access this secret")
				return
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, "access unauthorized")
				return
			}
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	ogxKeys := []string{constants.AllowedSecretKey_OGX_Base_URL, constants.AllowedSecretKey_OGX_API_Key}
	data := make(map[string]string, len(ogxKeys))
	for _, key := range ogxKeys {
		if value, ok := secret.Data[key]; ok {
			data[key] = base64.StdEncoding.EncodeToString(value)
		}
	}

	envelope := SecretDataEnvelope{
		Data: data,
	}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	err = app.WriteJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
