//go:build integration

package controller_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/types"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func TestIntegration_RHOAIDashboardRouteHostnameUpdatesInPlace(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "RH-AI.Apps.Example.Com"},
	})
	ctx := context.Background()
	require.NoError(t, k8sClient.Create(ctx, dashboard))

	t.Cleanup(func() {
		deleteDashboard(t)
		cleanupModuleResources(t)
		route := &gatewayv1.HTTPRoute{}
		route.Name = "rhods-dashboard"
		route.Namespace = integrationNamespace
		_ = k8sClient.Delete(ctx, route)
	})

	reconcile(t, r)
	reconcile(t, r)
	route := &gatewayv1.HTTPRoute{}
	key := types.NamespacedName{Name: "rhods-dashboard", Namespace: integrationNamespace}
	require.NoError(t, k8sClient.Get(ctx, key, route))
	assert.Equal(t, []gatewayv1.Hostname{"rh-ai.apps.example.com"}, route.Spec.Hostnames)
	uid := route.UID

	dashboard = getDashboard(t)
	dashboard.Spec.Gateway.Domain = "updated.apps.example.com"
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)

	route = &gatewayv1.HTTPRoute{}
	require.NoError(t, k8sClient.Get(ctx, key, route))
	assert.Equal(t, uid, route.UID, "gateway domain changes must update the existing HTTPRoute")
	assert.Equal(t, []gatewayv1.Hostname{"updated.apps.example.com"}, route.Spec.Hostnames)

	dashboard = getDashboard(t)
	dashboard.Spec.Gateway = nil
	require.NoError(t, k8sClient.Update(ctx, dashboard))
	reconcile(t, r)

	route = &gatewayv1.HTTPRoute{}
	require.NoError(t, k8sClient.Get(ctx, key, route))
	assert.Equal(t, uid, route.UID, "clearing the gateway domain must update the existing HTTPRoute")
	assert.Empty(t, route.Spec.Hostnames, "clearing the gateway domain must remove the operator-owned hostname")
}
