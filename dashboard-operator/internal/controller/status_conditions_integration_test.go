//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_ConditionReady_TracksSubConditions(t *testing.T) {
	r, manifests := setupStatusContractDashboard(t, nil)

	dashboard := getDashboard(t)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionTrue)
	assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionTrue)
	assert.Equal(t, common.PhaseReady, dashboard.Status.Phase)

	r.ManifestsBasePath = t.TempDir()
	_, err := r.Reconcile(context.Background(), dashboardRequest())
	require.Error(t, err)

	dashboard = getDashboard(t)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionFalse)
	provisioning := assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionFalse)
	assert.NotEmpty(t, provisioning.Reason)
	assert.NotEmpty(t, provisioning.Message)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)

	r.ManifestsBasePath = manifests
	reconcile(t, r)

	dashboard = getDashboard(t)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionTrue)
	assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionTrue)
	assert.Equal(t, common.PhaseReady, dashboard.Status.Phase)
}

func TestIntegration_ConditionDegraded_ReflectsModuleHealth(t *testing.T) {
	r, _ := setupStatusContractDashboard(t, []string{"modelRegistry"})

	setModuleReadyReplicas(t, "model-registry", 1)
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))

	setModuleReadyReplicas(t, "model-registry", 0)
	reconcile(t, r)

	dashboard := getDashboard(t)
	moduleStatus := dashboard.Status.ModuleStatuses["modelRegistry"]
	assert.Equal(t, v1alpha1.ModulePhaseDegraded, moduleStatus.Phase)
	degraded := assertConditionStatus(t, dashboard, common.ConditionTypeDegraded, metav1.ConditionTrue)
	assert.Equal(t, "ModulesDegraded", degraded.Reason)
	assert.Contains(t, degraded.Message, "1 module(s) degraded")
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionFalse)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)

	setModuleReadyReplicas(t, "model-registry", 1)
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))
}

func TestIntegration_ObservedGeneration_UpdatedPerReconcile(t *testing.T) {
	r, _ := setupStatusContractDashboard(t, nil)

	dashboard := getDashboard(t)
	require.Equal(t, dashboard.Generation, dashboard.Status.ObservedGeneration)
	initialGeneration := dashboard.Generation

	dashboard.Spec.Gateway.Domain = "updated.example.com"
	require.NoError(t, k8sClient.Update(context.Background(), dashboard))

	dashboard = getDashboard(t)
	require.Greater(t, dashboard.Generation, initialGeneration)
	assert.NotEqual(t, dashboard.Generation, dashboard.Status.ObservedGeneration)

	reconcile(t, r)

	dashboard = getDashboard(t)
	assert.Equal(t, dashboard.Generation, dashboard.Status.ObservedGeneration)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionTrue)
}

func TestIntegration_PhaseTransitions_ReadyNotReady(t *testing.T) {
	r, _ := setupStatusContractDashboard(t, []string{"modelRegistry"})

	setModuleReadyReplicas(t, "model-registry", 1)
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))

	setModuleReadyReplicas(t, "model-registry", 0)
	reconcile(t, r)

	dashboard := getDashboard(t)
	assert.Equal(t, common.PhaseNotReady, dashboard.Status.Phase)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionFalse)
	assertConditionStatus(t, dashboard, common.ConditionTypeDegraded, metav1.ConditionTrue)

	setModuleReadyReplicas(t, "model-registry", 1)
	reconcile(t, r)
	assertStatusHealthy(t, getDashboard(t))
}

func setupStatusContractDashboard(t *testing.T, enabledModules []string) (*ctrlpkg.DashboardReconciler, string) {
	t.Helper()

	manifestSlugs := make([]string, 0, len(enabledModules))
	for _, module := range enabledModules {
		if module == "modelRegistry" {
			manifestSlugs = append(manifestSlugs, "model-registry")
		}
	}
	manifests := createIntegrationManifests(t, manifestSlugs)
	r := newManifestReconciler(manifests)
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(enabledModules...),
	})

	require.NoError(t, k8sClient.Create(context.Background(), dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	// The first reconcile adds the finalizer; the second runs the deployment pipeline.
	reconcile(t, r)
	reconcile(t, r)

	return r, manifests
}

func setModuleReadyReplicas(t *testing.T, component string, ready int32) {
	t.Helper()

	deployments := listDeployments(t, component)
	require.Len(t, deployments, 1)
	deployment := deployments[0].DeepCopy()
	deployment.Status.Replicas = 1
	deployment.Status.UpdatedReplicas = ready
	deployment.Status.ReadyReplicas = ready
	deployment.Status.AvailableReplicas = ready
	require.NoError(t, k8sClient.Status().Update(context.Background(), deployment))
}

func dashboardRequest() ctrl.Request {
	return ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}}
}

func assertConditionStatus(
	t *testing.T,
	dashboard *v1alpha1.Dashboard,
	conditionType common.ConditionType,
	want metav1.ConditionStatus,
) *common.Condition {
	t.Helper()

	condition := conditions.FindStatusCondition(dashboard, string(conditionType))
	require.NotNil(t, condition, "%s condition should be present", conditionType)
	assert.Equal(t, want, condition.Status, "%s condition status", conditionType)

	return condition
}

func assertStatusHealthy(t *testing.T, dashboard *v1alpha1.Dashboard) {
	t.Helper()

	assertConditionStatus(t, dashboard, common.ConditionTypeProvisioningSucceeded, metav1.ConditionTrue)
	assertConditionStatus(t, dashboard, common.ConditionTypeDegraded, metav1.ConditionFalse)
	assertConditionStatus(t, dashboard, common.ConditionTypeReady, metav1.ConditionTrue)
	assert.Equal(t, common.PhaseReady, dashboard.Status.Phase)
}
