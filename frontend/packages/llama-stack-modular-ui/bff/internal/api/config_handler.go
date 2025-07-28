package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type ConfigResponse struct {
	OAuthEnabled     bool   `json:"oauthEnabled"`
	OAuthClientID    string `json:"oauthClientId"`
	OAuthRedirectURI string `json:"oauthRedirectUri"`
	OAuthServerURL   string `json:"oauthServerUrl"`
}

func (app *App) HandleConfig(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	resp := ConfigResponse{
		OAuthEnabled:     app.config.OAuthEnabled,
		OAuthClientID:    app.config.OAuthClientID,
		OAuthRedirectURI: app.config.OAuthRedirectURI,
		OAuthServerURL:   app.config.OAuthServerURL,
	}
	err := app.WriteJSON(w, http.StatusOK, resp, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
