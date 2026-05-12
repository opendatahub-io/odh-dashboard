package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type UserEnvelope Envelope[*models.User, None]

func (app *App) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Call autox-core service - single method handles everything
	userInfo, err := app.k8sService.GetUserInfo(r.Context())
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
