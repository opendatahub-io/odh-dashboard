package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

type UserEnvelope Envelope[*models.User, None]

func (app *App) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*corek8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Call autox-core service - single method handles everything
	userInfo, err := app.k8sService.GetUserInfo(identity)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Convert autox-core type to API model
	user := &models.User{
		UserID:       userInfo.UserID,
		ClusterAdmin: userInfo.ClusterAdmin,
	}

	userRes := UserEnvelope{
		Data: user,
	}

	err = app.WriteJSON(w, http.StatusOK, userRes, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
