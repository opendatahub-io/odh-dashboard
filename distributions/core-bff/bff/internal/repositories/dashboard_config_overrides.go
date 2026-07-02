package repositories

import (
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/maputil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// Dashboard-config-specific override helpers. These encode business rules
// (feature lockouts, XKS overrides, flag layering) and are not reusable
// outside the dashboard-config domain.

// applyFeatureLockouts forces specific flags that must not be changed by CRD values.
// Matches backend/src/utils/resourceUtils.ts applyFeatureLockouts().
func applyFeatureLockouts(config map[string]interface{}) {
	spec, ok := config["spec"].(map[string]interface{})
	if !ok {
		return
	}
	dc, ok := spec["dashboardConfig"].(map[string]interface{})
	if !ok {
		return
	}
	dc["disableFineTuning"] = true
	dc["mlflow"] = true
}

func applyFeatureFlagOverrides(config map[string]interface{}, overrides map[string]bool) {
	spec, ok := config["spec"].(map[string]interface{})
	if !ok {
		return
	}
	dc, ok := spec["dashboardConfig"].(map[string]interface{})
	if !ok {
		return
	}
	for k, v := range overrides {
		dc[k] = v
	}
}

// applyXKSOverrides disables OpenShift-dependent features for XKS platform deployments.
func applyXKSOverrides(config map[string]interface{}) {
	spec, ok := config["spec"].(map[string]interface{})
	if !ok {
		return
	}
	dc, ok := spec["dashboardConfig"].(map[string]interface{})
	if !ok {
		return
	}
	dc["enablement"] = false
	dc["disableProjects"] = true
	dc["disableBYONImageStream"] = true
	dc["disableISVBadges"] = true
	dc["disableAppLauncher"] = true
	dc["disablePipelines"] = true
	dc["mlflow"] = false
}

func blankDefaults() (map[string]interface{}, error) {
	defaultsMap, err := maputil.ToUnstructuredMap(models.BlankDashboardCR)
	if err != nil {
		return nil, fmt.Errorf("failed to convert defaults: %w", err)
	}
	return defaultsMap, nil
}
