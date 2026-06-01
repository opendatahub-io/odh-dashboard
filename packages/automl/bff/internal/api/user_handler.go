package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

type UserEnvelope Envelope[*models.User, None]

func (app *App) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Call autox-core service - single method handles everything
	userInfo, err := app.k8sService.GetUserInfo(r.Context())
	if err != nil {
		// Check for specific domain errors from autox-core
		switch {
		case errors.Is(err, kubernetes.ErrUnauthorized):
			app.unauthorizedResponse(w, r, "access unauthorized")
			return
		case errors.Is(err, kubernetes.ErrForbidden):
			app.forbiddenResponse(w, r, "insufficient permissions to retrieve user information")
			return
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
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
