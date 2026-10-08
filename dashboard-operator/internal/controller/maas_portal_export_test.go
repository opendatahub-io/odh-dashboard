package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (r *DashboardReconciler) PatchMaaSPortalDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchMaaSPortalDeploymentFederationHash(ctx, configData)
}

func (r *DashboardReconciler) DeployMaaSPortalFederationConfigMap(ctx context.Context, dashboard *v1alpha1.Dashboard, statuses map[string]v1alpha1.ModuleStatus) error {
	return r.deployMaaSPortalFederationConfigMap(ctx, dashboard, statuses, true)
}

func (r *DashboardReconciler) DeleteMaaSPortalResources(ctx context.Context) error {
	return r.deleteMaaSPortalResources(ctx)
}

func BuildMaaSPortalFederationConfigMap(
	r *DashboardReconciler,
	statuses map[string]v1alpha1.ModuleStatus,
	observability *v1alpha1.ObservabilitySpec,
) (*corev1.ConfigMap, error) {
	return r.buildMaaSPortalFederationConfigMap(statuses, observability)
}

const ConditionMaaSPortalAvailable = conditionMaaSPortalAvailable
