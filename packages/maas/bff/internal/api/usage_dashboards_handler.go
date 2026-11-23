package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

type usageDashboardsEnvelope struct {
	Data []map[string]any `json:"data"`
}

// GetUsageDashboardsHandler authenticates the caller before any dashboard read.
func GetUsageDashboardsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil || app.kubernetesClientFactory.ValidateRequestIdentity(identity) != nil {
		app.errorResponse(w, r, &HTTPError{StatusCode: http.StatusUnauthorized, Error: ErrorPayload{
			Code: strconv.Itoa(http.StatusUnauthorized), Message: "Authentication required",
		}})
		return
	}

	whoAmI, err := resolveMaaSWhoAmI(app, r)
	if err != nil {
		var upstreamErr *maas.MaasUpstreamError
		if errors.As(err, &upstreamErr) && (upstreamErr.StatusCode == http.StatusUnauthorized || upstreamErr.StatusCode == http.StatusForbidden) {
			app.errorResponse(w, r, &HTTPError{StatusCode: upstreamErr.StatusCode, Error: ErrorPayload{
				Code: strconv.Itoa(upstreamErr.StatusCode), Message: "Access denied",
			}})
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	dashboards, err := app.repositories.UsageDashboards.List(r.Context(), whoAmI)
	if err != nil {
		switch {
		case errors.Is(err, repositories.ErrInvalidMaaSUser):
			app.forbiddenResponse(w, r, err.Error())
		case errors.Is(err, repositories.ErrPersesNamespaceNotConfigured):
			app.serviceUnavailableResponse(w, r, err.Error())
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	if err := app.WriteJSON(w, http.StatusOK, usageDashboardsEnvelope{Data: dashboards}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
