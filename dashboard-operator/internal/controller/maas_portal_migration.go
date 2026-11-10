package controller

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const legacyMaaSPortalName = "maas-consumer-portal"

// Pending represents expected asynchronous work, such as a rollout or deletion
// held by a finalizer. API failures are returned separately as errors.
type maasPortalMigrationResult struct {
	Pending bool
}

func (r *DashboardReconciler) deployMaaSPortalRoute(ctx context.Context, dashboard *v1alpha1.Dashboard, routes []unstructured.Unstructured) (maasPortalMigrationResult, error) {
	// Retire the legacy endpoint before publishing the replacement. Never apply
	// the new route until deletion of the old route has been observed.
	routeAllowed, err := r.prepareMaaSPortalRouteMigration(ctx)
	if err != nil {
		return maasPortalMigrationResult{}, err
	}
	if !routeAllowed {
		return maasPortalMigrationResult{Pending: true}, nil
	}
	if err := r.deployMaaSPortalResources(ctx, dashboard, routes); err != nil {
		return maasPortalMigrationResult{}, fmt.Errorf("deploying MaaS Portal HTTPRoute: %w", err)
	}
	return maasPortalMigrationResult{}, nil
}

// prepareMaaSPortalRouteMigration keeps the old endpoint while the new workload
// starts, including when resources were renamed before the browser prefix.
// Delete a legacy-named HTTPRoute and observe its absence before applying the
// replacement; a renamed route is updated in place after rollout. No migration
// state is stored, so retries resume from the cluster's actual state.
func (r *DashboardReconciler) prepareMaaSPortalRouteMigration(ctx context.Context) (bool, error) {
	route := &gatewayv1.HTTPRoute{}
	key := client.ObjectKey{Name: legacyMaaSPortalName, Namespace: r.ApplicationsNamespace}
	if err := r.apiReader().Get(ctx, key, route); err != nil {
		if meta.IsNoMatchError(err) {
			return true, nil
		}
		if !apierrors.IsNotFound(err) {
			return false, fmt.Errorf("getting legacy MaaS Portal HTTPRoute: %w", err)
		}
		key.Name = maasPortalDeploymentName
		if err := r.apiReader().Get(ctx, key, route); err != nil {
			if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) {
				return true, nil
			}
			return false, fmt.Errorf("getting MaaS Portal HTTPRoute: %w", err)
		}
		if !maasPortalRouteUsesLegacyPrefix(route) {
			return true, nil
		}
	}
	deployment := &appsv1.Deployment{}
	if err := r.apiReader().Get(ctx, client.ObjectKey{Name: maasPortalDeploymentName, Namespace: r.ApplicationsNamespace}, deployment); err != nil {
		return false, client.IgnoreNotFound(err)
	}
	if !maasPortalRolloutComplete(deployment) {
		return false, nil
	}
	config := &corev1.ConfigMap{}
	if err := r.apiReader().Get(ctx, client.ObjectKey{Name: maasPortalFederationConfigMapName, Namespace: r.ApplicationsNamespace}, config); err != nil {
		return false, client.IgnoreNotFound(err)
	}
	if deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation] != computeFederationConfigHash(config.Data[federationConfigKey]) {
		return false, nil
	}
	if route.Name == maasPortalDeploymentName {
		return true, nil
	}
	result, err := r.deleteLegacyMaaSPortalObject(ctx, route)
	return !result.Pending && err == nil, err
}

func maasPortalRouteUsesLegacyPrefix(route *gatewayv1.HTTPRoute) bool {
	prefix := "/" + legacyMaaSPortalName
	for _, rule := range route.Spec.Rules {
		for _, match := range rule.Matches {
			if match.Path != nil && match.Path.Value != nil &&
				(*match.Path.Value == prefix || strings.HasPrefix(*match.Path.Value, prefix+"/")) {
				return true
			}
		}
	}
	return false
}

func maasPortalRolloutComplete(deployment *appsv1.Deployment) bool {
	if deployment.DeletionTimestamp != nil || !deploymentAvailable(deployment) {
		return false
	}
	replicas := int32(1)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}
	// Available can be supplied by old pods during a rolling update. Require
	// all desired replicas to be updated and available, with no old replicas.
	return replicas > 0 && deployment.Status.UpdatedReplicas == replicas &&
		deployment.Status.Replicas == replicas && deployment.Status.ReadyReplicas == replicas &&
		deployment.Status.AvailableReplicas == replicas
}

