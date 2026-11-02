//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/controller/conditions"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

func TestIntegration_ModuleDeploymentFailureStopsReconcile(t *testing.T) {
	for _, tt := range []struct {
		name             string
		existingModules  bool
		invalidOCIConfig bool
	}{
		{name: "first deployment"},
		{name: "existing federation", existingModules: true},
		{name: "existing federation and invalid OCI config", existingModules: true, invalidOCIConfig: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			manifests := createOCIBaseImageIntegrationManifests(t)
			r := newManifestReconciler(manifests)
			dashboard := newDashboard(v1alpha1.DashboardSpec{
				Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
				Modules: disableAllModulesExcept("genAi"),
			})
			if tt.existingModules {
				dashboard.Spec.Modules = disableAllModulesExcept("modelRegistry")
			}
			require.NoError(t, k8sClient.Create(ctx, dashboard))
			t.Cleanup(func() {
				deleteDashboard(t)
				cleanupModuleResources(t)
			})
			deployName := ctrlpkg.MainDashboardDeploymentName(cluster.OpenDataHub)
			require.NoError(t, k8sClient.Create(ctx, newMainDashboardDeployment(deployName)))
			reconcile(t, r) // finalizer

			var previousFederation *corev1.ConfigMap
			if tt.existingModules {
				reconcile(t, r)
				previousFederation = getConfigMap(t, "federation-config")
				require.NotNil(t, previousFederation)
				require.Len(t, listDeployments(t, "model-registry"), 1)
			}
			previousHash := federationHashOf(t, deployName)

			dashboard = getDashboard(t)
			dashboard.Spec.Modules = disableAllModulesExcept("genAi")
			if tt.invalidOCIConfig {
				dashboard.Spec.ModelRegistryOCIBaseImage = "mirror.example.com/Busybox:1"
			}
			require.NoError(t, k8sClient.Update(ctx, dashboard))
			modulePath := filepath.Join(manifests, "modules", "gen-ai", "kustomization.yaml")
			validManifest, err := os.ReadFile(modulePath)
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(modulePath, []byte("invalid: ["), 0644))

			_, err = r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
			require.ErrorContains(t, err, "failed to render manifests for module genAi")
			assert.Equal(t, "ModuleDeployFailed", conditionReason(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)))
			assert.Empty(t, listDeployments(t, "gen-ai"))
			if tt.existingModules {
				assert.Len(t, listDeployments(t, "model-registry"), 1, "module cleanup must wait for successful deployment")
				currentFederation := getConfigMap(t, "federation-config")
				require.NotNil(t, currentFederation)
				assert.Equal(t, previousFederation.Data, currentFederation.Data, "failed deployment must preserve federation entries")
			} else {
				assert.Nil(t, getConfigMap(t, "federation-config"), "first deployment failure must not publish a nonexistent module")
			}
			assert.Equal(t, previousHash, federationHashOf(t, deployName), "failed deployment must not trigger a federation rollout")
			if tt.invalidOCIConfig {
				condition := conditions.FindStatusCondition(getDashboard(t), "ModelRegistryConfigValid")
				require.NotNil(t, condition)
				assert.Equal(t, metav1.ConditionFalse, condition.Status)
				assert.Equal(t, "InvalidOCIBaseImage", condition.Reason)
				assert.Equal(t, common.ConditionSeverityInfo, condition.Severity)
				assert.Contains(t, condition.Message, "spec.modelRegistryOCIBaseImage")
			}

			// A successful retry can now remove the old module and publish the new one.
			require.NoError(t, os.WriteFile(modulePath, validManifest, 0644))
			dashboard = getDashboard(t)
			dashboard.Spec.ModelRegistryOCIBaseImage = ""
			require.NoError(t, k8sClient.Update(ctx, dashboard))
			reconcile(t, r)
			assert.Empty(t, listDeployments(t, "model-registry"))
			assert.Len(t, listDeployments(t, "gen-ai"), 1)
			entries := parseFederationEntries(t, getConfigMap(t, "federation-config"))
			assert.NotNil(t, findFederationEntry(entries, "genAi"))
			assert.Nil(t, findFederationEntry(entries, "modelRegistry"))
			assert.NotEqual(t, previousHash, federationHashOf(t, deployName))
		})
	}
}

func TestIntegration_ModuleDeploymentFailureStopsRemovedTeardown(t *testing.T) {
	ctx := context.Background()
	manifests := createIntegrationManifests(t, []string{"maas", "gen-ai"})
	writeMaaSPortalManifest(t, manifests)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai
	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:    &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:    disableAllModulesExcept("maas", "genAi"),
		MaaSPortal: &v1alpha1.MaaSPortalSpec{ManagementState: "Managed"},
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))
	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupMaaSPortalResources(t, r)
		cleanupModuleResources(t)
	})
	reconcile(t, r)
	reconcile(t, r)
	coreConfigKey := types.NamespacedName{Name: "dashboard-core-config", Namespace: integrationNamespace}
	assertExists(t, &corev1.ConfigMap{}, coreConfigKey)
	modulePath := filepath.Join(manifests, "modules", "gen-ai", "kustomization.yaml")
	validManifest, err := os.ReadFile(modulePath)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(modulePath, []byte("invalid: ["), 0644))
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	_, err = r.Reconcile(ctx, ctrl.Request{NamespacedName: types.NamespacedName{Name: v1alpha1.DashboardInstanceName}})
	require.ErrorContains(t, err, "failed to render manifests for module genAi")
	assert.Equal(t, "ModuleDeployFailed", conditionReason(getDashboard(t), string(common.ConditionTypeProvisioningSucceeded)))
	assertExists(t, &corev1.ConfigMap{}, coreConfigKey)

	require.NoError(t, os.WriteFile(modulePath, validManifest, 0644))
	reconcile(t, r)
	assertGone(t, &corev1.ConfigMap{}, coreConfigKey)
	assert.Len(t, listDeployments(t, "maas"), 1)
	assert.Len(t, listDeployments(t, "gen-ai"), 1)
}
