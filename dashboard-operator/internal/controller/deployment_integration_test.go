//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// TestIntegration_DeploysResources verifies that a Managed Dashboard renders and
// applies the core manifests plus the standalone module Deployments/Services for
// every enabled module, and that the federation ConfigMap lists them. (RHOAIENG-83645)
func TestIntegration_DeploysResources(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"gen-ai", "maas"})
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("genAi", "maas"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	// Core manifests: the dashboard-core-config ConfigMap should exist, labeled
	// as part-of the dashboard (applied via SSA by the deployer).
	coreCM := &corev1.ConfigMap{}
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name:      "dashboard-core-config",
		Namespace: integrationNamespace,
	}, coreCM))
	assert.Equal(t, "dashboard", coreCM.Labels[labels.PlatformPartOf],
		"core ConfigMap should carry the part-of=dashboard label")

	// Each enabled module has exactly one Deployment and one Service.
	for _, slug := range []string{"gen-ai", "maas"} {
		assert.Len(t, listDeployments(t, slug), 1, "expected one Deployment for %s", slug)
		assert.Len(t, listServices(t, slug), 1, "expected one Service for %s", slug)
	}

	// Federation ConfigMap lists both modules plus the always-present coreBff entry.
	entries := parseFederationEntries(t, getConfigMap(t, "federation-config"))
	assert.NotNil(t, findFederationEntry(entries, "genAi"), "genAi should be in federation config")
	assert.NotNil(t, findFederationEntry(entries, "maas"), "maas should be in federation config")
	assert.NotNil(t, findFederationEntry(entries, "coreBff"), "coreBff should always be in federation config")
}

// TestIntegration_ModuleStatusesPopulated verifies the reconciler records a status
// entry for every registered module — enabled ones as deployed/degraded, and
// explicitly disabled ones as Disabled with the ExplicitOverride reason. (RHOAIENG-83645)
func TestIntegration_ModuleStatusesPopulated(t *testing.T) {
	manifests := createIntegrationManifests(t, []string{"gen-ai"})
	r := newManifestReconciler(manifests)

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept("genAi"),
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
	})

	reconcile(t, r)
	reconcile(t, r)

	dashboard = getDashboard(t)
	require.Len(t, dashboard.Status.ModuleStatuses, len(ctrlpkg.ModuleNames()),
		"every registered module should have a status entry")

	genAi := dashboard.Status.ModuleStatuses["genAi"]
	assert.NotEqual(t, v1alpha1.ModulePhaseDisabled, genAi.Phase, "genAi should be enabled")
	assert.NotEqual(t, v1alpha1.ModulePhaseNotDeployed, genAi.Phase, "genAi should be deployed or degraded")

	// modelRegistry is disabled via spec override; Components is nil so the DSC
	// gate is skipped and the reason is the explicit override, not a missing component.
	modelRegistry := dashboard.Status.ModuleStatuses["modelRegistry"]
	assert.Equal(t, v1alpha1.ModulePhaseDisabled, modelRegistry.Phase)
	assert.Equal(t, "ExplicitOverride", modelRegistry.Reason)
}
