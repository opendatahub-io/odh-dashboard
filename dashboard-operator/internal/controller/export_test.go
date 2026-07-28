package controller

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func SetOperatorDeploymentName(name string) (restore func()) {
	old := operatorDeploymentName
	operatorDeploymentName = name
	return func() { operatorDeploymentName = old }
}

var ComputeFederationConfigHash = computeFederationConfigHash

var MainDashboardDeploymentName = mainDashboardDeploymentName

var SelectorLabelsMatch = selectorLabelsMatch

func (r *DashboardReconciler) DeleteDeploymentsWithStaleSelectorLabels(ctx context.Context, resources []unstructured.Unstructured) error {
	return r.deleteDeploymentsWithStaleSelectorLabels(ctx, resources)
}

func BuildFederationConfigMap(r *DashboardReconciler, statuses map[string]v1alpha1.ModuleStatus, dashboard *v1alpha1.Dashboard) (*corev1.ConfigMap, error) {
	return r.buildFederationConfigMap(statuses, dashboard)
}

func (r *DashboardReconciler) PatchDeploymentFederationHash(ctx context.Context, configData string) error {
	return r.patchDeploymentFederationHash(ctx, configData)
}
