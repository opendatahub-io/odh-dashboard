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

	isAdmin := false
	if whoAmI.Orgs != nil && len(*whoAmI.Orgs) > 0 {
		for _, org := range *whoAmI.Orgs {
			for _, role := range org.Roles {
				if role == "admins" {
					isAdmin = true
					break
				}
			}
			if isAdmin {
				break
			}
		}
	} else {
		isAdmin, err = app.repositories.APIKeys.HasSubscriptionAdminSignal(r.Context())
		if err != nil {
			app.logger.Warn("Failed to check MaaS subscription admin signal", "error", err)
		}
	}

	response := WhoAmIEnvelope{Data: &models.MaaSWhoAmI{
		Sub: whoAmI.Sub, Email: whoAmI.Email, Name: whoAmI.Name, IsAdmin: isAdmin,
	}}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
