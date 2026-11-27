package controller

import (
	"context"

	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func namespaceNamespacedRBACOptInChangedPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return namespaceNamespacedRBACOptedIn(e.Object)
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return namespaceNamespacedRBACOptedIn(e.Object)
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return namespaceNamespacedRBACOptedIn(e.ObjectOld) != namespaceNamespacedRBACOptedIn(e.ObjectNew)
		},
		GenericFunc: func(event.GenericEvent) bool { return false },
	}
}

func namespaceNamespacedRBACOptedIn(obj client.Object) bool {
	if obj == nil {
		return false
	}
	return obj.GetLabels()[v1alpha1.NamespacedRBACOptInLabel] == "true"
}

func mapNamespacedRBACNamespaceToDashboard(_ context.Context, _ client.Object) []reconcile.Request {
	return []reconcile.Request{{NamespacedName: client.ObjectKey{Name: v1alpha1.DashboardInstanceName}}}
}
