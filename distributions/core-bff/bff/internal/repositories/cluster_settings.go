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

	keyCullingEnabled      = "ENABLE_CULLING"
	keyCullIdleTime        = "CULL_IDLE_TIME"
	keyIdlenessCheckPeriod = "IDLENESS_CHECK_PERIOD"
	keySegmentKeyEnabled   = "segmentKeyEnabled"

	annotationRestartedAt = "kubectl.kubernetes.io/restartedAt"
)

// ClusterSettingsRepository handles cluster settings derived from DashboardConfig and ConfigMaps.
// Both endpoints are admin-only and user-initiated, so every ConfigMap and
// Deployment access follows the credential policy: the service account on
// OpenShift (privileged watcher model), the caller on xKS.
type ClusterSettingsRepository struct {
	clients clientSource
}

func NewClusterSettingsRepository(saClientset kubernetes.Interface) *ClusterSettingsRepository {
	return &ClusterSettingsRepository{clients: saSource(saClientset, nil)}
}

// GetClusterSettings builds a ClusterSettings from DashboardConfig and ConfigMaps.
func (r *ClusterSettingsRepository) GetClusterSettings(
	ctx context.Context,
	namespace string, dashConfig *models.DashboardConfig,
) (*models.ClusterSettings, error) {
	settings := models.DefaultClusterSettings

	applyDashboardConfigToSettings(dashConfig, &settings)

	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	cullerTimeout, err := readCullerTimeout(ctx, cs, namespace)
	if err != nil {
		return nil, err
	}
	settings.CullerTimeout = cullerTimeout

	if dashConfig != nil && !dashConfig.Spec.DashboardConfig.DisableTracking {
		tracking, err := readUserTrackingEnabled(ctx, cs, namespace)
		if err != nil && r.clients.surfacesAuthFailure(err) {
			// A caller who may not read the segment-key ConfigMap gets the
			// API server's answer, as for every other read here.
			return nil, err
		}
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

	patch := map[string]any{
		"spec": map[string]any{
			"dashboardConfig": map[string]any{
				"disableKServe": !settings.ModelServingPlatformEnabled.KServe,
				"disableLLMd":   !settings.ModelServingPlatformEnabled.LLMd,
			},
		},
	}

	modelServing := map[string]any{}
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
		patch["spec"].(map[string]any)["modelServing"] = modelServing
	}

	currentPVC := currentPVCSize(currentConfig)
	if settings.PVCSize != currentPVC {
		isJupyterEnabled := true
		if currentConfig.Spec.NotebookController != nil {
			isJupyterEnabled = currentConfig.Spec.NotebookController.Enabled
		}
		pvcStr := fmt.Sprintf("%dGi", settings.PVCSize)
		patch["spec"].(map[string]any)["notebookController"] = map[string]any{
			"enabled": isJupyterEnabled,
			"pvcSize": pvcStr,
		}
	}

	return json.Marshal(patch)
}

// UpdateConfigMaps executes the ConfigMap writes and the notebook-controller
// rollout fixed by PlanUpdate, using the clients selected by the credential
// policy. It does not re-decide an operation: if the cluster changed since the
// plan (for example the culler ConfigMap appeared), the planned write fails, or
// a conflict is returned for a ConfigMap the plan left alone, instead of
// switching to a write the preflight did not check or reporting success for a
// setting that was not stored.
func (r *ClusterSettingsRepository) UpdateConfigMaps(ctx context.Context, namespace string, plan *ClusterSettingsPlan) error {
	if plan == nil {
		return fmt.Errorf("cluster settings update has no plan")
	}
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return err
	}

	if err := r.applyCullerConfig(ctx, cs, namespace, plan.cullerOp, plan.settings.CullerTimeout); err != nil {
		return fmt.Errorf("failed to update culler config: %w", err)
	}
	if plan.updateSegmentKey {
		if err := r.updateSegmentKeyConfig(ctx, cs, namespace, plan.settings.UserTrackingEnabled); err != nil {
			return fmt.Errorf("failed to update segment key config: %w", err)
		}
	} else if err := requireStillAbsent(ctx, cs, namespace, segmentKeyConfigName); err != nil {
		return fmt.Errorf("failed to update segment key config: %w", err)
	}

	if plan.rollout {
		// TODO: Gate this notebook-controller restart on a platform capability; XKS
		// must not expose the notebook (workbench) feature or its settings.
		if err := r.rolloutDeployment(ctx, cs, namespace, notebookControllerDeploy); err != nil {
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
