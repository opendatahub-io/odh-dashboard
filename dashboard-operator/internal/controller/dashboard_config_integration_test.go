//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

var odhDashboardConfigGVK = schema.GroupVersionKind{
	Group: "opendatahub.io", Version: "v1alpha", Kind: "OdhDashboardConfig",
}

// TestIntegration_RHOAIDashboardConfigDefault verifies the backend-first race:
// when another component has already created a sparse user-managed config, the
// dashboard operator initializes the RHOAI tracking default without replacing
// unrelated fields.
func TestIntegration_RHOAIDashboardConfigDefault(t *testing.T) {
	ctx := context.Background()
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai

	config := &unstructured.Unstructured{Object: map[string]interface{}{
		"apiVersion": "opendatahub.io/v1alpha",
		"kind":       "OdhDashboardConfig",
		"metadata": map[string]interface{}{
			"name":      "odh-dashboard-config",
			"namespace": integrationNamespace,
		},
		"spec": map[string]interface{}{
			"notebookController": map[string]interface{}{"enabled": true},
		},
	}}
	config.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, k8sClient.Create(ctx, config))

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "test.example.com"},
		Modules: disableAllModulesExcept(),
	})
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		deleteIgnoreNotFound(t, config)
	})

	reconcile(t, r) // add the Dashboard finalizer
	reconcile(t, r) // deploy core resources and initialize the missing default

	updated := &unstructured.Unstructured{}
	updated.SetGroupVersionKind(odhDashboardConfigGVK)
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name: "odh-dashboard-config", Namespace: integrationNamespace,
	}, updated))
	disableTracking, found, err := unstructured.NestedBool(
		updated.Object, "spec", "dashboardConfig", "disableTracking",
	)
	require.NoError(t, err)
	require.True(t, found)
	assert.False(t, disableTracking)
	notebookEnabled, found, err := unstructured.NestedBool(
		updated.Object, "spec", "notebookController", "enabled",
	)
	require.NoError(t, err)
	require.True(t, found)
	assert.True(t, notebookEnabled)

	resourceVersion := updated.GetResourceVersion()
	reconcile(t, r)
	require.NoError(t, k8sClient.Get(ctx, types.NamespacedName{
		Name: "odh-dashboard-config", Namespace: integrationNamespace,
	}, updated))
	assert.Equal(t, resourceVersion, updated.GetResourceVersion(), "the initialized value should be stable")
}
