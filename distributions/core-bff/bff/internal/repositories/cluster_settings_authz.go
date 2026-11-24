package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

// clusterSettingsWrite is one write an update will perform.
type clusterSettingsWrite struct {
	group, resource, verb, name string
}

// Culler ConfigMap operations a plan can choose.
const (
	cullerOpNone   = "none" // the stored value already matches, or culling is off and the ConfigMap absent
	cullerOpDelete = "delete"
	cullerOpCreate = "create"
	cullerOpUpdate = "update"
)

// ClusterSettingsPlan is the fixed set of writes one PUT /api/cluster-settings
// makes. PlanUpdate builds it once, from one read of the cluster, and
// UpdateConfigMaps executes exactly those writes, so the operations that run
// are the ones the preflight checked.
//
// The plan keeps the ConfigMaps it read (nil when absent). Every write and
// every left-alone check is bound to that read's resourceVersion: a ConfigMap
// that changed since the plan is a conflict, so the rollout decision, which
// was made from that read, always matches what was stored.
type ClusterSettingsPlan struct {
	settings         models.ClusterSettings
	culler           *corev1.ConfigMap
	segmentKey       *corev1.ConfigMap
	cullerOp         string
	updateSegmentKey bool
	trackingManaged  bool
	pvcChanged       bool
	rollout          bool
	writes           []clusterSettingsWrite
}

// PlanUpdate decides every write PUT /api/cluster-settings will make: the
// OdhDashboardConfig patch, the culler and segment-key ConfigMap writes, and
// the notebook-controller rollout when one is needed.
//
// The update is several independent API calls with no transaction. Under the
// caller policy (xKS), PlanUpdate also checks, before anything is written, that
// the caller may perform every planned write. Without this check, a caller
// allowed the first write but denied a later one would commit a partial change
// before the denial. A denial is returned as a Kubernetes Forbidden error, which
// the handler surfaces as 403. Under the service-account policy the service
// account performs the writes, so no access review is made.
//
// The reads the plan depends on (whether a ConfigMap exists) use the clients the
// credential policy selects, so a caller who may not read one gets that read's
// own 403.
func (r *ClusterSettingsRepository) PlanUpdate(
	ctx context.Context,
	namespace, dashboardConfigName string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) (*ClusterSettingsPlan, error) {
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	plan, err := r.buildPlan(ctx, cs, namespace, dashboardConfigName, settings, currentConfig)
	if err != nil {
		return nil, err
	}
	if r.clients.policy != CredentialPolicyCaller {
		return plan, nil
	}
	for _, w := range plan.writes {
		review := &authv1.SelfSubjectAccessReview{
			Spec: authv1.SelfSubjectAccessReviewSpec{
				ResourceAttributes: &authv1.ResourceAttributes{
					Namespace: namespace,
					Group:     w.group,
					Resource:  w.resource,
					Verb:      w.verb,
					Name:      w.name,
				},
			},
		}
		resp, err := cs.AuthorizationV1().SelfSubjectAccessReviews().Create(ctx, review, metav1.CreateOptions{})
		if err != nil {
			return nil, fmt.Errorf("access review for %s %s: %w", w.verb, w.resource, err)
		}
		if !resp.Status.Allowed {
			return nil, k8serrors.NewForbidden(
				schema.GroupResource{Group: w.group, Resource: w.resource}, w.name,
				fmt.Errorf("the caller may not %s it, so no cluster setting was changed", w.verb),
			)
		}
	}
	return plan, nil
}

