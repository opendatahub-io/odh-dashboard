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
	apiRouter.GET(constants.APIKeysListPath, handlerWithApp(app, ListAPIKeysHandler))
	apiRouter.GET(constants.APIKeyByIDPath, handlerWithApp(app, GetAPIKeyHandler))
	apiRouter.DELETE(constants.APIKeysDeletePath, handlerWithApp(app, DeleteAllAPIKeysHandler))
}

// CreateAPIKeyHandler handles POST /api/v1/api-key
// Creates a new API key with optional name, description, and expiration
func CreateAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeyRequest, None]

	// Parse request body if present
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Set default expiration if not provided
	if request.Data.Expiration == "" {
		request.Data.Expiration = "4h"
	}

	response, err := app.repositories.APIKeys.CreateAPIKey(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKeyResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusCreated, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// ListAPIKeysHandler handles GET /api/v1/api-keys
// Returns all API keys for the authenticated user
func ListAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	keys, err := app.repositories.APIKeys.ListAPIKeys(r.Context())
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[[]models.APIKeyMetadata, None]{
		Data: keys,
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

	responseEnvelope := Envelope[*models.APIKeyMetadata, None]{
		Data: key,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteAllAPIKeysHandler handles DELETE /api/v1/api-keys
// Deletes all API keys for the authenticated user
func DeleteAllAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if err := app.repositories.APIKeys.DeleteAllAPIKeys(r.Context()); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[None, None]{
		Data: nil,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
