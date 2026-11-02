package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

func TestAutoRAGManifestConnectivity(t *testing.T) {
	policy := renderModuleNetworkPolicy(t, "autorag", "autorag-allow-ports")

	assert.Equal(t, "autorag-ui", policy.Spec.PodSelector.MatchLabels["deployment"])
	assert.Contains(t, policy.Spec.PolicyTypes, networkingv1.PolicyTypeIngress)
	assert.Contains(t, policy.Spec.PolicyTypes, networkingv1.PolicyTypeEgress)
	assert.True(t, moduleAllowsIngressPort(policy, 8743, moduleDashboardIngressPeer),
		"AutoRAG must allow dashboard ingress on TCP 8743")
	assertIngressPortIsSourceScoped(t, policy, 8743, "AutoRAG")
	assertIngressPortAllowlist(t, policy, 8743, "AutoRAG")

	dns := namespacePeer("openshift-dns")
	apiServer := ipBlockPeer("0.0.0.0/0")
	assert.True(t, egressAllowsProtocolPort(policy, 5353, corev1.ProtocolUDP, dns),
		"AutoRAG must allow UDP DNS egress")
	assert.True(t, egressAllowsPort(policy, 5353, dns),
		"AutoRAG must allow TCP DNS egress")
	assert.True(t, egressAllowsPort(policy, 6443, apiServer),
		"AutoRAG must allow Kubernetes API egress")
	assert.True(t, egressAllowsPort(policy, 80, apiServer),
		"AutoRAG must allow external HTTP egress")
	assert.True(t, egressAllowsPort(policy, 443, apiServer),
		"AutoRAG must allow external HTTPS egress")

	assertUnrestrictedInClusterEgress(t, policy, "AutoRAG")
	assertIPBlockEgressBoundary(t, policy, "AutoRAG")
}
