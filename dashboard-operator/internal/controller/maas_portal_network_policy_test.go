package controller

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"
	"sigs.k8s.io/yaml"
)

func portalDependencyPolicies(t *testing.T) []unstructured.Unstructured {
	t.Helper()
	var resources []unstructured.Unstructured
	for _, file := range []string{"modules/maas/networkpolicy.yaml", "modules/gen-ai/networkpolicy.yaml", "observability/rhoai/network-policy.yaml"} {
		data, err := os.ReadFile(filepath.Join("..", "..", "..", "manifests", file))
		require.NoError(t, err)
		resource := unstructured.Unstructured{}
		require.NoError(t, yaml.Unmarshal(data, &resource.Object))
		resources = append(resources, resource)
	}
	require.NoError(t, setMaaSPortalPersesIngressNamespace(resources, maasPortalTestNamespace))
	return resources
}

func TestLegacyMaaSPortalNetworkAccess(t *testing.T) {
	ctx := context.Background()
	legacy := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: legacyMaaSPortalName, Namespace: maasPortalTestNamespace}}
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithObjects(legacy).Build()
	resources := portalDependencyPolicies(t)
	require.NoError(t, preserveLegacyMaaSPortalNetworkAccess(ctx, cli, resources, maasPortalTestNamespace))
	for _, resource := range resources {
		var policy networkingv1.NetworkPolicy
		require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, &policy))
		ingress := policy.Spec.Ingress[0]
		newPeer := ingress.From[len(ingress.From)-2]
		legacyPeer := ingress.From[len(ingress.From)-1]
		key := "deployment"
		if policy.Name == "dashboard-perses-access" {
			key = "app.kubernetes.io/part-of"
			require.NotNil(t, legacyPeer.NamespaceSelector)
			assert.Equal(t, maasPortalTestNamespace, legacyPeer.NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"])
		}
		assert.Equal(t, maasPortalDeploymentName, newPeer.PodSelector.MatchLabels[key])
		assert.Equal(t, legacyMaaSPortalName, legacyPeer.PodSelector.MatchLabels[key])
		legacyPeer.PodSelector.MatchLabels[key] = maasPortalDeploymentName
		assert.Equal(t, newPeer, legacyPeer, "legacy access must retain the original namespace and selector restrictions")
	}
	// Render from the manifests again after cleanup, as the reconciler does:
	// temporary peers must disappear without retaining permissions indefinitely.
	require.NoError(t, cli.Delete(ctx, legacy))
	fresh := portalDependencyPolicies(t)
	expected := portalDependencyPolicies(t)
	require.NoError(t, preserveLegacyMaaSPortalNetworkAccess(ctx, cli, fresh, maasPortalTestNamespace))
	assert.Equal(t, expected, fresh)
}

func TestLegacyMaaSPortalNetworkAccessDiscoveryFailure(t *testing.T) {
	cli := fake.NewClientBuilder().WithScheme(maasPortalScheme(t)).WithInterceptorFuncs(interceptor.Funcs{
		Get: func(context.Context, client.WithWatch, client.ObjectKey, client.Object, ...client.GetOption) error {
			return errors.New("temporary discovery failure")
		},
	}).Build()
	resources := portalDependencyPolicies(t)
	expected := portalDependencyPolicies(t)
	require.ErrorContains(t, preserveLegacyMaaSPortalNetworkAccess(context.Background(), cli, resources, maasPortalTestNamespace), "temporary discovery failure")
	assert.Equal(t, expected, resources, "do not replace policies when legacy backend discovery fails")
}
