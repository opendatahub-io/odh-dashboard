package repositories

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
)

// --- ConfigMap readers ---

func readCullerTimeout(ctx context.Context, saClientset kubernetes.Interface, namespace string) (int, error) {
	cm, err := saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, cullerConfigName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return defaultCullerTimeout, nil
		}
		return 0, fmt.Errorf("failed to get culler config: %w", err)
	}
	if cm.Data == nil || cm.Data["ENABLE_CULLING"] != "true" {
		return defaultCullerTimeout, nil
	}
	if idleTime, ok := cm.Data["CULL_IDLE_TIME"]; ok {
		if mins, parseErr := strconv.Atoi(idleTime); parseErr == nil {
			return mins * 60, nil
		}
	}
	return defaultCullerTimeout, nil
}

func readUserTrackingEnabled(ctx context.Context, saClientset kubernetes.Interface, namespace string) (bool, error) {
	cm, err := saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, segmentKeyConfigName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to get segment key config: %w", err)
	}
	if cm.Data == nil {
		return false, nil
	}
	return cm.Data["segmentKeyEnabled"] == "true", nil
}

// --- ConfigMap writers ---

func (r *ClusterSettingsRepository) detectChanges(
	ctx context.Context,
	namespace string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) bool {
	if settings.PVCSize != currentPVCSize(currentConfig) {
		return true
	}
	currentTimeout, err := readCullerTimeout(ctx, r.saClientset, namespace)
	if err != nil {
		return true
	}
	return settings.CullerTimeout != currentTimeout
}

func (r *ClusterSettingsRepository) updateCullerConfig(ctx context.Context, namespace string, cullerTimeout int) error {
	cmClient := r.saClientset.CoreV1().ConfigMaps(namespace)
	cullerMinutes := cullerTimeout / 60
	isEnabled := cullerTimeout != defaultCullerTimeout

	if !isEnabled {
		err := cmClient.Delete(ctx, cullerConfigName, metav1.DeleteOptions{})
		if err != nil && !k8serrors.IsNotFound(err) {
			return fmt.Errorf("failed to delete culler config: %w", err)
		}
		return nil
	}

	cm, err := cmClient.Get(ctx, cullerConfigName, metav1.GetOptions{})
	if err != nil {
		if !k8serrors.IsNotFound(err) {
			return err
		}
		return r.createCullerConfigMap(ctx, namespace, isEnabled, cullerMinutes)
	}

	if cm.Data == nil {
		cm.Data = map[string]string{}
	}
	cm.Data["ENABLE_CULLING"] = strconv.FormatBool(isEnabled)
	cm.Data["CULL_IDLE_TIME"] = strconv.Itoa(cullerMinutes)
	_, err = cmClient.Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

func (r *ClusterSettingsRepository) createCullerConfigMap(ctx context.Context, namespace string, isEnabled bool, cullerMinutes int) error {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cullerConfigName,
			Namespace: namespace,
			Labels: map[string]string{
				"opendatahub.io/dashboard": "true",
			},
		},
		Data: map[string]string{
			"ENABLE_CULLING":        strconv.FormatBool(isEnabled),
			"CULL_IDLE_TIME":        strconv.Itoa(cullerMinutes),
			"IDLENESS_CHECK_PERIOD": defaultIdlenessCheckPeriod,
		},
	}
	_, err := r.saClientset.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
	return err
}

func (r *ClusterSettingsRepository) updateSegmentKeyConfig(ctx context.Context, namespace string, enabled bool) error {
	cmClient := r.saClientset.CoreV1().ConfigMaps(namespace)
	cm, err := cmClient.Get(ctx, segmentKeyConfigName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil
		}
		return err
	}
	if cm.Data == nil {
		cm.Data = map[string]string{}
	}
	cm.Data["segmentKeyEnabled"] = strconv.FormatBool(enabled)
	_, err = cmClient.Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

// --- Deployment rollout ---

func (r *ClusterSettingsRepository) rolloutDeployment(ctx context.Context, namespace, name string) error {
	patch := fmt.Sprintf(`{"spec":{"template":{"metadata":{"annotations":{"kubectl.kubernetes.io/restartedAt":"%s"}}}}}`,
		time.Now().UTC().Format(time.RFC3339))

	_, err := r.saClientset.AppsV1().Deployments(namespace).Patch(
		ctx, name, types.MergePatchType, []byte(patch), metav1.PatchOptions{},
	)
	return err
}
