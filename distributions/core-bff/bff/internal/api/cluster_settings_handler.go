package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"k8s.io/apimachinery/pkg/types"
)

// GetClusterSettingsHandler returns cluster settings derived from DashboardConfig and ConfigMaps.
func (app *App) GetClusterSettingsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	dashConfig, err := app.repositories.DashboardConfig.GetDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, nil,
	)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	settings, err := app.repositories.ClusterSettings.GetClusterSettings(ctx, app.config.Namespace, dashConfig)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.WriteJSON(w, http.StatusOK, settings, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateClusterSettingsHandler updates cluster settings.
func (app *App) UpdateClusterSettingsHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var settings models.ClusterSettings
	if err := app.ReadJSON(w, r, &settings); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validateClusterSettings(&settings); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	currentConfig, err := app.repositories.DashboardConfig.GetDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, nil,
	)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get current config: %w", err))
		return
	}

	patchBytes, err := app.repositories.ClusterSettings.BuildDashboardConfigPatch(&settings, currentConfig)
	if err != nil {
		writeClusterSettingsError(app, w, r, fmt.Sprintf("failed to build config patch: %v", err))
		return
	}

	if _, err := app.repositories.DashboardConfig.PatchRawDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, patchBytes, types.MergePatchType,
	); err != nil {
		writeClusterSettingsError(app, w, r, fmt.Sprintf("unable to update cluster settings: %v", err))
		return
	}

	if err := app.repositories.ClusterSettings.UpdateConfigMaps(ctx, app.config.Namespace, &settings, currentConfig); err != nil {
		writeClusterSettingsError(app, w, r, fmt.Sprintf("unable to update cluster settings: %v", err))
		return
	}

	result := &models.MutationResponse{Success: true}
	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func writeClusterSettingsError(app *App, w http.ResponseWriter, r *http.Request, msg string) {
	result := &models.MutationResponse{Success: false, Error: msg}
	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

var validDeploymentStrategies = map[string]bool{
	"":         true,
	"rolling":  true,
	"recreate": true,
}

func validateClusterSettings(s *models.ClusterSettings) error {
	if s.PVCSize <= 0 {
		return errors.New("pvcSize must be greater than 0")
	}
	if s.CullerTimeout < 0 {
		return errors.New("cullerTimeout must not be negative")
	}
	if s.CullerTimeout > 0 && s.CullerTimeout%60 != 0 {
		return errors.New("cullerTimeout must be a multiple of 60 seconds")
	}
	if !validDeploymentStrategies[s.DefaultDeploymentStrategy] {
		return fmt.Errorf("invalid defaultDeploymentStrategy: %q", s.DefaultDeploymentStrategy)
	}
	return nil
}
