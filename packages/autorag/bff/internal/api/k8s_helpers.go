package api

import (
	"net/http"
)

// handleK8sClientError handles errors from Kubernetes client operations.
// For now, this is a simple wrapper that calls serverErrorResponse.
// TODO: Implement full error mapping when K8sError types are added.
func (app *App) handleK8sClientError(w http.ResponseWriter, r *http.Request, err error) {
	app.serverErrorResponse(w, r, err)
}
