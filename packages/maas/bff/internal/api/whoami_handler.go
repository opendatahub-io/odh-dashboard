package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type WhoAmIEnvelope Envelope[*models.MaaSWhoAmI, None]

// GetWhoAmIHandler handles GET /api/v1/whoami.
func GetWhoAmIHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	whoAmI, err := app.repositories.APIKeys.GetWhoAmI(r.Context())
	if err != nil {
		var upstreamErr *maas.MaasUpstreamError
		if errors.As(err, &upstreamErr) {
			switch upstreamErr.StatusCode {
			case http.StatusUnauthorized, http.StatusForbidden:
				app.errorResponse(w, r, &HTTPError{
					StatusCode: upstreamErr.StatusCode,
					Error: ErrorPayload{
						Code:    strconv.Itoa(upstreamErr.StatusCode),
						Message: upstreamErr.Error(),
					},
				})
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	isAdmin, err := getMaaSAdminStatusFromWhoAmI(app, r, whoAmI)
	if err != nil {
		app.logger.Warn("Failed to determine MaaS admin status", "error", err)
	}

	response := WhoAmIEnvelope{Data: &models.MaaSWhoAmI{
		Sub: whoAmI.Sub, Email: whoAmI.Email, Name: whoAmI.Name, IsAdmin: isAdmin,
	}}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func getMaaSAdminStatusFromWhoAmI(
	app *App,
	r *http.Request,
	whoAmI *models.MaaSWhoAmIUpstream,
) (bool, error) {
	isAdmin := false
	if whoAmI.Orgs != nil && len(*whoAmI.Orgs) > 0 {
		for _, org := range *whoAmI.Orgs {
			if hasRole(org.Roles, "admins") {
				isAdmin = true
				break
			}
		}
	} else {
		subscriptions, err := app.repositories.APIKeys.ListSubscriptionsForApiKeys(r.Context())
		if err != nil {
			return false, err
		}
		for _, subscription := range subscriptions {
			if hasRole(subscription.Roles, "admin") {
				isAdmin = true
				break
			}
		}
	}
	return isAdmin, nil
}

func hasRole(roles []string, expected string) bool {
	for _, role := range roles {
		if role == expected {
			return true
		}
	}
	return false
}
