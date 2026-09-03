package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func (r *DashboardReconciler) PatchMaasConsumerPortalDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchMaasConsumerPortalDeploymentFederationHash(ctx, configData)
}

func (r *DashboardReconciler) DeployMaasConsumerPortalFederationConfigMap(ctx context.Context, dashboard *v1alpha1.Dashboard, statuses map[string]v1alpha1.ModuleStatus) error {
	return r.deployMaasConsumerPortalFederationConfigMap(ctx, dashboard, statuses)
}

func BuildMaasConsumerPortalFederationConfigMap(
	r *DashboardReconciler,
	statuses map[string]v1alpha1.ModuleStatus,
) (*corev1.ConfigMap, error) {
	return r.buildMaasConsumerPortalFederationConfigMap(statuses)
}

const MaasConsumerPortalConsoleLinkName = maasConsumerPortalConsoleLinkName

const ConditionMaasConsumerPortalAvailable = conditionMaasConsumerPortalAvailable
