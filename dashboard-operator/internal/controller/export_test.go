package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func SetOperatorDeploymentName(name string) (restore func()) {
	old := operatorDeploymentName
	operatorDeploymentName = name
	return func() { operatorDeploymentName = old }
}

var ComputeFederationConfigHash = computeFederationConfigHash

var MainDashboardDeploymentName = mainDashboardDeploymentName

const FederationHashAnnotation = federationHashAnnotation

func BuildFederationConfigMap(r *DashboardReconciler, statuses map[string]v1alpha1.ModuleStatus, dashboard *v1alpha1.Dashboard) (*corev1.ConfigMap, error) {
	return r.buildFederationConfigMap(statuses, dashboard)
}

func (r *DashboardReconciler) PatchDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchDeploymentFederationHash(ctx, configData)
}

func (r *DashboardReconciler) DeleteModuleResources(ctx context.Context, statuses map[string]v1alpha1.ModuleStatus) error {
	return r.deleteModuleResources(ctx, statuses)
}

func (r *DashboardReconciler) ReconcileModuleDemand(ctx context.Context, dashboard *v1alpha1.Dashboard) (map[string]v1alpha1.ModuleStatus, error) {
	return r.reconcileModuleDemand(ctx, dashboard)
}

func (r *DashboardReconciler) CleanupLegacySidecarResources(ctx context.Context) error {
	return r.cleanupLegacySidecarResources(ctx)
}

func (r *DashboardReconciler) AutoDetectObservability(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.autoDetectObservability(ctx, dashboard)
}

func (r *DashboardReconciler) MonitoringNamespace() string {
	return r.monitoringNamespace()
}

const ObservabilityRetryInterval = observabilityRetryInterval

const MaaSConsumerPortalRetryInterval = maasConsumerPortalRetryInterval

var DashboardSAName = dashboardSAName

func (r *DashboardReconciler) ReconcileNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.reconcileNamespacedRBAC(ctx, dashboard)
}

func (r *DashboardReconciler) CleanupNamespacedRBAC(ctx context.Context) error {
	return r.cleanupNamespacedRBAC(ctx)
}

func (r *DashboardReconciler) ReconcileDegradedCondition(
	cm *conditions.Manager,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	r.reconcileDegradedCondition(cm, statuses)
}

func (r *DashboardReconciler) GCStaleNamespacedRBAC(ctx context.Context, desired map[string]bool) error {
	return r.gcStaleNamespacedRBAC(ctx, desired)
}

var ConsoleLinkGVK = consoleLinkGVK

var ConsoleLinkListGVK = consoleLinkListGVK

func (r *DashboardReconciler) MapConfigMapToDashboard(ctx context.Context, obj client.Object) []reconcile.Request {
	return r.mapConfigMapToDashboard(ctx, obj)
}

func (r *DashboardReconciler) ConfigMapPredicate() predicate.Predicate {
	return r.configMapPredicate()
}
