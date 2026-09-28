package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// GetOperatorSubscriptionStatusHandler returns the installed data science operator channel.
func (app *App) GetOperatorSubscriptionStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	status, err := app.repositories.OperatorSubscriptionStatus.GetOperatorSubscriptionStatus(r.Context())
	if err != nil {
		if apierrors.IsNotFound(err) {
			app.notFoundResponse(w, r)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, status, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
