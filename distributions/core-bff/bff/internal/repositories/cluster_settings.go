package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
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
		switch {
		case err != nil && r.clients.policy == CredentialPolicyCaller:
			// Under the caller policy a failed read is the caller's answer, as
			// for every other read here and as the save plan treats it.
			return nil, err
		case err != nil:
			// The service-account policy keeps showing tracking off; the save
			// plan treats the unreadable ConfigMap the same way (see buildPlan).
			slog.Warn("failed to read segment key config, defaulting to tracking disabled", slog.Any("error", err))
		default:
			settings.UserTrackingEnabled = tracking
		}
	}

	return &settings, nil
}

// BuildDashboardConfigPatch builds the JSON merge patch for DashboardConfig fields
// affected by cluster settings. The patch carries the resourceVersion of the
// configuration it was computed from, so the API server rejects it with a
// conflict if another save changed the configuration between this request's
// read and its patch. The request body carries no version, so this covers
// concurrent saves inside one request only: a form loaded before another
// admin's save still writes its own values over that save (last writer wins,
// as before). Defaults that were never stored carry no version and keep the
// unconditional patch.
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
	if rv := currentConfig.Metadata.ResourceVersion; rv != "" {
		patch["metadata"] = map[string]any{"resourceVersion": rv}
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

// VerifyPlanStillHolds re-checks, before anything is written, that the
// ConfigMaps the plan read are as it read them: a planned create still has no
// ConfigMap, and every other one is at the version read (or still absent). The
// handler runs it before the OdhDashboardConfig patch, so a change made by
// another save since the read is reported before the first write. A change in
// the short window after this check is still caught by the bound writes.
func (r *ClusterSettingsRepository) VerifyPlanStillHolds(ctx context.Context, namespace string, plan *ClusterSettingsPlan) error {
	if plan == nil {
		return fmt.Errorf("cluster settings update has no plan")
	}
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return err
	}
	if err := requireUnchanged(ctx, cs, namespace, cullerConfigName, plan.culler); err != nil {
		return err
	}
	if plan.trackingManaged {
		return requireUnchanged(ctx, cs, namespace, segmentKeyConfigName, plan.segmentKey)
	}
	return nil
}

// UpdateConfigMaps executes the ConfigMap writes and the notebook-controller
// rollout fixed by PlanUpdate, using the clients selected by the credential
// policy. It does not re-decide an operation: if the cluster changed since the
// plan, the planned write fails, or a conflict is returned for a ConfigMap the
// plan left alone, instead of switching to a write the preflight did not check
// or reporting success for a setting that was not stored.
//
// The segment-key ConfigMap, which needs no rollout, is handled first, so a
// conflict on it stops the update before the culler ConfigMap is written. The
// caller has already patched the OdhDashboardConfig, so when the PVC size
// changed the planned rollout still runs after a later failure: a retry sees
// the PVC size as stored and would not restart the controller.
func (r *ClusterSettingsRepository) UpdateConfigMaps(ctx context.Context, namespace string, plan *ClusterSettingsPlan) error {
	if plan == nil {
		return fmt.Errorf("cluster settings update has no plan")
	}
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return err
	}

	writeErr := r.applySegmentKeyConfig(ctx, cs, namespace, plan)
	if writeErr != nil {
		writeErr = fmt.Errorf("failed to update segment key config: %w", writeErr)
	} else if err := r.applyCullerConfig(ctx, cs, namespace, plan); err != nil {
		writeErr = fmt.Errorf("failed to update culler config: %w", err)
	}
	if writeErr != nil && !plan.pvcChanged {
		return writeErr
	}

	if plan.rollout {
		// TODO: Gate this notebook-controller restart on a platform capability; XKS
		// must not expose the notebook (workbench) feature or its settings.
		// No notebook-controller Deployment (xKS has no workbenches) means there
		// is nothing to restart, not a failed save.
		if err := r.rolloutDeployment(ctx, cs, namespace, notebookControllerDeploy); err != nil && !k8serrors.IsNotFound(err) {
			return joinAuthFirst(writeErr, fmt.Errorf("failed to rollout %s: %w", notebookControllerDeploy, err))
		}
	}

	return writeErr
}

// joinAuthFirst keeps every cause, putting an authorization failure first.
// The status is taken from the first Kubernetes error in the chain, so a
// denial is reported as 401/403 rather than hidden behind an earlier conflict.
func joinAuthFirst(errs ...error) error {
	var auth, rest []error
	for _, err := range errs {
		switch {
		case err == nil:
		case k8serrors.IsForbidden(err) || k8serrors.IsUnauthorized(err):
			auth = append(auth, err)
		default:
			rest = append(rest, err)
		}
	}
	return errors.Join(append(auth, rest...)...)
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
