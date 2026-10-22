package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type MeEnvelope Envelope[*models.MaaSCallerIdentity, None]

// localCallerIdentity mirrors the payload in
// internal/integrations/maas/testdata/me-response.json.
func localCallerIdentity() *models.MaaSCallerIdentity {
	return &models.MaaSCallerIdentity{
		Sub:   "00u7a1b2c3d4e5f6g7h8",
		Email: "alix@grid-tenant-1.com",
		Name:  "Alice Smith",
		Orgs: []models.MaaSOrg{
			{
				OrganizationID:   "42c3e46f-2477-44d7-a85b-d3b43f6b31fa",
				OrganizationName: "acme",
				Roles:            []string{},
			},
		},
	}
}

// GetMeHandler handles GET /api/v1/me.
//
// Local development override: it always returns the hard-coded caller identity above instead
// of calling maas-api /v1/me, which answers 401 without a valid MaaS token. Restore the
// upstream call (APIKeysRepository.GetMe) to revert this override.
func GetMeHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	response := MeEnvelope{Data: localCallerIdentity()}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
