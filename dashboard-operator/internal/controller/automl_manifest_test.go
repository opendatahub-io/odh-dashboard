package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

func TestAutoMLManifestConnectivity(t *testing.T) {
	policy := renderModuleNetworkPolicy(t, "automl", "automl-allow-ports")

	assert.Equal(t, "automl-ui", policy.Spec.PodSelector.MatchLabels["deployment"])
	assert.Contains(t, policy.Spec.PolicyTypes, networkingv1.PolicyTypeIngress)
	assert.Contains(t, policy.Spec.PolicyTypes, networkingv1.PolicyTypeEgress)
	assert.True(t, moduleAllowsIngressPort(policy, 8643, moduleDashboardIngressPeer),
		"AutoML must allow dashboard ingress on TCP 8643")
	assertIngressPortIsSourceScoped(t, policy, 8643, "AutoML")
	assertIngressPortAllowlist(t, policy, 8643, "AutoML")

	dns := namespacePeer("openshift-dns")
	apiServer := ipBlockPeer("0.0.0.0/0")
	assert.True(t, egressAllowsProtocolPort(policy, 5353, corev1.ProtocolUDP, dns),
		"AutoML must allow UDP DNS egress")
	assert.True(t, egressAllowsPort(policy, 5353, dns),
		"AutoML must allow TCP DNS egress")
	assert.True(t, egressAllowsPort(policy, 6443, apiServer),
		"AutoML must allow Kubernetes API egress")
	assert.True(t, egressAllowsPort(policy, 80, apiServer),
		"AutoML must allow external HTTP egress")
	assert.True(t, egressAllowsPort(policy, 443, apiServer),
		"AutoML must allow external HTTPS egress")

	assertUnrestrictedInClusterEgress(t, policy, "AutoML")
	assertIPBlockEgressBoundary(t, policy, "AutoML")
}
