package controller

import (
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// SetupWithManager constructs and registers the Dashboard controller.
func SetupWithManager(mgr ctrl.Manager, opts Options) error {
	r := &DashboardReconciler{
		Client:                mgr.GetClient(),
		APIReader:             mgr.GetAPIReader(),
		Scheme:                mgr.GetScheme(),
		ManifestsBasePath:     opts.ManifestsBasePath,
		Platform:              opts.Platform,
		Namespace:             opts.Namespace,
		ApplicationsNamespace: opts.ApplicationsNamespace,
	}

	// The Dashboard controller does not currently need to watch Secrets:
	// Dashboard-managed Services use service.beta.openshift.io/serving-cert-secret-name
	// to request TLS Secrets from OpenShift service-ca rather than rendering Secret
	// desired state.
	controllerBuilder := ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Dashboard{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ServiceAccount{}).
		Owns(&networkingv1.NetworkPolicy{}).
		Owns(&rbacv1.ClusterRole{}).
		Owns(&rbacv1.ClusterRoleBinding{}).
		Owns(&rbacv1.Role{}).
		Owns(&rbacv1.RoleBinding{}).
		Owns(&policyv1.PodDisruptionBudget{}).
		Watches(&corev1.Namespace{}, handler.EnqueueRequestsFromMapFunc(r.mapMaaSPortalOperatorNamespaceToDashboard), builder.WithPredicates(r.maasPortalOperatorNamespacePredicate()))
	if err := addConfigMapWatches(mgr, controllerBuilder, r); err != nil {
		return err
	}
	if err := addOptionalOwnedResourceWatches(mgr.GetRESTMapper(), controllerBuilder); err != nil {
		return err
	}
	dashboardController, err := controllerBuilder.Build(r)
	if err != nil {
		return err
	}
	return addOdhDashboardConfigWatch(mgr, dashboardController, r)
}

func addOptionalOwnedResourceWatches(mapper meta.RESTMapper, controllerBuilder *builder.Builder) error {
	resources, err := optionalOwnedResources(mapper)
	if err != nil {
		return err
	}
	for _, resource := range resources {
		controllerBuilder.Owns(resource)
	}
	return nil
}

func optionalOwnedResources(mapper meta.RESTMapper) ([]client.Object, error) {
	var resources []client.Object
	for _, resource := range []struct {
		gvk    schema.GroupVersionKind
		object client.Object
	}{
		{gvk: gatewayv1.SchemeGroupVersion.WithKind("HTTPRoute"), object: &gatewayv1.HTTPRoute{}},
		{gvk: consoleLinkGVK, object: newConsoleLinkObject()},
	} {
		available, err := apiResourceAvailable(mapper, resource.gvk)
		if err != nil {
			return nil, fmt.Errorf("discovering %s API: %w", resource.gvk, err)
		}
		if !available {
			ctrl.Log.Info("Optional API is unavailable; skipping owned-resource watch", "groupVersionKind", resource.gvk.String())
			continue
		}
		resources = append(resources, resource.object)
	}
	return resources, nil
}

func newConsoleLinkObject() *unstructured.Unstructured {
	consoleLink := &unstructured.Unstructured{}
	consoleLink.SetGroupVersionKind(consoleLinkGVK)
	return consoleLink
}

func apiResourceAvailable(mapper meta.RESTMapper, gvk schema.GroupVersionKind) (bool, error) {
	_, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if meta.IsNoMatchError(err) {
		return false, nil
	}
	return err == nil, err
}
