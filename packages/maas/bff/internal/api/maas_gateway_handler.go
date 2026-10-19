package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// GetMaaSGatewayURLHandler returns the externally reachable MaaS API base URL
// discovered from the maas-default-gateway tenant.
func GetMaaSGatewayURLHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if app.maasApiURL == nil {
		app.serviceUnavailableResponse(w, r, "maas-api is not available")
		return
	}
	maasAPIURL, ok := app.maasApiURL.URL()
	if !ok {
		app.serviceUnavailableResponse(w, r, "maas-api is not available")
		return
	}

	response := Envelope[models.MaaSGatewayURLResponse, None]{
		Data: models.MaaSGatewayURLResponse{URL: maasAPIURL},
	}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
