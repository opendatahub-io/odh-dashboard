package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// ListConnectionTypesHandler lists connection-type ConfigMaps.
func (app *App) ListConnectionTypesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	items, err := app.repositories.ConnectionType.List(r.Context(), app.config.Namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if items == nil {
		items = []corev1.ConfigMap{}
	}

	if err := app.WriteJSON(w, http.StatusOK, items, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetConnectionTypeHandler gets a single connection-type ConfigMap by name.
func (app *App) GetConnectionTypeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	name := ps.ByName("name")

	cm, err := app.repositories.ConnectionType.Get(r.Context(), app.config.Namespace, name)
	if err != nil {
		if k8serrors.IsNotFound(err) || strings.Contains(err.Error(), "is not a connection type") {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, cm, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateConnectionTypeHandler creates a connection-type ConfigMap.
func (app *App) CreateConnectionTypeHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	var cm corev1.ConfigMap
	if err := app.ReadJSON(w, r, &cm); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.ConnectionType.Create(r.Context(), app.config.Namespace, &cm)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateConnectionTypeHandler replaces a connection-type ConfigMap.
func (app *App) UpdateConnectionTypeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	name := ps.ByName("name")

	var cm corev1.ConfigMap
	if err := app.ReadJSON(w, r, &cm); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	cm.Name = name

	result, err := app.repositories.ConnectionType.Update(r.Context(), app.config.Namespace, name, &cm)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	writeConnectionTypeMutationResponse(app, w, r, result)
}

// PatchConnectionTypeHandler partially updates a connection-type ConfigMap.
func (app *App) PatchConnectionTypeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	name := ps.ByName("name")

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

	result, err := app.repositories.ConnectionType.Patch(r.Context(), app.config.Namespace, name, body)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	writeConnectionTypeMutationResponse(app, w, r, result)
}

// DeleteConnectionTypeHandler deletes a connection-type ConfigMap.
func (app *App) DeleteConnectionTypeHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	if err := app.validateCallerToken(r.Context()); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	name := ps.ByName("name")

	result, err := app.repositories.ConnectionType.Delete(r.Context(), app.config.Namespace, name)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	writeConnectionTypeMutationResponse(app, w, r, result)
}

func writeConnectionTypeMutationResponse(app *App, w http.ResponseWriter, r *http.Request, result *models.MutationResponse) {
	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
