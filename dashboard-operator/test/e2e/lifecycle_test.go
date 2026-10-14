//go:build e2e

package e2e

import (
	"context"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func TestE2EDashboardLifecycle(t *testing.T) {
	requireManagedFixture(t)

	key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}
	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), key, dashboard))
	require.Equal(t, dashboardUID, dashboard.UID)
	require.Equal(t, e2eFieldOwner, dashboard.Labels[e2eManagedByKey])
	require.Equal(t, common.Managed, dashboard.Spec.ManagementState)
	require.NotNil(t, dashboard.Spec.Gateway)
	require.Equal(t, testGatewayDomain, dashboard.Spec.Gateway.Domain)
}

func TestE2EDashboardRemovedState(t *testing.T) {
	requireManagedFixture(t)
	previousRoute, err := waitForAdmittedHTTPRoute(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, patchDashboardManagementState(common.Managed))
		require.NoError(t, waitForCondition(
			k8sClient,
			dashboardv1alpha1.DashboardInstanceName,
			string(common.ConditionTypeProvisioningSucceeded),
			metav1.ConditionTrue,
			fixtureReadyTimeout,
		))
	})

	require.NoError(t, patchDashboardManagementState(common.Removed))
	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionFalse,
		fixtureReadyTimeout,
	))
	// Removed intentionally preserves the Dashboard PDB, so wait only for the
	// core workload and route that teardown owns instead of the full deletion
	// predicate used when the Dashboard CR itself is deleted.
	waitForObjectAbsent(t, &gatewayv1.HTTPRoute{}, previousRoute.Name)
	waitForObjectAbsent(t, &appsv1.Deployment{}, previousRoute.Name)

	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}, dashboard))
	require.Equal(t, common.Removed, dashboard.Spec.ManagementState)

	require.NoError(t, patchDashboardManagementState(common.Managed))
	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionTrue,
		fixtureReadyTimeout,
	))
	recreatedRoute, err := waitForAdmittedHTTPRoute(k8sClient, testNamespace, dashboardUID, operandReadyTimeout)
	require.NoError(t, err)
	require.NotEqual(t, previousRoute.UID, recreatedRoute.UID)
}

func patchDashboardManagementState(state common.ManagementState) error {
	return retry.RetryOnConflict(retry.DefaultBackoff, func() error {
		dashboard := &dashboardv1alpha1.Dashboard{}
		key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}
		if err := k8sClient.Get(context.Background(), key, dashboard); err != nil {
			return err
		}
		before := dashboard.DeepCopy()
		dashboard.Spec.ManagementState = state
		return k8sClient.Patch(context.Background(), dashboard, client.MergeFrom(before))
	})
}
