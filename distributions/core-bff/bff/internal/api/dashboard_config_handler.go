package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"k8s.io/apimachinery/pkg/types"
)

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
		if k8sutil.IsResourceUnavailable(err) {
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
		if k8sutil.IsResourceUnavailable(err) {
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
