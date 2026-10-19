package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type MeEnvelope Envelope[*models.MaaSCallerIdentity, None]

// GetMeHandler handles GET /api/v1/me.
func GetMeHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	me, err := app.repositories.APIKeys.GetMe(r.Context())
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

	response := MeEnvelope{Data: me}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
