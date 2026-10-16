package controller

import (
	"context"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

// dashboardLifecycle isolates the operand contract for a platform. The
// reconciler retains Kubernetes controller plumbing (fetching the CR,
// finalizers, and common status metadata); platform implementations own the
// resources and readiness semantics they expose.
type dashboardLifecycle interface {
	Reconcile(context.Context, *v1alpha1.Dashboard, *conditions.Manager, OperatorConfig) (ctrl.Result, error)
	Remove(context.Context, *v1alpha1.Dashboard, *conditions.Manager) (ctrl.Result, error)
	Finalize(context.Context, *v1alpha1.Dashboard) (ctrl.Result, error)
}

func (r *DashboardReconciler) dashboardLifecycle() dashboardLifecycle {
	switch r.Platform {
	case cluster.SelfManagedRhoai, cluster.ManagedRhoai:
		return rhoaiDashboardLifecycle{reconciler: r}
	case cluster.XKS:
		return xksDashboardLifecycle{reconciler: r}
	case cluster.OpenDataHub:
		fallthrough
	default:
		return odhDashboardLifecycle{reconciler: r}
	}
}

type odhDashboardLifecycle struct{ reconciler *DashboardReconciler }
type rhoaiDashboardLifecycle struct{ reconciler *DashboardReconciler }
type xksDashboardLifecycle struct{ reconciler *DashboardReconciler }
