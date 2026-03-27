package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSModelsHandler handles GET /v1/models.
// Uses the user's OIDC token directly for authentication with the MaaS API,
// bypassing the need to mint an ephemeral API key for model listing.
func (app *App) MaaSModelsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	maasModels, err := app.repositories.MaaSModels.ListModels(ctx, identity.Token)
	if err != nil {
		app.handleMaaSClientError(w, r, err)
		return
	}

	response := models.MaaSModelsResponse{
		Object: "list",
		Data:   maasModels,
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
