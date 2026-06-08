package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
)

// isResourceUnavailable returns true when the resource or its CRD is absent.
// Broader than repositories.isDiscoveryError: also matches IsNotFound (instance missing).
func isResourceUnavailable(err error) bool {
	if k8serrors.IsNotFound(err) || k8serrors.IsMethodNotSupported(err) {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "no matches for kind") ||
		strings.Contains(msg, "the server could not find the requested resource")
}

// GetDashboardConfigByNameHandler fetches a specific OdhDashboardConfig by namespace/name.
func (app *App) GetDashboardConfigByNameHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	name := ps.ByName("name")

	if !app.isAllowedNamespace(namespace) {
		app.forbiddenResponse(w, r, fmt.Errorf("request invalid against a resource from a non-dashboard namespace"))
		return
	}

	raw, err := app.repositories.DashboardConfig.GetRawDashboardConfig(r.Context(), namespace, name)
	if err != nil {
		if isResourceUnavailable(err) {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, raw, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// PatchDashboardConfigByNameHandler patches a specific OdhDashboardConfig by namespace/name.
func (app *App) PatchDashboardConfigByNameHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("namespace")
	name := ps.ByName("name")

	if !app.isAllowedNamespace(namespace) {
		app.forbiddenResponse(w, r, fmt.Errorf("request invalid against a resource from a non-dashboard namespace"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1_048_576)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

	if !json.Valid(body) {
		app.badRequestResponse(w, r, fmt.Errorf("body contains badly-formed JSON"))
		return
	}

	raw, err := app.repositories.DashboardConfig.PatchRawDashboardConfig(r.Context(), namespace, name, body, types.JSONPatchType)
	if err != nil {
		if isResourceUnavailable(err) {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, raw, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
