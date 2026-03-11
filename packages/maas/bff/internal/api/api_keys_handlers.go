package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// attachAPIKeyHandlers registers the API key routes
func attachAPIKeyHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.POST(constants.APIKeyCreatePath, handlerWithApp(app, CreateAPIKeyHandler))
	apiRouter.POST(constants.APIKeySearchPath, handlerWithApp(app, SearchAPIKeysHandler))
	apiRouter.POST(constants.APIKeyBulkRevokePath, handlerWithApp(app, BulkRevokeAPIKeysHandler))
	apiRouter.GET(constants.APIKeyByIDPath, handlerWithApp(app, GetAPIKeyHandler))
	apiRouter.DELETE(constants.APIKeyByIDPath, handlerWithApp(app, RevokeAPIKeyHandler))
}

// CreateAPIKeyHandler handles POST /api/v1/api-keys
func CreateAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeyCreateRequest, None]

	// Parse request body if present
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if request.Data.Name == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}

	response, err := app.repositories.APIKeys.CreateAPIKey(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKeyCreateResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusCreated, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// SearchAPIKeysHandler handles POST /api/v1/api-keys/search
func SearchAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeySearchRequest, None]

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	response, err := app.repositories.APIKeys.SearchAPIKeys(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKeyListResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetAPIKeyHandler handles GET /api/v1/api-keys/:id
// Returns metadata for a specific API key
func GetAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	keyID := params.ByName("id")
	if keyID == "" {
		app.badRequestResponse(w, r, errors.New("API key ID is required"))
		return
	}

	key, err := app.repositories.APIKeys.GetAPIKey(r.Context(), keyID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKey, None]{
		Data: key,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// RevokeAPIKeyHandler handles DELETE /api/v1/api-keys/:id
func RevokeAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	keyID := params.ByName("id")
	if keyID == "" {
		app.badRequestResponse(w, r, errors.New("API key ID is required"))
		return
	}

	key, err := app.repositories.APIKeys.RevokeAPIKey(r.Context(), keyID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKey, None]{
		Data: key,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// BulkRevokeAPIKeysHandler handles POST /api/v1/api-keys/bulk-revoke
func BulkRevokeAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeyBulkRevokeRequest, None]

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if request.Data.Username == "" {
		app.badRequestResponse(w, r, errors.New("username is required"))
		return
	}

	response, err := app.repositories.APIKeys.BulkRevokeAPIKeys(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKeyBulkRevokeResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
