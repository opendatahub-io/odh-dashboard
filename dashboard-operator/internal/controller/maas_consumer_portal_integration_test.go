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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"
	"github.com/opendatahub-io/odh-platform-utilities/pkg/metadata/labels"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	ctrlpkg "github.com/opendatahub-io/odh-dashboard/dashboard-operator/internal/controller"
)

// writeMaasConsumerPortalManifest copies the portal distribution bundle into the
// integration fixture because reconciliation writes its params.env at runtime.
func writeMaasConsumerPortalManifest(t *testing.T, base string) {
	t.Helper()

	source := filepath.Join("..", "..", "..", "manifests", "distributions", "maas-consumer-portal")
	destination := filepath.Join(base, "distributions", "maas-consumer-portal")
	require.NoError(t, os.CopyFS(destination, os.DirFS(source)))
}

// getConsoleLink fetches a cluster-scoped ConsoleLink by name, returning nil
// when it does not exist.
func getConsoleLink(t *testing.T, name string) *unstructured.Unstructured {
	t.Helper()

	cl := &unstructured.Unstructured{}
	cl.SetGroupVersionKind(ctrlpkg.ConsoleLinkGVK)
	err := k8sClient.Get(context.Background(), types.NamespacedName{Name: name}, cl)
	if err != nil {
		return nil
	}

	return cl
}

func deleteConsoleLinkIfExists(t *testing.T, name string) {
	t.Helper()

	cl := &unstructured.Unstructured{}
	cl.SetGroupVersionKind(ctrlpkg.ConsoleLinkGVK)
	cl.SetName(name)
	_ = k8sClient.Delete(context.Background(), cl)
}

// conditionStatus returns the status of the named condition on the Dashboard,
// or an empty string when the condition is absent.
func conditionStatus(dashboard *v1alpha1.Dashboard, conditionType string) metav1.ConditionStatus {
	for i := range dashboard.Status.Conditions {
		if dashboard.Status.Conditions[i].Type == conditionType {
			return dashboard.Status.Conditions[i].Status
		}
	}

	return ""
}

func conditionReason(dashboard *v1alpha1.Dashboard, conditionType string) string {
	for i := range dashboard.Status.Conditions {
		if dashboard.Status.Conditions[i].Type == conditionType {
			return dashboard.Status.Conditions[i].Reason
		}
	}

	return ""
}

func TestIntegration_MaasConsumerPortalConsoleLink(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	// ConsoleLink is created with the derived href.
	cl := getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	require.NotNil(t, cl, "maas-consumer-portal-link ConsoleLink should be created when enabled")

	href, found, err := unstructured.NestedString(cl.Object, "spec", "href")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "https://maas-consumer-portal.test.example.com/", href)

	// ownerReference points to the Dashboard CR (for GC on CR deletion).
	owners := cl.GetOwnerReferences()
	require.Len(t, owners, 1, "ConsoleLink should have exactly one owner reference")
	assert.Equal(t, v1alpha1.DashboardKind, owners[0].Kind)
	assert.Equal(t, v1alpha1.DashboardInstanceName, owners[0].Name)

	// The portal carries a distinct part-of label so the core dashboard teardown
	// (which selects part-of=dashboard) never touches it. This makes the portal
	// an independent operand — see TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved.
	assert.Equal(t, "maas-consumer-portal", cl.GetLabels()[labels.PlatformPartOf],
		"portal ConsoleLink must carry part-of=maas-consumer-portal, not part-of=dashboard")

	// Disable the portal — the ConsoleLink is removed.
	dashboard = getDashboard(t)
	dashboard.Spec.MaasConsumerPortal = &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	cl = getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	assert.Nil(t, cl, "maas-consumer-portal-link ConsoleLink should be deleted when disabled")
}

// TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved verifies
// that the portal ConsoleLink survives a core-dashboard teardown while the
// portal itself stays enabled — the portal is independent of the core
// dashboard's managementState, so core `managementState: Removed` with
// `maasConsumerPortal.managementState: Managed` must keep the link visible.
func TestIntegration_MaasConsumerPortalConsoleLinkPreservedWhenCoreRemoved(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Core dashboard is torn down but the portal stays enabled, so its
	// ConsoleLink must be preserved.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should be preserved when core is Removed but portal stays enabled")

	updated := getDashboard(t)
	assert.Equal(t, metav1.ConditionFalse, conditionStatus(updated, "MaasConsumerPortalAvailable"),
		"MaaS Consumer Portal must report unavailable when its explicitly disabled MaaS/GenAI dependencies are missing")
	assert.Equal(t, "RequiredModuleUnavailable", conditionReason(updated, "MaasConsumerPortalAvailable"))
}

