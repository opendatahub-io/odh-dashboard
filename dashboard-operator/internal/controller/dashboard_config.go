package controller

import (
	"context"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const odhDashboardConfigName = "odh-dashboard-config"

var odhDashboardConfigGVK = schema.GroupVersionKind{
	Group:   "opendatahub.io",
	Version: "v1alpha",
	Kind:    "OdhDashboardConfig",
}

func newOdhDashboardConfig() *unstructured.Unstructured {
	config := &unstructured.Unstructured{}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	return config
}

// reconcileRHOAIDashboardConfigDefaults initializes RHOAI-only defaults that
// must be correct even when another component wins the create race. The
// OdhDashboardConfig remains user-managed: explicit values and every unrelated
// field are preserved.
func (r *DashboardReconciler) reconcileRHOAIDashboardConfigDefaults(ctx context.Context) error {
	if r.Platform != cluster.SelfManagedRhoai {
		return nil
	}

	config := newOdhDashboardConfig()
	key := types.NamespacedName{Name: odhDashboardConfigName, Namespace: r.ApplicationsNamespace}
	if err := r.Get(ctx, key, config); err != nil {
		if k8serrors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("get OdhDashboardConfig %s: %w", key, err)
	}

	_, found, err := unstructured.NestedBool(config.Object, "spec", "dashboardConfig", "disableTracking")
	if err != nil {
		return fmt.Errorf("read OdhDashboardConfig %s disableTracking: %w", key, err)
	}
	if found {
		return nil
	}

	original := config.DeepCopy()
	if err := unstructured.SetNestedField(config.Object, false, "spec", "dashboardConfig", "disableTracking"); err != nil {
		return fmt.Errorf("set OdhDashboardConfig %s disableTracking default: %w", key, err)
	}

	patch := client.MergeFromWithOptions(original, client.MergeFromWithOptimisticLock{})
	if err := r.Patch(ctx, config, patch); err != nil {
		return fmt.Errorf("patch OdhDashboardConfig %s disableTracking default: %w", key, err)
	}

	log.FromContext(ctx).Info("Initialized RHOAI dashboard tracking default", "namespace", key.Namespace, "name", key.Name)
	return nil
}

func (r *DashboardReconciler) isTargetOdhDashboardConfig(obj client.Object) bool {
	return obj != nil &&
		obj.GetNamespace() == r.ApplicationsNamespace &&
		obj.GetName() == odhDashboardConfigName
}

func (r *DashboardReconciler) odhDashboardConfigNeedsDefault(obj client.Object) bool {
	if !r.isTargetOdhDashboardConfig(obj) {
		return false
	}

	config, ok := obj.(*unstructured.Unstructured)
	if !ok {
		return true
	}

	_, found, err := unstructured.NestedBool(config.Object, "spec", "dashboardConfig", "disableTracking")
	return err != nil || !found
}

func (r *DashboardReconciler) mapOdhDashboardConfigToDashboard(_ context.Context, obj client.Object) []reconcile.Request {
	if !r.isTargetOdhDashboardConfig(obj) {
		return nil
	}

	return []reconcile.Request{{
		NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName},
	}}
}

func (r *DashboardReconciler) odhDashboardConfigPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc:  func(e event.CreateEvent) bool { return r.odhDashboardConfigNeedsDefault(e.Object) },
		DeleteFunc:  func(e event.DeleteEvent) bool { return r.isTargetOdhDashboardConfig(e.Object) },
		GenericFunc: func(e event.GenericEvent) bool { return r.odhDashboardConfigNeedsDefault(e.Object) },
		UpdateFunc:  func(e event.UpdateEvent) bool { return r.odhDashboardConfigNeedsDefault(e.ObjectNew) },
	}
}

func addOdhDashboardConfigWatch(
	controllerBuilder *builder.Builder,
	r *DashboardReconciler,
) {
	if r.Platform != cluster.SelfManagedRhoai {
		return
	}

	// Register the source even if REST discovery has not observed the CRD yet.
	// controller-runtime's Kind source retries informer creation until the API
	// becomes discoverable, avoiding a permanent watch gap after a transient
	// startup discovery miss.
	controllerBuilder.Watches(
		newOdhDashboardConfig(),
		handler.EnqueueRequestsFromMapFunc(r.mapOdhDashboardConfigToDashboard),
		builder.WithPredicates(r.odhDashboardConfigPredicate()),
	)
}
