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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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

// Migration reads must observe the workload apply and federation hash patch
// from this reconciliation, rather than an earlier revision in the cache.
func (r *DashboardReconciler) maasPortalAPIReader() client.Reader {
	if r.APIReader != nil {
		return r.APIReader
	}
	return r.Client
}

func (r *DashboardReconciler) deployMaaSPortalRoute(ctx context.Context, dashboard *v1alpha1.Dashboard, routes []unstructured.Unstructured) (maasPortalMigrationResult, error) {
	// Both resource names still match the same browser prefix. Never apply the
	// new route until deletion of the old route has been observed.
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
// starts. Delete the old HTTPRoute and observe its absence before applying the
// replacement: Gateway API precedence can otherwise keep selecting the older
// route for the unchanged browser prefix. No migration state is stored, so a
// crash between deletion and apply resumes from the cluster's actual state.
func (r *DashboardReconciler) prepareMaaSPortalRouteMigration(ctx context.Context) (bool, error) {
	route := &gatewayv1.HTTPRoute{}
	key := client.ObjectKey{Name: legacyMaaSPortalName, Namespace: r.ApplicationsNamespace}
	if err := r.maasPortalAPIReader().Get(ctx, key, route); err != nil {
		if apierrors.IsNotFound(err) || meta.IsNoMatchError(err) {
			return true, nil
		}
		return false, fmt.Errorf("getting legacy MaaS Portal HTTPRoute: %w", err)
	}
	deployment := &appsv1.Deployment{}
	if err := r.maasPortalAPIReader().Get(ctx, client.ObjectKey{Name: maasPortalDeploymentName, Namespace: r.ApplicationsNamespace}, deployment); err != nil {
		return false, client.IgnoreNotFound(err)
	}
	if !maasPortalRolloutComplete(deployment) {
		return false, nil
	}
	config := &corev1.ConfigMap{}
	if err := r.maasPortalAPIReader().Get(ctx, client.ObjectKey{Name: maasPortalFederationConfigMapName, Namespace: r.ApplicationsNamespace}, config); err != nil {
		return false, client.IgnoreNotFound(err)
	}
	if deployment.Spec.Template.Annotations[maasPortalFederationHashAnnotation] != computeFederationConfigHash(config.Data[federationConfigKey]) {
		return false, nil
	}
	result, err := r.deleteLegacyMaaSPortalObject(ctx, route)
	return !result.Pending && err == nil, err
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
	routes := &unstructured.UnstructuredList{}
	routes.SetAPIVersion(gatewayv1.GroupVersion.String())
	routes.SetKind("HTTPRouteList")
	for _, list := range []client.ObjectList{
		&appsv1.DeploymentList{}, &corev1.ServiceList{}, &corev1.ServiceAccountList{},
		&corev1.ConfigMapList{}, &corev1.SecretList{}, &networkingv1.NetworkPolicyList{},
		&rbacv1.RoleList{}, &rbacv1.RoleBindingList{}, routes,
	} {
		deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, legacyMaaSPortalResource, client.InNamespace(r.ApplicationsNamespace))
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	for _, list := range []client.ObjectList{&rbacv1.ClusterRoleList{}, &rbacv1.ClusterRoleBindingList{}} {
		deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, legacyMaaSPortalResource)
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	// Listing across namespaces also finds grants in a formerly configured
	// operator namespace. Name-only discovery is restricted to known namespaces.
	for _, list := range []client.ObjectList{&rbacv1.RoleList{}, &rbacv1.RoleBindingList{}} {
		deleted, err := r.deleteLegacyMaaSPortalResourceList(ctx, list, r.legacyMaaSPortalSubscriptionResource)
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	return result, errors.Join(errs...)
}

func (r *DashboardReconciler) deleteLegacyMaaSPortalResourceList(ctx context.Context, list client.ObjectList, matchesLegacy func(client.Object) bool, options ...client.ListOption) (maasPortalMigrationResult, error) {
	var result maasPortalMigrationResult
	if err := r.List(ctx, list, options...); err != nil {
		if meta.IsNoMatchError(err) {
			return result, nil
		}
		return result, fmt.Errorf("listing legacy MaaS Portal resources: %w", err)
	}
	var errs []error
	objects := extractItems(list)
	for _, obj := range objects {
		if !matchesLegacy(obj) {
			continue
		}
		deleted, err := r.deleteLegacyMaaSPortalObject(ctx, obj)
		result.Pending = result.Pending || deleted.Pending
		errs = append(errs, err)
	}
	return result, errors.Join(errs...)
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
	if err := r.maasPortalAPIReader().Get(ctx, client.ObjectKeyFromObject(obj), remaining); err != nil {
		return maasPortalMigrationResult{}, client.IgnoreNotFound(err)
	}
	return maasPortalMigrationResult{Pending: true}, nil
}
