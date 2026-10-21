package controller

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
)

func TestDataRegistryManifestConnectivity(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "modules", "data-registry")
	rendered, err := kustomize.NewEngine().Render(source, kustomize.WithNamespace("redhat-ods-applications"))
	require.NoError(t, err)

	var policy *unstructured.Unstructured
	var config *unstructured.Unstructured
	for i := range rendered {
		resource := &rendered[i]
		switch {
		case resource.GetKind() == "NetworkPolicy" && resource.GetName() == "data-registry-allow-ports":
			policy = resource
		case resource.GetKind() == "ConfigMap" && resource.GetName() == "data-registry-config":
			config = resource
		}
	}
	require.NotNil(t, config)
	require.NotNil(t, policy)

	apiURL, found, err := unstructured.NestedString(config.Object, "data", "apiURL")
	require.NoError(t, err)
	require.True(t, found)
	assert.Equal(t, "https://feast-data-registry-data-registry.rhoai-data-registry.svc:443", apiURL)

	var networkPolicy networkingv1.NetworkPolicy
	require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(policy.Object, &networkPolicy))
	assert.Equal(t, "data-registry-ui", networkPolicy.Spec.PodSelector.MatchLabels["deployment"])
	assert.Contains(t, networkPolicy.Spec.PolicyTypes, networkingv1.PolicyTypeEgress)
	for _, port := range []int32{443, 8443} {
		assert.True(t, egressAllowsPort(networkPolicy, port, func(peer networkingv1.NetworkPolicyPeer) bool {
			return peer.IPBlock == nil &&
				peer.NamespaceSelector != nil &&
				len(peer.NamespaceSelector.MatchLabels) == 1 &&
				peer.NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"] == "rhoai-data-registry" &&
				peer.PodSelector != nil &&
				len(peer.PodSelector.MatchLabels) == 2 &&
				peer.PodSelector.MatchLabels["feast.dev/name"] == "data-registry" &&
				peer.PodSelector.MatchLabels["feast.dev/service-type"] == "data-registry"
		}), "Data Registry BFF must reach the registry on TCP port %d", port)
	}
}
