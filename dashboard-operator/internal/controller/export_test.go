package controller

import (
	"context"
	"sort"

	corev1 "k8s.io/api/core/v1"

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

const CommunityPluginsNamespace = communityPluginsNamespace

func BuildFederationConfigMap(r *DashboardReconciler, statuses map[string]v1alpha1.ModuleStatus, dashboard *v1alpha1.Dashboard) (*corev1.ConfigMap, error) {
	return r.buildFederationConfigMap(context.Background(), statuses, dashboard)
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

func (r *DashboardReconciler) CleanupLegacyResources(ctx context.Context) error {
	return r.cleanupLegacyResources(ctx)
}

func (r *DashboardReconciler) AutoDetectObservability(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.autoDetectObservability(ctx, dashboard)
}

func (r *DashboardReconciler) MonitoringNamespace() string {
	return r.monitoringNamespace()
}

const ObservabilityRetryInterval = observabilityRetryInterval

const MaaSPortalRetryInterval = maasPortalRetryInterval

var DashboardSAName = dashboardSAName

func (r *DashboardReconciler) ReconcileNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard) error {
	return r.reconcileNamespacedRBAC(ctx, dashboard)
}

func NamespacedRBACGrantInventory(dashboard *v1alpha1.Dashboard) ([]string, error) {
	inventory, err := namespacedRBACGrantInventory(dashboard)
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(inventory))
	for key := range inventory {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys, nil
}

func (r *DashboardReconciler) CleanupNamespacedRBAC(ctx context.Context) error {
	return r.cleanupNamespacedRBAC(ctx, &v1alpha1.Dashboard{})
}

func (r *DashboardReconciler) ReconcileDegradedCondition(
	cm *conditions.Manager,
	statuses map[string]v1alpha1.ModuleStatus,
) {
	r.reconcileDegradedCondition(cm, statuses)
}

func (r *DashboardReconciler) SetNamespacedRBACTransitionCondition(dashboard *v1alpha1.Dashboard) {
	r.setNamespacedRBACTransitionCondition(dashboard)
}

func (r *DashboardReconciler) GCStaleNamespacedRBAC(ctx context.Context, dashboard *v1alpha1.Dashboard, desired map[string]bool) error {
	return r.gcStaleNamespacedRBAC(ctx, dashboard, desired)
}

var ConsoleLinkGVK = consoleLinkGVK

var ConsoleLinkListGVK = consoleLinkListGVK

var ScopedOdhDashboardConfigByObject = scopedOdhDashboardConfigByObject

const OdhDashboardConfigName = odhDashboardConfigName
