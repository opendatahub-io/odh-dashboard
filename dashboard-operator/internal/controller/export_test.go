package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func SetOperatorDeploymentName(name string) (restore func()) {
	old := operatorDeploymentName
	operatorDeploymentName = name
	return func() { operatorDeploymentName = old }
}

var ComputeFederationConfigHash = computeFederationConfigHash

var MainDashboardDeploymentName = mainDashboardDeploymentName

func BuildFederationConfigMap(r *DashboardReconciler, statuses map[string]v1alpha1.ModuleStatus, dashboard *v1alpha1.Dashboard) (*corev1.ConfigMap, error) {
	return r.buildFederationConfigMap(statuses, dashboard)
}

func (r *DashboardReconciler) PatchDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchDeploymentFederationHash(ctx, configData)
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

var DashboardSAName = dashboardSAName

func (r *DashboardReconciler) ReconcileNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.reconcileNamespacedRBAC(ctx, dashboard)
}

func (r *DashboardReconciler) CleanupNamespacedRBAC(ctx context.Context) error {
	return r.cleanupNamespacedRBAC(ctx)
}

func (r *DashboardReconciler) GCStaleNamespacedRBAC(ctx context.Context, desired map[string]bool) error {
	return r.gcStaleNamespacedRBAC(ctx, desired)
}
