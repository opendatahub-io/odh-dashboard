package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// MaasModelsPlaceholderHandler handles GET /gen-ai/api/v1/maas/models
// This is a placeholder implementation for the MaaS models endpoint
func (app *App) MaasModelsPlaceholderHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Return a placeholder response indicating the endpoint is not yet implemented
	response := map[string]interface{}{
		"message": "MaaS models endpoint is not yet implemented",
		"status":  "placeholder",
		"data":    []interface{}{},
	}

	err := app.WriteJSON(w, http.StatusNotImplemented, response, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
