package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	authv1 "k8s.io/api/authorization/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
)

// clusterSettingsWrite is one write an update will perform.
type clusterSettingsWrite struct {
	group, resource, verb, name string
}

// AuthorizeUpdate checks, before anything is written, that the caller may
// perform every write PUT /api/cluster-settings will make: the OdhDashboardConfig
// patch, the culler and segment-key ConfigMap writes, and the
// notebook-controller rollout when one is needed.
//
// The update is several independent API calls with no transaction. Without this
// check, a caller allowed the first write but denied a later one would commit a
// partial change before the denial. Under the caller policy (xKS) a denial is
// returned as a Kubernetes Forbidden error, which the handler surfaces as 403.
// Under the service-account policy the service account performs the writes, so
// there is nothing to check here and it returns nil.
//
// A read the plan depends on (whether a ConfigMap exists) is made with the
// caller's credentials too, so a caller who may not read it gets that read's
// own 403.
func (r *ClusterSettingsRepository) AuthorizeUpdate(
	ctx context.Context,
	namespace, dashboardConfigName string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) error {
	if r.clients.policy != CredentialPolicyCaller {
		return nil
	}
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return err
	}
	writes, err := r.plannedWrites(ctx, cs, namespace, dashboardConfigName, settings, currentConfig)
	if err != nil {
		return err
	}
	for _, w := range writes {
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
			return fmt.Errorf("access review for %s %s: %w", w.verb, w.resource, err)
		}
		if !resp.Status.Allowed {
			return k8serrors.NewForbidden(
				schema.GroupResource{Group: w.group, Resource: w.resource}, w.name,
				fmt.Errorf("the caller may not %s it, so no cluster setting was changed", w.verb),
			)
		}
	}
	return nil
}

// plannedWrites mirrors the writes UpdateConfigMaps and the dashboard-config
// patch make for these settings. Keep it in step with updateCullerConfig,
// updateSegmentKeyConfig and the rollout in UpdateConfigMaps.
func (r *ClusterSettingsRepository) plannedWrites(
	ctx context.Context, cs kubernetes.Interface,
	namespace, dashboardConfigName string, settings *models.ClusterSettings, currentConfig *models.DashboardConfig,
) ([]clusterSettingsWrite, error) {
	writes := []clusterSettingsWrite{{
		group: models.DashboardConfigGVR.Group, resource: models.DashboardConfigGVR.Resource, verb: "patch", name: dashboardConfigName,
	}}

	if settings.CullerTimeout == defaultCullerTimeout {
		writes = append(writes, clusterSettingsWrite{resource: "configmaps", verb: "delete", name: cullerConfigName})
	} else {
		exists, err := configMapExists(ctx, cs, namespace, cullerConfigName)
		if err != nil {
			return nil, err
		}
		if exists {
			writes = append(writes, clusterSettingsWrite{resource: "configmaps", verb: "update", name: cullerConfigName})
		} else {
			// RBAC cannot scope create by name, so the review is for any ConfigMap.
			writes = append(writes, clusterSettingsWrite{resource: "configmaps", verb: "create"})
		}
	}

	exists, err := configMapExists(ctx, cs, namespace, segmentKeyConfigName)
	if err != nil {
		return nil, err
	}
	if exists {
		writes = append(writes, clusterSettingsWrite{resource: "configmaps", verb: "update", name: segmentKeyConfigName})
	}

	if r.detectChanges(ctx, cs, namespace, settings, currentConfig) {
		writes = append(writes, clusterSettingsWrite{group: "apps", resource: "deployments", verb: "patch", name: notebookControllerDeploy})
	}
	return writes, nil
}

func configMapExists(ctx context.Context, cs kubernetes.Interface, namespace, name string) (bool, error) {
	_, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	switch {
	case err == nil:
		return true, nil
	case k8serrors.IsNotFound(err):
		return false, nil
	default:
		return false, err
	}
}

// SurfacesAuthFailure reports whether an error from a cluster-settings write
// must reach the client as the API server's 401/403 (caller policy) rather than
// the legacy 200 response with success=false.
func (r *ClusterSettingsRepository) SurfacesAuthFailure(err error) bool {
	return r.clients.surfacesAuthFailure(err)
}