// TestIntegration_MaasConsumerPortalConsoleLinkRemovedWhenDisabled verifies that a
// core-dashboard teardown with the portal disabled removes the portal
// ConsoleLink along with the rest of the managed resources.
func TestIntegration_MaasConsumerPortalConsoleLinkRemovedWhenDisabled(t *testing.T) {
	base := createIntegrationManifests(t, []string{"model-registry"})
	writeMaasConsumerPortalManifest(t, base)

	r := &ctrlpkg.DashboardReconciler{
		Client:                k8sClient,
		Scheme:                k8sClient.Scheme(),
		ManifestsBasePath:     base,
		Platform:              cluster.OpenDataHub,
		Namespace:             integrationNamespace,
		ApplicationsNamespace: integrationNamespace,
	}

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway:            &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules:            disableAllModulesExcept("modelRegistry"),
		MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Managed"},
	})

	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
	})

	reconcile(t, r)
	reconcile(t, r)

	require.NotNil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should exist before Removed")

	// Portal disabled AND core Removed: nothing should keep the link alive.
	dashboard = getDashboard(t)
	dashboard.Spec.ManagementState = "Removed"
	dashboard.Spec.MaasConsumerPortal = &v1alpha1.MaasConsumerPortalSpec{ManagementState: "Removed"}
	require.NoError(t, k8sClient.Update(ctx, dashboard))

	reconcile(t, r)

	assert.Nil(t, getConsoleLink(t, ctrlpkg.MaasConsumerPortalConsoleLinkName),
		"ConsoleLink should be removed when managementState is Removed and portal is disabled")
}

func TestIntegration_MaasConsumerPortalModuleDemandMatrix(t *testing.T) {
	tests := []struct {
		name                         string
		coreState                    string
		maasConsumerPortalState      string
		wantSharedBFFs               bool
		wantMaasConsumerPortalConfig bool
	}{
		{name: "Core Dashboard only", coreState: "Managed", maasConsumerPortalState: "Removed", wantSharedBFFs: true},
		{name: "Core Dashboard and MaaS Consumer Portal", coreState: "Managed", maasConsumerPortalState: "Managed", wantSharedBFFs: true, wantMaasConsumerPortalConfig: true},
		{name: "MaaS Consumer Portal only", coreState: "Removed", maasConsumerPortalState: "Managed", wantSharedBFFs: true, wantMaasConsumerPortalConfig: true},
		{name: "both operands removed", coreState: "Removed", maasConsumerPortalState: "Removed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			base := createIntegrationManifests(t, []string{"maas", "gen-ai"})
			writeMaasConsumerPortalManifest(t, base)
			r := &ctrlpkg.DashboardReconciler{Client: k8sClient, Scheme: k8sClient.Scheme(), ManifestsBasePath: base, Platform: cluster.OpenDataHub, Namespace: integrationNamespace, ApplicationsNamespace: integrationNamespace}
			dashboard := newDashboard(v1alpha1.DashboardSpec{ManagementSpec: common.ManagementSpec{ManagementState: common.ManagementState(tt.coreState)}, Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"}, Modules: disableAllModulesExcept("maas", "genAi"), MaasConsumerPortal: &v1alpha1.MaasConsumerPortalSpec{ManagementState: tt.maasConsumerPortalState}})
			require.NoError(t, k8sClient.Create(context.Background(), dashboard))
			t.Cleanup(func() {
				deleteDashboard(t)
				cleanupModuleResources(t)
				deleteConsoleLinkIfExists(t, ctrlpkg.MaasConsumerPortalConsoleLinkName)
				_ = k8sClient.Delete(context.Background(), &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "maas-consumer-portal-federation-config", Namespace: integrationNamespace}})
			})
			reconcile(t, r)
			reconcile(t, r)

			if tt.wantSharedBFFs {
				assert.Len(t, listDeployments(t, "maas"), 1, "one MaaS BFF Deployment")
				assert.Len(t, listServices(t, "maas"), 1, "one MaaS BFF Service")
				assert.Len(t, listDeployments(t, "gen-ai"), 1, "one GenAI BFF Deployment")
				assert.Len(t, listServices(t, "gen-ai"), 1, "one GenAI BFF Service")
			} else {
				assert.Empty(t, listDeployments(t, "maas"))
				assert.Empty(t, listServices(t, "maas"))
				assert.Empty(t, listDeployments(t, "gen-ai"))
				assert.Empty(t, listServices(t, "gen-ai"))
			}

			maasConsumerPortalConfig := getConfigMap(t, "maas-consumer-portal-federation-config")
			if !tt.wantMaasConsumerPortalConfig {
				assert.Nil(t, maasConsumerPortalConfig)
				return
			}
			require.NotNil(t, maasConsumerPortalConfig)
			assert.Equal(t, "maas-consumer-portal", maasConsumerPortalConfig.Labels[labels.PlatformPartOf])
			entries := parseFederationEntries(t, maasConsumerPortalConfig)
			require.Len(t, entries, 2)
			assert.NotNil(t, findFederationEntry(entries, "maas"))
			assert.NotNil(t, findFederationEntry(entries, "genAi"))
		})
	}
}
