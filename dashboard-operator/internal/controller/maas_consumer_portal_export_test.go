package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (r *DashboardReconciler) PatchMaaSConsumerPortalDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchMaaSConsumerPortalDeploymentFederationHash(ctx, configData)
}

func (r *DashboardReconciler) DeployMaaSConsumerPortalFederationConfigMap(ctx context.Context, dashboard *v1alpha1.Dashboard, statuses map[string]v1alpha1.ModuleStatus) error {
	return r.deployMaaSConsumerPortalFederationConfigMap(ctx, dashboard, statuses)
}

func (r *DashboardReconciler) DeleteMaaSConsumerPortalResources(ctx context.Context) error {
	return r.deleteMaaSConsumerPortalResources(ctx)
}

func BuildMaaSConsumerPortalFederationConfigMap(
	r *DashboardReconciler,
	statuses map[string]v1alpha1.ModuleStatus,
) (*corev1.ConfigMap, error) {
	return r.buildMaaSConsumerPortalFederationConfigMap(statuses)
}

const MaaSConsumerPortalConsoleLinkName = maasConsumerPortalConsoleLinkName

const ConditionMaaSConsumerPortalAvailable = conditionMaaSConsumerPortalAvailable
