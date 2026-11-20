package controller

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	routev1 "github.com/openshift/api/route/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/equality"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"
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
		Owns(&corev1.Service{}, builder.WithPredicates(serviceChangedPredicate())).
		// ServiceAccounts are watched for ownership drift only; the reconciler never
		// reads their spec/status from cache, so a metadata-only informer suffices.
		Owns(&corev1.ServiceAccount{}, builder.OnlyMetadata).
		Owns(&networkingv1.NetworkPolicy{}).
		Owns(&rbacv1.ClusterRole{}).
		Owns(&rbacv1.ClusterRoleBinding{}).
		Owns(&rbacv1.Role{}).
		Owns(&rbacv1.RoleBinding{}).
		Owns(&policyv1.PodDisruptionBudget{}, builder.WithPredicates(podDisruptionBudgetChangedPredicate())).
		Watches(&corev1.Namespace{}, handler.EnqueueRequestsFromMapFunc(r.mapMaaSPortalOperatorNamespaceToDashboard), builder.WithPredicates(r.maasPortalOperatorNamespacePredicate()))
	if err := addConfigMapWatches(mgr, controllerBuilder, r); err != nil {
		return err
	}
	if err := addXKSCertificateWatch(mgr, controllerBuilder, r); err != nil {
		return err
	}
	routeAPIAvailable, err := apiResourceAvailable(mgr.GetRESTMapper(), routev1.SchemeGroupVersion.WithKind("Route"))
	if err != nil {
		return fmt.Errorf("discovering OpenShift Route API: %w", err)
	}
	r.RouteAPIAvailable = routeAPIAvailable
	if err := addOptionalOwnedResourceWatches(mgr.GetRESTMapper(), controllerBuilder); err != nil {
		return err
	}
	dashboardController, err := controllerBuilder.Build(r)
	if err != nil {
		return err
	}
	return addOdhDashboardConfigWatch(mgr, dashboardController, r)
}

var certificateGVK = schema.GroupVersionKind{Group: "cert-manager.io", Version: "v1", Kind: "Certificate"}

// addXKSCertificateWatch watches the one Certificate rendered for the XKS
// dashboard. It uses its own selector-scoped cache so the shared manager cache
// neither lists nor retains unrelated cert-manager Certificates.
func addXKSCertificateWatch(mgr ctrl.Manager, controllerBuilder *builder.Builder, r *DashboardReconciler) error {
	if r.Platform != cluster.XKS {
		return nil
	}
	available, err := apiResourceAvailable(mgr.GetRESTMapper(), certificateGVK)
	if err != nil {
		return fmt.Errorf("discovering cert-manager Certificate API: %w", err)
	}
	if !available {
		ctrl.Log.Info("Certificate API is unavailable; skipping XKS Certificate watch", "groupVersionKind", certificateGVK.String())
		return nil
	}

	certificateCache, err := newXKSCertificateCache(mgr, r.ApplicationsNamespace)
	if err != nil {
		return err
	}
	certificate := &unstructured.Unstructured{}
	certificate.SetGroupVersionKind(certificateGVK)
	controllerBuilder.WatchesRawSource(source.Kind(
		certificateCache,
		certificate,
		handler.TypedEnqueueRequestsFromMapFunc(func(_ context.Context, certificate *unstructured.Unstructured) []reconcile.Request {
			return r.mapXKSCertificateToDashboard(certificate)
		}),
		predicate.TypedGenerationChangedPredicate[*unstructured.Unstructured]{},
	))
	return nil
}

func (r *DashboardReconciler) mapXKSCertificateToDashboard(certificate client.Object) []reconcile.Request {
	if certificate == nil || certificate.GetNamespace() != r.ApplicationsNamespace || certificate.GetName() != rhaiiDashboardTLSName {
		return nil
	}
	return []reconcile.Request{{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}}}
}

func serviceChangedPredicate() predicate.Predicate {
	return predicate.Funcs{UpdateFunc: func(e event.UpdateEvent) bool {
		oldService, oldOK := e.ObjectOld.(*corev1.Service)
		newService, newOK := e.ObjectNew.(*corev1.Service)
		if !oldOK || !newOK {
			return true
		}
		return !equality.Semantic.DeepEqual(oldService.Spec, newService.Spec) || objectMetadataChanged(oldService, newService)
	}}
}

func podDisruptionBudgetChangedPredicate() predicate.Predicate {
	return predicate.Funcs{UpdateFunc: func(e event.UpdateEvent) bool {
		oldPDB, oldOK := e.ObjectOld.(*policyv1.PodDisruptionBudget)
		newPDB, newOK := e.ObjectNew.(*policyv1.PodDisruptionBudget)
		if !oldOK || !newOK {
			return true
		}
		return !equality.Semantic.DeepEqual(oldPDB.Spec, newPDB.Spec) || objectMetadataChanged(oldPDB, newPDB)
	}}
}

func objectMetadataChanged(oldObject, newObject client.Object) bool {
	return !equality.Semantic.DeepEqual(oldObject.GetLabels(), newObject.GetLabels()) ||
		!equality.Semantic.DeepEqual(oldObject.GetAnnotations(), newObject.GetAnnotations()) ||
		!equality.Semantic.DeepEqual(oldObject.GetOwnerReferences(), newObject.GetOwnerReferences()) ||
		!equality.Semantic.DeepEqual(oldObject.GetFinalizers(), newObject.GetFinalizers()) ||
		!equality.Semantic.DeepEqual(oldObject.GetDeletionTimestamp(), newObject.GetDeletionTimestamp())
}

func addOptionalOwnedResourceWatches(mapper meta.RESTMapper, controllerBuilder *builder.Builder) error {
	resources, err := optionalOwnedResources(mapper)
	if err != nil {
		return err
	}
	for _, resource := range resources {
		// ConsoleLink is watched for ownership drift only and is never read from
		// cache (teardown lists it directly via the API reader), so a metadata-only
		// informer suffices. HTTPRoute status drives MaaS portal availability, so it
		// must keep its full-object informer.
		if resource.GetObjectKind().GroupVersionKind() == consoleLinkGVK {
			controllerBuilder.Owns(resource, builder.OnlyMetadata)
			continue
		}
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
		{gvk: routev1.SchemeGroupVersion.WithKind("Route"), object: &routev1.Route{}},
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
