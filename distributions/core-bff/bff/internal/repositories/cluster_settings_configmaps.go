package repositories

import (
	"context"
	"fmt"
	"strconv"
	"strings"
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
	cm, err := getConfigMap(ctx, saClientset, namespace, cullerConfigName)
	if err != nil {
		return 0, fmt.Errorf("failed to get culler config: %w", err)
	}
	return cullerTimeoutOf(cm), nil
}

// cullerTimeoutOf returns the culler timeout, in seconds, a culler ConfigMap
// stores; defaultCullerTimeout (culling off) when it is nil or disabled.
func cullerTimeoutOf(cm *corev1.ConfigMap) int {
	if !cullingFlagOn(cm) {
		return defaultCullerTimeout
	}
	if idleTime, ok := cm.Data[keyCullIdleTime]; ok {
		if mins, parseErr := strconv.Atoi(idleTime); parseErr == nil {
			return mins * 60
		}
	}
	return defaultCullerTimeout
}

func readUserTrackingEnabled(ctx context.Context, saClientset kubernetes.Interface, namespace string) (bool, error) {
	cm, err := getConfigMap(ctx, saClientset, namespace, segmentKeyConfigName)
	if err != nil {
		return false, fmt.Errorf("failed to get segment key config: %w", err)
	}
	return trackingEnabledOf(cm), nil
}

// cullingFlagOn reports whether a culler ConfigMap turns culling on
// (ENABLE_CULLING "true", in any case).
func cullingFlagOn(cm *corev1.ConfigMap) bool {
	return cm != nil && strings.EqualFold(cm.Data[keyCullingEnabled], "true")
}

// trackingEnabledOf returns the user-tracking setting a segment-key ConfigMap
// stores: only segmentKeyEnabled "true" is enabled; nil, absent or any other
// value is disabled.
func trackingEnabledOf(cm *corev1.ConfigMap) bool {
	return cm != nil && cm.Data[keySegmentKeyEnabled] == "true"
}

// --- ConfigMap writers ---

// applyCullerConfig performs the planned culler ConfigMap operation and only
// that one, bound to the ConfigMap the plan read: a planned create fails if the
// ConfigMap now exists, a planned update or delete fails with a conflict if it
// changed, and a ConfigMap left alone must be unchanged.
func (r *ClusterSettingsRepository) applyCullerConfig(ctx context.Context, cs kubernetes.Interface, namespace string, plan *ClusterSettingsPlan) error {
	cmClient := cs.CoreV1().ConfigMaps(namespace)
	cullerMinutes := plan.settings.CullerTimeout / 60

	switch plan.cullerOp {
	case cullerOpNone:
		return requireUnchanged(ctx, cs, namespace, cullerConfigName, plan.culler)
	case cullerOpDelete:
		rv := plan.culler.ResourceVersion
		err := cmClient.Delete(ctx, cullerConfigName, metav1.DeleteOptions{Preconditions: &metav1.Preconditions{ResourceVersion: &rv}})
		if k8serrors.IsNotFound(err) {
			// Already gone: the planned state holds, and the planned rollout follows.
			return nil
		}
		return err
	case cullerOpCreate:
		return r.createCullerConfigMap(ctx, cs, namespace, true, cullerMinutes)
	case cullerOpUpdate:
		cm := plan.culler.DeepCopy()
		if cm.Data == nil {
			cm.Data = map[string]string{}
		}
		cm.Data[keyCullingEnabled] = strconv.FormatBool(true)
		cm.Data[keyCullIdleTime] = strconv.Itoa(cullerMinutes)
		_, err := cmClient.Update(ctx, cm, metav1.UpdateOptions{})
		if k8serrors.IsNotFound(err) {
			return planConflict(cullerConfigName, "was deleted")
		}
		return err
	default:
		return fmt.Errorf("unknown culler config operation %q", plan.cullerOp)
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

// applySegmentKeyConfig performs the planned segment-key ConfigMap update,
// bound to the ConfigMap the plan read, or checks that a ConfigMap the plan left
// alone is unchanged. A ConfigMap changed or removed since the plan is a
// conflict, so the request does not report success for a setting it did not
// store.
func (r *ClusterSettingsRepository) applySegmentKeyConfig(ctx context.Context, cs kubernetes.Interface, namespace string, plan *ClusterSettingsPlan) error {
	if !plan.trackingManaged {
		return nil
	}
	if !plan.updateSegmentKey {
		return requireUnchanged(ctx, cs, namespace, segmentKeyConfigName, plan.segmentKey)
	}
	cm := plan.segmentKey.DeepCopy()
	if cm.Data == nil {
		cm.Data = map[string]string{}
	}
	cm.Data[keySegmentKeyEnabled] = strconv.FormatBool(plan.settings.UserTrackingEnabled)
	_, err := cs.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if k8serrors.IsNotFound(err) {
		return planConflict(segmentKeyConfigName, "was deleted")
	}
	return err
}

// requireUnchanged checks that a ConfigMap the plan left alone is as the plan
// read it: still absent when planned is nil, otherwise at the same
// resourceVersion. One created or changed since the plan holds a value this
// request did not write or check, so it is reported as a conflict instead of
// success.
func requireUnchanged(ctx context.Context, cs kubernetes.Interface, namespace, name string, planned *corev1.ConfigMap) error {
	current, err := getConfigMap(ctx, cs, namespace, name)
	if err != nil {
		return err
	}
	switch {
	case planned == nil && current != nil:
		return planConflict(name, "was created")
	case planned != nil && current == nil:
		return planConflict(name, "was deleted")
	case planned != nil && current.ResourceVersion != planned.ResourceVersion:
		return planConflict(name, "was changed")
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
