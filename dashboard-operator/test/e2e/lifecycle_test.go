//go:build e2e

package e2e

import (
	"context"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func TestE2EDashboardLifecycle(t *testing.T) {
	key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}
	existing := &dashboardv1alpha1.Dashboard{}
	if err := k8sClient.Get(context.Background(), key, existing); err == nil {
		t.Skipf("Dashboard %q already exists; lifecycle test requires an isolated cluster", key.Name)
	} else if !apierrors.IsNotFound(err) {
		require.NoError(t, err)
	}

	uid, err := applyDashboardCR(k8sClient, dashboardv1alpha1.DashboardSpec{
		ManagementSpec: common.ManagementSpec{ManagementState: common.Removed},
	})
	require.NoError(t, err)

	cleanupRequired := true
	t.Cleanup(func() {
		if cleanupRequired {
			require.NoError(t, cleanupDashboardCR(k8sClient, uid))
		}
	})

	require.NoError(t, waitForCondition(
		k8sClient,
		dashboardv1alpha1.DashboardInstanceName,
		string(common.ConditionTypeProvisioningSucceeded),
		metav1.ConditionFalse,
		e2eCleanupTimeout,
	))
	require.NoError(t, cleanupDashboardCR(k8sClient, uid))
	cleanupRequired = false
}
