package repositories

import (
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// deepMerge recursively merges overrides into defaults.
// Override values take precedence. Maps are merged recursively.
// Nested maps from defaults are deep-copied so the original defaults are never mutated.
func deepMerge(defaults, overrides map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{}, len(defaults))
	for k, v := range defaults {
		if vMap, ok := v.(map[string]interface{}); ok {
			result[k] = deepCopyMap(vMap)
		} else {
			result[k] = v
		}
	}
	for k, v := range overrides {
		if vMap, ok := v.(map[string]interface{}); ok {
			if dMap, ok := result[k].(map[string]interface{}); ok {
				result[k] = deepMerge(dMap, vMap)
				continue
			}
		}
		result[k] = v
	}
	return result
}

func deepCopyMap(m map[string]any) map[string]any {
	cp := make(map[string]any, len(m))
	for k, v := range m {
		if vMap, ok := v.(map[string]any); ok {
			cp[k] = deepCopyMap(vMap)
		} else {
			cp[k] = v
		}
	}
	return cp
}

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
	defaultsMap, err := toUnstructuredMap(models.BlankDashboardCR)
	if err != nil {
		return nil, fmt.Errorf("failed to convert defaults: %w", err)
	}
	return defaultsMap, nil
}

// toUnstructuredMap converts a typed Go struct to a map[string]interface{} via JSON round-trip.
func toUnstructuredMap(obj interface{}) (map[string]interface{}, error) {
	data, err := json.Marshal(obj)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}
