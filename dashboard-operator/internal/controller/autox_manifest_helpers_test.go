package controller

import (
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func renderModuleNetworkPolicy(t *testing.T, module, policyName string) networkingv1.NetworkPolicy {
	t.Helper()

	source := filepath.Join("..", "..", "..", "manifests", "modules", module)
	rendered, err := kustomize.NewEngine().Render(source, kustomize.WithNamespace("redhat-ods-applications"))
	require.NoError(t, err)

	for i := range rendered {
		resource := &rendered[i]
		if resource.GetKind() != "NetworkPolicy" || resource.GetName() != policyName {
			continue
		}

		var policy networkingv1.NetworkPolicy
		require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, &policy))
		return policy
	}

	t.Fatalf("%s NetworkPolicy not found in rendered %q module", policyName, module)
	return networkingv1.NetworkPolicy{}
}

func moduleAllowsIngressPort(policy networkingv1.NetworkPolicy, port int32, peerMatches func(networkingv1.NetworkPolicyPeer) bool) bool {
	for _, rule := range policy.Spec.Ingress {
		for _, policyPort := range rule.Ports {
			if policyPort.Port == nil || policyPort.Port.IntVal != port {
				continue
			}
			for _, peer := range rule.From {
				if peerMatches(peer) {
					return true
				}
			}
		}
	}
	return false
}

func moduleDashboardIngressPeer(peer networkingv1.NetworkPolicyPeer) bool {
	if peer.IPBlock != nil || peer.NamespaceSelector != nil || peer.PodSelector == nil {
		return false
	}

	values := map[string]bool{"odh-dashboard": false, "rhods-dashboard": false}
	for _, expression := range peer.PodSelector.MatchExpressions {
		if expression.Key != "deployment" || expression.Operator != metav1.LabelSelectorOpIn {
			continue
		}
		for _, value := range expression.Values {
			if _, ok := values[value]; ok {
				values[value] = true
			}
		}
	}
	return values["odh-dashboard"] && values["rhods-dashboard"]
}

func assertUnrestrictedInClusterEgress(t *testing.T, policy networkingv1.NetworkPolicy, module string) {
	t.Helper()

	unrestrictedPeers := 0
	scopedPeers := 0
	for _, rule := range policy.Spec.Egress {
		for _, peer := range rule.To {
			if !crossNamespacePeer(peer) {
				continue
			}
			if len(rule.Ports) == 0 {
				unrestrictedPeers++
			} else {
				scopedPeers++
			}
		}
	}

	assert.Equal(t, 1, unrestrictedPeers, "%s must contain exactly one unrestricted in-cluster egress peer", module)
	assert.Zero(t, scopedPeers, "%s must not retain a port-scoped all-namespace egress peer", module)
}