// deleteLegacyMaaSPortalResources handles both migration and teardown. Select
// legacy labels as well as reserved names, because generated TLS Secrets have
// no portal labels and older installations may have incomplete labels.
func (r *DashboardReconciler) deleteLegacyMaaSPortalResources(ctx context.Context) (maasPortalMigrationResult, error) {
	var result maasPortalMigrationResult
	var errs []error
	seen := map[string]bool{}
	routes := &gatewayv1.HTTPRouteList{}
	namespacedLists := []client.ObjectList{
		&appsv1.DeploymentList{}, &corev1.ServiceList{}, &corev1.ServiceAccountList{},
		&corev1.ConfigMapList{}, &corev1.SecretList{}, &networkingv1.NetworkPolicyList{},
		&rbacv1.RoleList{}, &rbacv1.RoleBindingList{}, routes,
	}
	for _, label := range []string{labels.PlatformPartOf, "app.kubernetes.io/part-of"} {
		for _, list := range namespacedLists {
			deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, legacyMaaSPortalResource, seen,
				client.InNamespace(r.ApplicationsNamespace), client.MatchingLabels{label: legacyMaaSPortalName})
			result.Pending = result.Pending || deleted.Pending
			errs = append(errs, err)
		}
		for _, list := range []client.ObjectList{&rbacv1.ClusterRoleList{}, &rbacv1.ClusterRoleBindingList{}} {
			deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, legacyMaaSPortalResource, seen,
				client.MatchingLabels{label: legacyMaaSPortalName})
			result.Pending = result.Pending || deleted.Pending
			errs = append(errs, err)
		}
		// Subscription grants can be legacy-labelled in a previous operator
		// namespace. This is the intentionally cross-namespace discovery path.
		for _, list := range []client.ObjectList{&rbacv1.RoleList{}, &rbacv1.RoleBindingList{}} {
			deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, r.legacyMaaSPortalSubscriptionResource, seen,
				client.MatchingLabels{label: legacyMaaSPortalName})
			result.Pending = result.Pending || deleted.Pending
			errs = append(errs, err)
		}
	}
	for _, obj := range r.legacyMaaSPortalKnownObjects() {
		deleted, err := r.deleteLegacyMaaSPortalKnownObject(ctx, obj, seen)
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	return result, errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLegacyMaaSPortalResourceList(ctx context.Context, list client.ObjectList, matchesLegacy func(client.Object) bool, seen map[string]bool, options ...client.ListOption) (maasPortalMigrationResult, error) {
	var result maasPortalMigrationResult
	if err := r.apiReader().List(ctx, list, options...); err != nil {
		if meta.IsNoMatchError(err) || runtime.IsNotRegisteredError(err) {
			return result, nil
		}
		return result, fmt.Errorf("listing legacy MaaS Portal resources: %w", err)
	}
	var errs []error
	objects := extractItems(list)
	for _, obj := range objects {
		key := legacyMaaSPortalObjectKey(obj)
		if !matchesLegacy(obj) || seen[key] {
			continue
		}
		seen[key] = true
		deleted, err := r.deleteLegacyMaaSPortalObject(ctx, obj)
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	return result, errors.Join(errs...)
}

func legacyMaaSPortalObjectKey(obj client.Object) string {
	return fmt.Sprintf("%T/%s/%s", obj, obj.GetNamespace(), obj.GetName())
}

// legacyMaaSPortalKnownObjects covers the finite set of historic names that
// may lack labels (notably the service-ca TLS Secret). Name discovery is
// intentionally namespace-scoped; label discovery above remains the only
// cross-namespace path.
func (r *DashboardReconciler) legacyMaaSPortalKnownObjects() []client.Object {
	ns := r.ApplicationsNamespace
	objects := []client.Object{
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: ns}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: ns}},
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: ns}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-params", Namespace: ns}},
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-federation-config", Namespace: ns}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-tls", Namespace: ns}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: ns}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName + "-perses", Namespace: ns}},
		&gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: ns}},
		&rbacv1.ClusterRole{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName}},
		&rbacv1.ClusterRoleBinding{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName}},
	}
	for _, subscriptionNamespace := range r.maasPortalSubscriptionNamespaces() {
		for _, name := range []string{legacyMaaSPortalName + "-rhods-operator-subscription", legacyMaaSPortalName + "-opendatahub-operator-subscription"} {
			objects = append(objects,
				&rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: subscriptionNamespace}},
				&rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: subscriptionNamespace}},
			)
		}
	}
	return objects
}

