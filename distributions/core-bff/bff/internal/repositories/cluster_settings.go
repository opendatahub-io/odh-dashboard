package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"k8s.io/client-go/kubernetes"
)

const (
	cullerConfigName           = "notebook-controller-culler-config"
	segmentKeyConfigName       = "odh-segment-key-config"
	defaultCullerTimeout       = 31536000
	defaultPVCSize             = 20
	defaultIdlenessCheckPeriod = "1"
	notebookControllerDeploy   = "notebook-controller-deployment"
)

// ClusterSettingsRepository handles cluster settings derived from DashboardConfig and ConfigMaps.
// Uses the SA clientset for ConfigMap operations, matching the privileged watcher model where the dashboard
// SA performs reads and admin-gated mutations.
type ClusterSettingsRepository struct {
	saClientset kubernetes.Interface
}

func NewClusterSettingsRepository(saClientset kubernetes.Interface) *ClusterSettingsRepository {
	return &ClusterSettingsRepository{saClientset: saClientset}
}

// GetClusterSettings builds a ClusterSettings from DashboardConfig and ConfigMaps.
func (r *ClusterSettingsRepository) GetClusterSettings(
	ctx context.Context,
	namespace string, dashConfig *models.DashboardConfig,
) (*models.ClusterSettings, error) {
	settings := models.DefaultClusterSettings

	applyDashboardConfigToSettings(dashConfig, &settings)

	cullerTimeout, err := readCullerTimeout(ctx, r.saClientset, namespace)
	if err != nil {
		return nil, err
	}
	settings.CullerTimeout = cullerTimeout

	if dashConfig != nil && !dashConfig.Spec.DashboardConfig.DisableTracking {
		tracking, err := readUserTrackingEnabled(ctx, r.saClientset, namespace)
		if err != nil {
			slog.Warn("failed to read segment key config, defaulting to tracking disabled", slog.Any("error", err))
		} else {
			settings.UserTrackingEnabled = tracking
		}
	}

	return &settings, nil
}

// BuildDashboardConfigPatch builds the JSON merge patch for DashboardConfig fields
// affected by cluster settings.
func (r *ClusterSettingsRepository) BuildDashboardConfigPatch(
	settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) ([]byte, error) {
	if settings == nil {
		return nil, fmt.Errorf("settings must not be nil")
	}
	if currentConfig == nil {
		return nil, fmt.Errorf("currentConfig must not be nil")
	}

	patch := map[string]interface{}{
		"spec": map[string]interface{}{
			"dashboardConfig": map[string]interface{}{
				"disableKServe": !settings.ModelServingPlatformEnabled.KServe,
				"disableLLMd":   !settings.ModelServingPlatformEnabled.LLMd,
			},
		},
	}

	modelServing := map[string]interface{}{}
	if settings.IsDistributedInferencingDefault != nil {
		modelServing["isLLMdDefault"] = *settings.IsDistributedInferencingDefault
	}
	currentStrategy := ""
	if currentConfig.Spec.ModelServing != nil && currentConfig.Spec.ModelServing.DeploymentStrategy != nil {
		currentStrategy = *currentConfig.Spec.ModelServing.DeploymentStrategy
	}
	if settings.DefaultDeploymentStrategy != currentStrategy {
		modelServing["deploymentStrategy"] = settings.DefaultDeploymentStrategy
	}
	if len(modelServing) > 0 {
		patch["spec"].(map[string]interface{})["modelServing"] = modelServing
	}

	currentPVC := currentPVCSize(currentConfig)
	if settings.PVCSize != currentPVC {
		isJupyterEnabled := true
		if currentConfig.Spec.NotebookController != nil {
			isJupyterEnabled = currentConfig.Spec.NotebookController.Enabled
		}
		pvcStr := fmt.Sprintf("%dGi", settings.PVCSize)
		patch["spec"].(map[string]interface{})["notebookController"] = map[string]interface{}{
			"enabled": isJupyterEnabled,
			"pvcSize": pvcStr,
		}
	}

	return json.Marshal(patch)
}

// UpdateConfigMaps updates culler and segment-key ConfigMaps, and rolls out
// notebook-controller-deployment when culler or PVC settings changed.
// All operations use the SA clientset, matching the privileged watcher model.
func (r *ClusterSettingsRepository) UpdateConfigMaps(
	ctx context.Context,
	namespace string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) error {
	needsRollout := r.detectChanges(ctx, namespace, settings, currentConfig)

	if err := r.updateCullerConfig(ctx, namespace, settings.CullerTimeout); err != nil {
		return fmt.Errorf("failed to update culler config: %w", err)
	}
	if err := r.updateSegmentKeyConfig(ctx, namespace, settings.UserTrackingEnabled); err != nil {
		return fmt.Errorf("failed to update segment key config: %w", err)
	}

	if needsRollout {
		if err := r.rolloutDeployment(ctx, namespace, notebookControllerDeploy); err != nil {
			return fmt.Errorf("failed to rollout %s: %w", notebookControllerDeploy, err)
		}
	}

	return nil
}

// --- Pure helpers ---

func applyDashboardConfigToSettings(dashConfig *models.DashboardConfig, settings *models.ClusterSettings) {
	if dashConfig == nil {
		return
	}

	settings.ModelServingPlatformEnabled.KServe = !dashConfig.Spec.DashboardConfig.DisableKServe
	settings.ModelServingPlatformEnabled.LLMd = !dashConfig.Spec.DashboardConfig.DisableLLMd

	if dashConfig.Spec.ModelServing != nil {
		settings.IsDistributedInferencingDefault = dashConfig.Spec.ModelServing.IsLLMdDefault
		if dashConfig.Spec.ModelServing.DeploymentStrategy != nil {
			settings.DefaultDeploymentStrategy = *dashConfig.Spec.ModelServing.DeploymentStrategy
		}
	}

	settings.PVCSize = currentPVCSize(dashConfig)
}

func currentPVCSize(config *models.DashboardConfig) int {
	if config == nil || config.Spec.NotebookController == nil || config.Spec.NotebookController.PVCSize == nil {
		return defaultPVCSize
	}
	return parsePVCSize(*config.Spec.NotebookController.PVCSize)
}

func parsePVCSize(size string) int {
	size = strings.TrimSuffix(size, "Gi")
	size = strings.TrimSuffix(size, "G")
	val, err := strconv.Atoi(size)
	if err != nil {
		return defaultPVCSize
	}
	return val
}
