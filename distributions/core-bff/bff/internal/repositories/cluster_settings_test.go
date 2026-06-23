package repositories

import (
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParsePVCSize(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"20Gi", 20},
		{"50Gi", 50},
		{"100G", 100},
		{"10", 10},
		{"invalid", 20},
		{"", 20},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, parsePVCSize(tt.input))
		})
	}
}

func TestBuildDashboardConfigPatch_Basic(t *testing.T) {
	repo := NewClusterSettingsRepository(nil)
	pvcSize := "20Gi"
	settings := &models.ClusterSettings{
		PVCSize: 30,
		ModelServingPlatformEnabled: models.ModelServingPlatformEnabled{
			KServe: true,
			LLMd:   false,
		},
	}
	currentConfig := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			NotebookController: &models.NotebookController{
				Enabled: true,
				PVCSize: &pvcSize,
			},
		},
	}

	patchBytes, err := repo.BuildDashboardConfigPatch(settings, currentConfig)
	require.NoError(t, err)
	require.NotEmpty(t, patchBytes)

	// Verify it's valid JSON containing expected fields
	patchStr := string(patchBytes)
	assert.Contains(t, patchStr, `"disableKServe":false`)
	assert.Contains(t, patchStr, `"disableLLMd":true`)
	assert.Contains(t, patchStr, `"pvcSize":"30Gi"`)
}

func TestBuildDashboardConfigPatch_NoPVCChangeWhenSame(t *testing.T) {
	repo := NewClusterSettingsRepository(nil)
	pvcSize := "20Gi"
	settings := &models.ClusterSettings{
		PVCSize: 20,
		ModelServingPlatformEnabled: models.ModelServingPlatformEnabled{
			KServe: true,
			LLMd:   true,
		},
	}
	currentConfig := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			NotebookController: &models.NotebookController{
				Enabled: true,
				PVCSize: &pvcSize,
			},
		},
	}

	patchBytes, err := repo.BuildDashboardConfigPatch(settings, currentConfig)
	require.NoError(t, err)

	patchStr := string(patchBytes)
	assert.NotContains(t, patchStr, "notebookController")
}

func TestBuildDashboardConfigPatch_PreservesNotebookDisabled(t *testing.T) {
	repo := NewClusterSettingsRepository(nil)
	pvcSize := "20Gi"
	settings := &models.ClusterSettings{
		PVCSize: 50,
		ModelServingPlatformEnabled: models.ModelServingPlatformEnabled{
			KServe: true,
			LLMd:   true,
		},
	}
	currentConfig := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			NotebookController: &models.NotebookController{
				Enabled: false,
				PVCSize: &pvcSize,
			},
		},
	}

	patchBytes, err := repo.BuildDashboardConfigPatch(settings, currentConfig)
	require.NoError(t, err)

	patchStr := string(patchBytes)
	assert.Contains(t, patchStr, `"enabled":false`)
	assert.Contains(t, patchStr, `"pvcSize":"50Gi"`)
}

func TestBuildDashboardConfigPatch_WithModelServing(t *testing.T) {
	repo := NewClusterSettingsRepository(nil)
	isDefault := true
	pvcSize := "20Gi"
	settings := &models.ClusterSettings{
		PVCSize:                         20,
		IsDistributedInferencingDefault: &isDefault,
		DefaultDeploymentStrategy:       "rolling",
		ModelServingPlatformEnabled: models.ModelServingPlatformEnabled{
			KServe: true,
			LLMd:   true,
		},
	}
	currentConfig := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			NotebookController: &models.NotebookController{
				Enabled: true,
				PVCSize: &pvcSize,
			},
		},
	}

	patchBytes, err := repo.BuildDashboardConfigPatch(settings, currentConfig)
	require.NoError(t, err)

	patchStr := string(patchBytes)
	assert.Contains(t, patchStr, `"isLLMdDefault":true`)
	assert.Contains(t, patchStr, `"deploymentStrategy":"rolling"`)
}