// buildPlan reads the cluster once and fixes the writes for these settings.
// A ConfigMap write is planned only when it would change the stored value, so a
// change to another setting does not need write access to an unchanged map.
// UpdateConfigMaps executes the plan and never re-decides an operation.
func (r *ClusterSettingsRepository) buildPlan(
	ctx context.Context, cs kubernetes.Interface,
	namespace, dashboardConfigName string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) (*ClusterSettingsPlan, error) {
	plan := &ClusterSettingsPlan{settings: *settings}
	plan.writes = []clusterSettingsWrite{{
		group: models.DashboardConfigGVR.Group, resource: models.DashboardConfigGVR.Resource, verb: "patch", name: dashboardConfigName,
	}}

	culler, err := getConfigMap(ctx, cs, namespace, cullerConfigName)
	if err != nil {
		return nil, err
	}
	plan.culler = culler
	// The stored values are read exactly as GET reads them, so a setting GET
	// showed unchanged needs no write: ENABLE_CULLING other than "true" is off,
	// and an absent segmentKeyEnabled is tracking disabled.
	currentTimeout := cullerTimeoutOf(culler)
	switch {
	case settings.CullerTimeout == currentTimeout:
		// Unchanged, including culling off with the ConfigMap absent or disabled.
		plan.cullerOp = cullerOpNone
	case settings.CullerTimeout == defaultCullerTimeout:
		plan.cullerOp = cullerOpDelete
		plan.writes = append(plan.writes, clusterSettingsWrite{resource: "configmaps", verb: "delete", name: cullerConfigName})
	case culler == nil:
		plan.cullerOp = cullerOpCreate
		// RBAC cannot scope create by name, so the review is for any ConfigMap.
		plan.writes = append(plan.writes, clusterSettingsWrite{resource: "configmaps", verb: "create"})
	default:
		plan.cullerOp = cullerOpUpdate
		plan.writes = append(plan.writes, clusterSettingsWrite{resource: "configmaps", verb: "update", name: cullerConfigName})
	}

	// With tracking disabled in the dashboard config, GET neither reads nor
	// shows the setting and the form cannot change it, so the plan neither reads
	// nor writes the segment-key ConfigMap: a save then needs no access to it.
	plan.trackingManaged = currentConfig != nil && !currentConfig.Spec.DashboardConfig.DisableTracking
	if plan.trackingManaged {
		segmentKey, err := getConfigMap(ctx, cs, namespace, segmentKeyConfigName)
		if err != nil {
			return nil, err
		}
		plan.segmentKey = segmentKey
		if segmentKey == nil && settings.UserTrackingEnabled {
			// Tracking can only be stored in a provisioned segment-key ConfigMap;
			// reporting success would claim a setting that was not stored.
			return nil, fmt.Errorf("user tracking cannot be enabled: the %s ConfigMap is not provisioned", segmentKeyConfigName)
		}
		if segmentKey != nil && trackingEnabledOf(segmentKey) != settings.UserTrackingEnabled {
			plan.updateSegmentKey = true
			plan.writes = append(plan.writes, clusterSettingsWrite{resource: "configmaps", verb: "update", name: segmentKeyConfigName})
		}
	}

	// The rollout decision uses the same read the writes are bound to.
	plan.pvcChanged = settings.PVCSize != currentPVCSize(currentConfig)
	if plan.pvcChanged || settings.CullerTimeout != currentTimeout {
		plan.rollout = true
		plan.writes = append(plan.writes, clusterSettingsWrite{group: "apps", resource: "deployments", verb: "patch", name: notebookControllerDeploy})
	}
	return plan, nil
}

// getConfigMap returns the named ConfigMap, nil when it does not exist, or the
// read's error.
func getConfigMap(ctx context.Context, cs kubernetes.Interface, namespace, name string) (*corev1.ConfigMap, error) {
	cm, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	switch {
	case err == nil:
		return cm, nil
	case k8serrors.IsNotFound(err):
		return nil, nil
	default:
		return nil, err
	}
}

// SurfacesAuthFailure reports whether an error from a cluster-settings write
// must reach the client as the API server's 401/403 (caller policy) rather than
// the legacy 200 response with success=false.
func (r *ClusterSettingsRepository) SurfacesAuthFailure(err error) bool {
	return r.clients.surfacesAuthFailure(err)
}
