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
	if cm.Data == nil || cm.Data[keyCullingEnabled] != "true" {
		return defaultCullerTimeout, nil
	}
	if idleTime, ok := cm.Data[keyCullIdleTime]; ok {
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
	return cm.Data[keySegmentKeyEnabled] == "true", nil
}

// --- ConfigMap writers ---

func (r *ClusterSettingsRepository) detectChanges(ctx context.Context, cs kubernetes.Interface,
	namespace string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) (bool, error) {
	if settings.PVCSize != currentPVCSize(currentConfig) {
		return true, nil
	}
	// A failed read (for example a caller denied the culler ConfigMap) is an
	// error, not a change: it must not trigger a notebook-controller restart.
	currentTimeout, err := readCullerTimeout(ctx, cs, namespace)
	if err != nil {
		return false, err
	}
	return settings.CullerTimeout != currentTimeout, nil
}

// applyCullerConfig performs the planned culler ConfigMap operation and only
// that one: a planned create fails if the ConfigMap now exists, and a planned
// update fails if it no longer does.
func (r *ClusterSettingsRepository) applyCullerConfig(
	ctx context.Context, cs kubernetes.Interface, namespace, op string, cullerTimeout int,
) error {
	cmClient := cs.CoreV1().ConfigMaps(namespace)
	cullerMinutes := cullerTimeout / 60

	switch op {
	case cullerOpNone:
		return requireStillAbsent(ctx, cs, namespace, cullerConfigName)
	case cullerOpDelete:
		err := cmClient.Delete(ctx, cullerConfigName, metav1.DeleteOptions{})
		if err != nil && !k8serrors.IsNotFound(err) {
			return fmt.Errorf("failed to delete culler config: %w", err)
		}
		return nil
	case cullerOpCreate:
		return r.createCullerConfigMap(ctx, cs, namespace, true, cullerMinutes)
	case cullerOpUpdate:
		cm, err := cmClient.Get(ctx, cullerConfigName, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if cm.Data == nil {
			cm.Data = map[string]string{}
		}
		cm.Data[keyCullingEnabled] = strconv.FormatBool(true)
		cm.Data[keyCullIdleTime] = strconv.Itoa(cullerMinutes)
		_, err = cmClient.Update(ctx, cm, metav1.UpdateOptions{})
		return err
	default:
		return fmt.Errorf("unknown culler config operation %q", op)
	}
}

func (r *ClusterSettingsRepository) createCullerConfigMap(ctx context.Context, cs kubernetes.Interface, namespace string, isEnabled bool, cullerMinutes int) error {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      cullerConfigName,
			Namespace: namespace,
			Labels: map[string]string{
				models.LabelDashboardResource: "true",
			},
		},
		Data: map[string]string{
			keyCullingEnabled:      strconv.FormatBool(isEnabled),
			keyCullIdleTime:        strconv.Itoa(cullerMinutes),
			keyIdlenessCheckPeriod: defaultIdlenessCheckPeriod,
		},
	}
	_, err := cs.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
	return err
}

// updateSegmentKeyConfig performs the planned segment-key ConfigMap update. A
// ConfigMap removed since the plan is a conflict, so the request does not report
// success for a setting it did not store.
func (r *ClusterSettingsRepository) updateSegmentKeyConfig(ctx context.Context, cs kubernetes.Interface, namespace string, enabled bool) error {
	cmClient := cs.CoreV1().ConfigMaps(namespace)
	cm, err := cmClient.Get(ctx, segmentKeyConfigName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return planConflict(segmentKeyConfigName, "was deleted")
		}
		return err
	}
	if cm.Data == nil {
		cm.Data = map[string]string{}
	}
	cm.Data[keySegmentKeyEnabled] = strconv.FormatBool(enabled)
	_, err = cmClient.Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

// requireStillAbsent checks that a ConfigMap the plan found absent, and so
// left alone, is still absent. One created since the plan would hold a value
// this request did not write, so it is reported as a conflict instead of
// success.
func requireStillAbsent(ctx context.Context, cs kubernetes.Interface, namespace, name string) error {
	exists, err := configMapExists(ctx, cs, namespace, name)
	if err != nil {
		return err
	}
	if exists {
		return planConflict(name, "was created")
	}
	return nil
}

func planConflict(name, what string) error {
	return k8serrors.NewConflict(corev1.Resource("configmaps"), name,
		fmt.Errorf("it %s after the update was planned; reload the settings and save again", what))
}

// --- Deployment rollout ---

func (r *ClusterSettingsRepository) rolloutDeployment(ctx context.Context, cs kubernetes.Interface, namespace, name string) error {
	patch := fmt.Sprintf(`{"spec":{"template":{"metadata":{"annotations":{"%s":"%s"}}}}}`,
		annotationRestartedAt,
		time.Now().UTC().Format(time.RFC3339))

	_, err := cs.AppsV1().Deployments(namespace).Patch(
		ctx, name, types.MergePatchType, []byte(patch), metav1.PatchOptions{},
	)
	return err
}
