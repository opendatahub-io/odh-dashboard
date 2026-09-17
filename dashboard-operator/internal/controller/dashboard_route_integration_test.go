//go:build integration

package controller_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/types"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/cluster"

	v1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
)

func writeCoreHTTPRouteFixture(t *testing.T, base string) {
	t.Helper()

	overlay := filepath.Join(base, "rhoai")
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "kustomization.yaml"), []byte(`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
  - httproute.yaml
`), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(overlay, "httproute.yaml"), []byte(`apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: rhods-dashboard
spec:
  parentRefs:
    - name: data-science-gateway
      namespace: openshift-ingress
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: rhods-dashboard
          port: 8443
`), 0644))
}

func TestIntegration_RHOAIDashboardRouteHostnameUpdatesInPlace(t *testing.T) {
	manifests := createIntegrationManifests(t, nil)
	writeCoreHTTPRouteFixture(t, manifests)
	r := newManifestReconciler(manifests)
	r.Platform = cluster.SelfManagedRhoai

	dashboard := newDashboard(v1alpha1.DashboardSpec{
		Gateway: &v1alpha1.GatewaySpec{Domain: "rh-ai.apps.example.com"},
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
}
