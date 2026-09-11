//go:build e2e

package e2e

import (
	"context"
	"testing"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func TestE2EDashboardLifecycle(t *testing.T) {
	key := client.ObjectKey{Name: dashboardv1alpha1.DashboardInstanceName}
	dashboard := &dashboardv1alpha1.Dashboard{}
	require.NoError(t, k8sClient.Get(context.Background(), key, dashboard))
	require.Equal(t, dashboardUID, dashboard.UID)
	require.Equal(t, e2eFieldOwner, dashboard.Labels[e2eManagedByKey])
	require.Equal(t, common.Managed, dashboard.Spec.ManagementState)
	require.NotNil(t, dashboard.Spec.Gateway)
	require.Equal(t, testGatewayDomain, dashboard.Spec.Gateway.Domain)
}
