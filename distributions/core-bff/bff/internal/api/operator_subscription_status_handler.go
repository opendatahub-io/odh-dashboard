package api

import (
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/repositories"
)

// GetOperatorSubscriptionStatusHandler returns the installed data science operator channel.
func (app *App) GetOperatorSubscriptionStatusHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	status, err := app.repositories.OperatorSubscriptionStatus.GetOperatorSubscriptionStatus(r.Context())
	if err != nil {
		if errors.Is(err, repositories.ErrOperatorSubscriptionUnavailable) {
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
