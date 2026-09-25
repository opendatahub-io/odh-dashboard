package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/event"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

const dashboardConfigTestNamespace = "redhat-ods-applications"

func dashboardConfigWithSpec(namespace string, spec map[string]interface{}) *unstructured.Unstructured {
	config := newOdhDashboardConfig()
	config.SetName(odhDashboardConfigName)
	config.SetNamespace(namespace)
	config.Object["spec"] = spec
	return config
}

func TestReconcileRHOAIDashboardConfigDefaultsInitializesMissingValue(t *testing.T) {
	config := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{
		"notebookController": map[string]interface{}{"enabled": true},
	})
	cli := fake.NewClientBuilder().WithRuntimeObjects(config).Build()
	r := &DashboardReconciler{
		Client:                cli,
		Platform:              cluster.SelfManagedRhoai,
		ApplicationsNamespace: dashboardConfigTestNamespace,
	}

	require.NoError(t, r.reconcileRHOAIDashboardConfigDefaults(context.Background()))

	updated := newOdhDashboardConfig()
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{
		Name: odhDashboardConfigName, Namespace: dashboardConfigTestNamespace,
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
	assert.True(t, notebookEnabled, "unrelated user configuration must be preserved")
}

func TestReconcileRHOAIDashboardConfigDefaultsPreservesExplicitValues(t *testing.T) {
	for _, value := range []bool{false, true} {
		t.Run(map[bool]string{false: "false", true: "true"}[value], func(t *testing.T) {
			config := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{
				"dashboardConfig": map[string]interface{}{"disableTracking": value},
			})
			cli := fake.NewClientBuilder().WithRuntimeObjects(config).Build()
			r := &DashboardReconciler{
				Client:                cli,
				Platform:              cluster.SelfManagedRhoai,
				ApplicationsNamespace: dashboardConfigTestNamespace,
			}

			require.NoError(t, r.reconcileRHOAIDashboardConfigDefaults(context.Background()))

			updated := newOdhDashboardConfig()
			require.NoError(t, cli.Get(context.Background(), types.NamespacedName{
				Name: odhDashboardConfigName, Namespace: dashboardConfigTestNamespace,
			}, updated))
			actual, found, err := unstructured.NestedBool(
				updated.Object, "spec", "dashboardConfig", "disableTracking",
			)
			require.NoError(t, err)
			require.True(t, found)
			assert.Equal(t, value, actual)
		})
	}
}

func TestReconcileRHOAIDashboardConfigDefaultsSkipsOpenDataHub(t *testing.T) {
	config := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{})
	cli := fake.NewClientBuilder().WithRuntimeObjects(config).Build()
	r := &DashboardReconciler{
		Client:                cli,
		Platform:              cluster.OpenDataHub,
		ApplicationsNamespace: dashboardConfigTestNamespace,
	}

	require.NoError(t, r.reconcileRHOAIDashboardConfigDefaults(context.Background()))

	updated := newOdhDashboardConfig()
	require.NoError(t, cli.Get(context.Background(), types.NamespacedName{
		Name: odhDashboardConfigName, Namespace: dashboardConfigTestNamespace,
	}, updated))
	_, found, err := unstructured.NestedBool(updated.Object, "spec", "dashboardConfig", "disableTracking")
	require.NoError(t, err)
	assert.False(t, found)
}

func TestReconcileRHOAIDashboardConfigDefaultsRejectsMalformedValue(t *testing.T) {
	config := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{
		"dashboardConfig": map[string]interface{}{"disableTracking": "false"},
	})
	cli := fake.NewClientBuilder().WithRuntimeObjects(config).Build()
	r := &DashboardReconciler{
		Client:                cli,
		Platform:              cluster.SelfManagedRhoai,
		ApplicationsNamespace: dashboardConfigTestNamespace,
	}

	err := r.reconcileRHOAIDashboardConfigDefaults(context.Background())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "disableTracking")
}

func TestOdhDashboardConfigWatchFiltersAndMaps(t *testing.T) {
	r := &DashboardReconciler{ApplicationsNamespace: dashboardConfigTestNamespace}
	p := r.odhDashboardConfigPredicate()
	sparse := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{})
	explicit := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{
		"dashboardConfig": map[string]interface{}{"disableTracking": false},
	})
	wrongNamespace := dashboardConfigWithSpec("other-namespace", map[string]interface{}{})
	unrelated := dashboardConfigWithSpec(dashboardConfigTestNamespace, map[string]interface{}{})
	unrelated.SetName("other-config")

	assert.True(t, p.Create(event.CreateEvent{Object: sparse}))
	assert.False(t, p.Create(event.CreateEvent{Object: explicit}))
	assert.False(t, p.Create(event.CreateEvent{Object: wrongNamespace}))
	assert.False(t, p.Create(event.CreateEvent{Object: unrelated}))
	assert.True(t, p.Update(event.UpdateEvent{ObjectOld: explicit, ObjectNew: sparse}))
	assert.False(t, p.Update(event.UpdateEvent{ObjectOld: sparse, ObjectNew: explicit}))
	assert.True(t, p.Delete(event.DeleteEvent{Object: sparse}))

	requests := r.mapOdhDashboardConfigToDashboard(context.Background(), sparse)
	require.Len(t, requests, 1)
	assert.Equal(t, v1alpha1.DashboardInstanceName, requests[0].Name)
	assert.Empty(t, requests[0].Namespace)
	assert.Empty(t, r.mapOdhDashboardConfigToDashboard(context.Background(), unrelated))
}
