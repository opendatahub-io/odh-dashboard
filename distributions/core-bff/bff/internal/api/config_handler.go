package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"k8s.io/apimachinery/pkg/types"
)

// GetConfigHandler returns the merged DashboardConfig with defaults.
func (app *App) GetConfigHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	if err := app.validateCallerToken(ctx); err != nil {
		app.unauthorizedResponse(w, r, err)
		return
	}

	var featureFlagOverrides map[string]bool
	if flagsHeader := r.Header.Get("x-odh-feature-flags"); flagsHeader != "" {
		featureFlagOverrides = make(map[string]bool)
		if err := json.Unmarshal([]byte(flagsHeader), &featureFlagOverrides); err != nil {
			// Silently ignore malformed header
			featureFlagOverrides = nil
		}
	}

	config, err := app.repositories.DashboardConfig.GetDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, featureFlagOverrides,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	w.Header().Set("Cache-Control", "no-cache")
	if err := app.WriteJSON(w, http.StatusOK, config, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// PatchConfigHandler updates the default DashboardConfig CRD.
func (app *App) PatchConfigHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

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

	_, err = app.repositories.DashboardConfig.PatchRawDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, body, types.MergePatchType,
	)
	if err != nil {
		if isResourceUnavailable(err) {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Re-fetch the merged config to return the updated state
	config, err := app.repositories.DashboardConfig.GetDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, nil,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, config, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
