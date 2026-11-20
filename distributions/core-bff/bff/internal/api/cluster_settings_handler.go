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

	// On xKS the write is computed from the caller's own read, so a caller who
	// cannot read the configuration is refused before anything is written.
	currentConfig, err := app.repositories.DashboardConfig.GetDashboardConfigForUpdate(
		ctx, app.config.Namespace, app.config.DashboardConfigName,
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

	// The update is several separate writes. On xKS, check the caller may make
	// all of them before the first one, so a denial cannot leave a partial change.
	if err := app.repositories.ClusterSettings.AuthorizeUpdate(
		ctx, app.config.Namespace, app.config.DashboardConfigName, &settings, currentConfig,
	); err != nil {
		app.clusterSettingsFailure(w, r, "unable to update cluster settings", err)
		return
	}

	if _, err := app.repositories.DashboardConfig.PatchRawDashboardConfig(
		ctx, app.config.Namespace, app.config.DashboardConfigName, patchBytes, types.MergePatchType,
	); err != nil {
		app.clusterSettingsFailure(w, r, "unable to update cluster settings", err)
		return
	}

	if err := app.repositories.ClusterSettings.UpdateConfigMaps(ctx, app.config.Namespace, &settings, currentConfig); err != nil {
		app.clusterSettingsFailure(w, r, "unable to update cluster settings", err)
		return
	}

	result := &models.MutationResponse{Success: true}
	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// clusterSettingsFailure writes a failed update. Under the caller policy an
// authorization error is surfaced through the error contract (401/403); every
// other failure keeps the legacy 200 response with success=false.
func (app *App) clusterSettingsFailure(w http.ResponseWriter, r *http.Request, msg string, err error) {
	if app.repositories.ClusterSettings.SurfacesAuthFailure(err) {
		app.serverErrorResponse(w, r, err)
		return
	}
	writeClusterSettingsError(app, w, r, fmt.Sprintf("%s: %v", msg, err))
}

func writeClusterSettingsError(app *App, w http.ResponseWriter, r *http.Request, msg string) {
	result := &models.MutationResponse{Success: false, Error: msg}
	if err := app.WriteJSON(w, http.StatusOK, result, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

const (
	deploymentStrategyRolling  = "rolling"
	deploymentStrategyRecreate = "recreate"
)

var validDeploymentStrategies = map[string]bool{
	"":                         true,
	deploymentStrategyRolling:  true,
	deploymentStrategyRecreate: true,
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
