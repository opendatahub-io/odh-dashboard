package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MaaSIssueTokenHandler handles POST /maas/tokens
func (app *App) MaaSIssueTokenHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var tokenRequest models.MaaSTokenRequest

	// Only try to parse JSON if there's actually a body
	if r.ContentLength > 0 {
		if err := app.ReadJSON(w, r, &tokenRequest); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}
	// If no body, tokenRequest remains empty (TTL="") and client will use default

	tokenResponse, err := app.repositories.MaaSModels.IssueToken(ctx, tokenRequest)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.WriteJSON(w, http.StatusCreated, tokenResponse, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MaaSRevokeAllTokensHandler handles DELETE /maas/tokens
func (app *App) MaaSRevokeAllTokensHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	err := app.repositories.MaaSModels.RevokeAllTokens(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return 204 No Content for successful deletion
	w.WriteHeader(http.StatusNoContent)
}
