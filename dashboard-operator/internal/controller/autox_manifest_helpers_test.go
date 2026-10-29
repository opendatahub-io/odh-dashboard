package controller

import (
	"path/filepath"
	"testing"

	"github.com/opendatahub-io/odh-platform-utilities/pkg/render/kustomize"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
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
			if policyPort.Port == nil ||
				policyPort.Port.Type != intstr.Int ||
				policyPort.Port.IntVal != port ||
				policyPort.EndPort != nil {
				continue
			}
			if policyPort.Protocol != nil && *policyPort.Protocol != corev1.ProtocolTCP {
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

func assertIngressPortIsSourceScoped(t *testing.T, policy networkingv1.NetworkPolicy, port int32, module string) {
	t.Helper()

	broadSourceRules := 0
	broadSourcePeers := 0
	broadPortRules := 0
	unauthorizedSourcePeers := 0
	namedIngressPorts := 0
	for _, rule := range policy.Spec.Ingress {
		for _, policyPort := range rule.Ports {
			if policyPort.Port != nil && policyPort.Port.Type == intstr.String {
				namedIngressPorts++
			}
		}
		if !ingressRuleContainsTCPPort(rule, port) {
			continue
		}
		if !ingressRuleHasExactTCPPort(rule, port) {
			broadPortRules++
		}
		if len(rule.From) == 0 {
			broadSourceRules++
			continue
		}
		for _, peer := range rule.From {
			if broadIngressPeer(peer) {
				broadSourcePeers++
			}
			if !moduleAllowedIngressPeer(peer) {
				unauthorizedSourcePeers++
			}
		}
	}
	assert.Zero(t, broadSourceRules, "%s must not allow ingress from all sources", module)
	assert.Zero(t, broadSourcePeers, "%s must not allow ingress from a broad source peer", module)
	assert.Zero(t, broadPortRules, "%s must not use an unbounded or ranged ingress port rule", module)
	assert.Zero(t, unauthorizedSourcePeers, "%s must not allow ingress from an unauthorized source peer", module)
	assert.Zero(t, namedIngressPorts, "%s must use numeric ingress ports for boundary assertions", module)
}

func ingressRuleContainsTCPPort(rule networkingv1.NetworkPolicyIngressRule, port int32) bool {
	if len(rule.Ports) == 0 {
		return true
	}
	for _, policyPort := range rule.Ports {
		if policyPort.Protocol != nil && *policyPort.Protocol != corev1.ProtocolTCP {
			continue
		}
		if policyPort.Port == nil {
			return true
		}
		if policyPort.Port.Type != intstr.Int {
			continue
		}
		if policyPort.Port.IntVal == port {
			return true
		}
		if policyPort.EndPort != nil && policyPort.Port.IntVal <= port && port <= *policyPort.EndPort {
			return true
		}
	}
	return false
}

func ingressRuleHasExactTCPPort(rule networkingv1.NetworkPolicyIngressRule, port int32) bool {
	if len(rule.Ports) == 0 {
		return false
	}
	for _, policyPort := range rule.Ports {
		if policyPort.Port == nil || policyPort.Port.Type != intstr.Int {
			return false
		}
		if policyPort.EndPort != nil && policyPort.Port.IntVal <= port && port <= *policyPort.EndPort {
			return false
		}
		if policyPort.Port.IntVal != port {
			continue
		}
		if policyPort.Protocol != nil && *policyPort.Protocol != corev1.ProtocolTCP {
			return false
		}
	}
	return true
}

func assertIngressPortAllowlist(t *testing.T, policy networkingv1.NetworkPolicy, port int32, module string) {
	t.Helper()

	invalidPorts := 0
	for _, rule := range policy.Spec.Ingress {
		for _, policyPort := range rule.Ports {
			if policyPort.Port == nil ||
				policyPort.Port.Type != intstr.Int ||
				policyPort.Port.IntVal != port ||
				policyPort.EndPort != nil ||
				(policyPort.Protocol != nil && *policyPort.Protocol != corev1.ProtocolTCP) {
				invalidPorts++
			}
		}
	}
	assert.Zero(t, invalidPorts, "%s must only allow ingress on TCP %d", module, port)
}

func moduleAllowedIngressPeer(peer networkingv1.NetworkPolicyPeer) bool {
	return moduleDashboardIngressPeer(peer) || moduleOpenShiftIngressPeer(peer)
}

func moduleOpenShiftIngressPeer(peer networkingv1.NetworkPolicyPeer) bool {
	return peer.IPBlock == nil &&
		peer.PodSelector == nil &&
		peer.NamespaceSelector != nil &&
		len(peer.NamespaceSelector.MatchLabels) == 1 &&
		peer.NamespaceSelector.MatchLabels["network.openshift.io/policy-group"] == "ingress" &&
		len(peer.NamespaceSelector.MatchExpressions) == 0
}

func broadIngressPeer(peer networkingv1.NetworkPolicyPeer) bool {
	if peer.IPBlock != nil {
		return peer.IPBlock.CIDR == "0.0.0.0/0" || peer.IPBlock.CIDR == "::/0"
	}
	if peer.PodSelector == nil && peer.NamespaceSelector == nil {
		return true
	}
	if peer.PodSelector != nil && len(peer.PodSelector.MatchLabels) == 0 && len(peer.PodSelector.MatchExpressions) == 0 {
		return peer.NamespaceSelector == nil || emptyNamespaceSelectorPeer(peer)
	}
	return peer.NamespaceSelector != nil &&
		len(peer.NamespaceSelector.MatchLabels) == 0 &&
		len(peer.NamespaceSelector.MatchExpressions) == 0
}

func moduleDashboardIngressPeer(peer networkingv1.NetworkPolicyPeer) bool {
	if peer.IPBlock != nil || peer.NamespaceSelector != nil || peer.PodSelector == nil {
		return false
	}
	if len(peer.PodSelector.MatchLabels) != 0 || len(peer.PodSelector.MatchExpressions) != 1 {
		return false
	}

	values := map[string]bool{"odh-dashboard": false, "rhods-dashboard": false}
	expression := peer.PodSelector.MatchExpressions[0]
	if expression.Key != "deployment" || expression.Operator != metav1.LabelSelectorOpIn || len(expression.Values) != len(values) {
		return false
	}
	for _, value := range expression.Values {
		if _, ok := values[value]; !ok {
			return false
		}
		values[value] = true
	}
	return values["odh-dashboard"] && values["rhods-dashboard"]
}

func assertUnrestrictedInClusterEgress(t *testing.T, policy networkingv1.NetworkPolicy, module string) {
	t.Helper()

	// The empty namespaceSelector intentionally permits pod destinations in any namespace.
	// Empty destinations or IPBlocks without constrained ports permit unrestricted destinations;
	// empty peers are invalid or ambiguous. Reject all of these forms.
	unrestrictedPeers := 0
	scopedPeers := 0
	emptyDestinationRules := 0
	emptyPeers := 0
	unexpectedNamespacePeers := 0
	for _, rule := range policy.Spec.Egress {
		if len(rule.To) == 0 {
			emptyDestinationRules++
		}
		for _, peer := range rule.To {
			if peer.IPBlock == nil && peer.PodSelector == nil && peer.NamespaceSelector == nil {
				emptyPeers++
			}
			if emptyNamespaceSelectorPeer(peer) && peer.PodSelector != nil {
				unexpectedNamespacePeers++
			}
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
	assert.Zero(t, emptyDestinationRules, "%s must not contain an egress rule with all destinations", module)
	assert.Zero(t, emptyPeers, "%s must not contain an empty egress peer", module)
	assert.Zero(t, unexpectedNamespacePeers, "%s must not add a pod selector to the all-namespace peer", module)
}

func emptyNamespaceSelectorPeer(peer networkingv1.NetworkPolicyPeer) bool {
	return peer.IPBlock == nil &&
		peer.NamespaceSelector != nil &&
		len(peer.NamespaceSelector.MatchLabels) == 0 &&
		len(peer.NamespaceSelector.MatchExpressions) == 0
}

func assertIPBlockEgressBoundary(t *testing.T, policy networkingv1.NetworkPolicy, module string) {
	t.Helper()

	allowedPorts := map[int32]bool{80: true, 443: true, 6443: true}
	invalidPorts := 0
	invalidDestinations := 0
	for _, rule := range policy.Spec.Egress {
		for _, peer := range rule.To {
			if peer.IPBlock == nil {
				continue
			}
			if peer.IPBlock.CIDR != "0.0.0.0/0" || len(peer.IPBlock.Except) != 0 {
				invalidDestinations++
			}
			if len(rule.Ports) == 0 {
				invalidPorts++
				continue
			}
			for _, port := range rule.Ports {
				if port.Port == nil || port.Port.Type != intstr.Int || !allowedPorts[port.Port.IntVal] || port.EndPort != nil {
					invalidPorts++
					continue
				}
				if port.Protocol != nil && *port.Protocol != corev1.ProtocolTCP {
					invalidPorts++
				}
			}
		}
	}
	assert.Zero(t, invalidDestinations, "%s must keep IPBlock egress on the expected CIDR without exclusions", module)
	assert.Zero(t, invalidPorts, "%s must keep IPBlock egress limited to TCP 80, 443, and 6443", module)
}