func (r *DashboardReconciler) deleteLegacyMaaSPortalKnownObject(ctx context.Context, obj client.Object, seen map[string]bool) (maasPortalMigrationResult, error) {
	if err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(obj), obj); err != nil {
		if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) || runtime.IsNotRegisteredError(err) {
			return maasPortalMigrationResult{}, nil
		}
		return maasPortalMigrationResult{}, fmt.Errorf("getting legacy MaaS Portal resource: %w", err)
	}
	key := legacyMaaSPortalObjectKey(obj)
	if seen[key] || !legacyMaaSPortalResource(obj) {
		return maasPortalMigrationResult{}, nil
	}
	seen[key] = true
	if _, isHTTPRoute := obj.(*gatewayv1.HTTPRoute); isHTTPRoute {
		// A direct typed Get may not populate TypeMeta. Preserve the GVK for
		// clients/interceptors that need it when issuing the delete.
		obj.GetObjectKind().SetGroupVersionKind(gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute"))
	}
	return r.deleteLegacyMaaSPortalObject(ctx, obj)
}

// Reserved names identify older objects with missing labels. New portal names
// and labels always take precedence; a shared platform label protects objects
// discovered only through the legacy application label.
func legacyMaaSPortalResource(obj client.Object) bool {
	partOf := obj.GetLabels()[labels.PlatformPartOf]
	if partOf == maasPortalPartOf || obj.GetName() == maasPortalDeploymentName ||
		strings.HasPrefix(obj.GetName(), maasPortalDeploymentName+"-") {
		return false
	}
	legacyName := legacyMaaSPortalResourceName(obj.GetName())
	if !legacyName && partOf != "" && partOf != legacyMaaSPortalName {
		return false
	}
	return legacyName || hasLegacyMaaSPortalLabel(obj)
}

// Subscription grants can be discovered across namespaces by legacy label.
// Without that label, reserved names are trusted only in operator namespaces.
func (r *DashboardReconciler) legacyMaaSPortalSubscriptionResource(obj client.Object) bool {
	if !legacyMaaSPortalResource(obj) {
		return false
	}
	if obj.GetName() != legacyMaaSPortalName+"-rhods-operator-subscription" &&
		obj.GetName() != legacyMaaSPortalName+"-opendatahub-operator-subscription" {
		return false
	}
	return hasLegacyMaaSPortalLabel(obj) || slices.Contains(r.maasPortalSubscriptionNamespaces(), obj.GetNamespace())
}

func hasLegacyMaaSPortalLabel(obj client.Object) bool {
	return obj.GetLabels()[labels.PlatformPartOf] == legacyMaaSPortalName ||
		obj.GetLabels()["app.kubernetes.io/part-of"] == legacyMaaSPortalName
}

func legacyMaaSPortalResourceName(name string) bool {
	return slices.Contains([]string{
		legacyMaaSPortalName, legacyMaaSPortalName + "-tls", legacyMaaSPortalName + "-perses",
		legacyMaaSPortalName + "-params", legacyMaaSPortalName + "-federation-config",
		legacyMaaSPortalName + "-rhods-operator-subscription",
		legacyMaaSPortalName + "-opendatahub-operator-subscription",
	}, name)
}

func (r *DashboardReconciler) deleteLegacyMaaSPortalObject(ctx context.Context, obj client.Object) (maasPortalMigrationResult, error) {
	// Use the observed UID so a concurrently replaced object is never deleted.
	uid := obj.GetUID()
	err := r.Delete(ctx, obj, client.Preconditions{UID: &uid})
	// Ignore NotFound, but surface UID conflicts so reconciliation re-evaluates
	// the replacement object instead of retrying deletion without the precondition.
	if client.IgnoreNotFound(err) != nil {
		return maasPortalMigrationResult{}, fmt.Errorf("deleting legacy MaaS Portal %T %s/%s: %w", obj, obj.GetNamespace(), obj.GetName(), err)
	}
	remaining := obj.DeepCopyObject().(client.Object)
	if err := r.apiReader().Get(ctx, client.ObjectKeyFromObject(obj), remaining); err != nil {
		return maasPortalMigrationResult{}, client.IgnoreNotFound(err)
	}
	return maasPortalMigrationResult{Pending: true}, nil
}
