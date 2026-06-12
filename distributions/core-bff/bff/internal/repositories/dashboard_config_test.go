package repositories

import (
	"fmt"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/maputil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestDeepMerge_OverridesTakePrecedence(t *testing.T) {
	defaults := map[string]interface{}{
		"a": "default",
		"b": "default",
	}
	overrides := map[string]interface{}{
		"a": "override",
	}

	result := maputil.DeepMerge(defaults, overrides)

	assert.Equal(t, "override", result["a"])
	assert.Equal(t, "default", result["b"])
}

func TestDeepMerge_NestedMaps(t *testing.T) {
	defaults := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"enablement":    true,
				"disableInfo":   false,
				"disableKServe": false,
			},
		},
	}
	overrides := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"disableKServe": true,
			},
		},
	}

	result := maputil.DeepMerge(defaults, overrides)

	spec := result["spec"].(map[string]interface{})
	dc := spec["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, true, dc["enablement"])
	assert.Equal(t, false, dc["disableInfo"])
	assert.Equal(t, true, dc["disableKServe"])
}

func TestDeepMerge_OverrideDoesNotMutateDefaults(t *testing.T) {
	defaults := map[string]interface{}{"key": "original"}
	overrides := map[string]interface{}{"key": "changed"}

	_ = maputil.DeepMerge(defaults, overrides)

	assert.Equal(t, "original", defaults["key"])
}

func TestDeepMerge_NestedDefaultsNotMutated(t *testing.T) {
	defaults := map[string]interface{}{
		"spec": map[string]interface{}{
			"nested": map[string]interface{}{
				"flag": false,
			},
		},
	}

	result := maputil.DeepMerge(defaults, map[string]interface{}{})

	// Mutate the result's nested map
	result["spec"].(map[string]interface{})["nested"].(map[string]interface{})["flag"] = true

	// Original defaults must be unchanged
	nested := defaults["spec"].(map[string]interface{})["nested"].(map[string]interface{})
	assert.Equal(t, false, nested["flag"])
}

func TestApplyFeatureLockouts(t *testing.T) {
	config := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"disableFineTuning": false,
				"mlflow":            false,
				"disableKServe":     false,
			},
		},
	}

	applyFeatureLockouts(config)

	dc := config["spec"].(map[string]interface{})["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, true, dc["disableFineTuning"])
	assert.Equal(t, true, dc["mlflow"])
	assert.Equal(t, false, dc["disableKServe"])
}

func TestApplyFeatureLockouts_MissingSpec(t *testing.T) {
	config := map[string]interface{}{}
	applyFeatureLockouts(config)
	// Should not panic
}

func TestApplyFeatureFlagOverrides(t *testing.T) {
	config := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"disableKServe": false,
				"enablement":    true,
			},
		},
	}

	overrides := map[string]bool{
		"disableKServe": true,
		"newFlag":       true,
	}

	applyFeatureFlagOverrides(config, overrides)

	dc := config["spec"].(map[string]interface{})["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, true, dc["disableKServe"])
	assert.Equal(t, true, dc["newFlag"])
	assert.Equal(t, true, dc["enablement"])
}

func TestApplyXKSOverrides(t *testing.T) {
	config := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"enablement":             true,
				"disableProjects":        false,
				"disableBYONImageStream": false,
				"disableISVBadges":       false,
				"disableAppLauncher":     false,
				"disablePipelines":       false,
				"mlflow":                 true,
				"disableKServe":          false,
			},
		},
	}

	applyXKSOverrides(config)

	dc := config["spec"].(map[string]interface{})["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, false, dc["enablement"])
	assert.Equal(t, true, dc["disableProjects"])
	assert.Equal(t, true, dc["disableBYONImageStream"])
	assert.Equal(t, true, dc["disableISVBadges"])
	assert.Equal(t, true, dc["disableAppLauncher"])
	assert.Equal(t, true, dc["disablePipelines"])
	assert.Equal(t, false, dc["mlflow"])
	assert.Equal(t, false, dc["disableKServe"])
}

func TestLockoutsAndXKSOverridesCannotBeOverriddenByHeaders(t *testing.T) {
	config := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"enablement":        true,
				"disableFineTuning": false,
				"mlflow":            true,
				"disableProjects":   false,
				"disablePipelines":  false,
			},
		},
	}

	// Simulate header overrides trying to undo lockouts and XKS overrides
	applyFeatureFlagOverrides(config, map[string]bool{
		"enablement":        true,
		"disableFineTuning": false,
		"mlflow":            true,
		"disableProjects":   false,
		"disablePipelines":  false,
	})

	// Lockouts and XKS overrides run after headers
	applyFeatureLockouts(config)
	applyXKSOverrides(config)

	dc := config["spec"].(map[string]interface{})["dashboardConfig"].(map[string]interface{})
	assert.Equal(t, true, dc["disableFineTuning"])
	assert.Equal(t, false, dc["enablement"])
	assert.Equal(t, false, dc["mlflow"])
	assert.Equal(t, true, dc["disableProjects"])
	assert.Equal(t, true, dc["disablePipelines"])
}

func TestHandleFetchError_DiscoveryErrorReturnsDefaults(t *testing.T) {
	repo := &DashboardConfigRepository{}
	discoveryErr := &k8serrors.StatusError{ErrStatus: metav1.Status{
		Code:   404,
		Reason: metav1.StatusReasonNotFound,
	}}

	result, err := repo.handleFetchError(discoveryErr, "test-ns", "test-config")

	require.NoError(t, err)
	require.NotNil(t, result, "discovery error should return blank defaults, not nil")
	spec, ok := result["spec"].(map[string]interface{})
	require.True(t, ok, "defaults should have a spec")
	_, hasDC := spec["dashboardConfig"]
	assert.True(t, hasDC, "defaults should have dashboardConfig in spec")
}

func TestHandleFetchError_NonDiscoveryErrorReturnsError(t *testing.T) {
	repo := &DashboardConfigRepository{}
	serverErr := fmt.Errorf("connection refused")

	result, err := repo.handleFetchError(serverErr, "test-ns", "test-config")

	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get dashboard config")
}

func TestToUnstructuredMap(t *testing.T) {
	type sample struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	result, err := maputil.ToUnstructuredMap(sample{Name: "test", Value: 42})
	require.NoError(t, err)
	assert.Equal(t, "test", result["name"])
	assert.Equal(t, float64(42), result["value"])
}
