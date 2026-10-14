package controller

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/yaml"
)

// loadDashboardAllowPorts reads the main dashboard operand NetworkPolicy manifest
// (manifests/base/networkpolicy.yaml) and returns it as a typed NetworkPolicy.
func loadDashboardAllowPorts(t *testing.T) networkingv1.NetworkPolicy {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "manifests", "base", "networkpolicy.yaml"))
	require.NoError(t, err)
	resource := unstructured.Unstructured{}
	require.NoError(t, yaml.Unmarshal(data, &resource.Object))
	var policy networkingv1.NetworkPolicy
	require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, &policy))
	require.Equal(t, "dashboard-allow-ports", policy.Name)
	return policy
}

// egressAllowsPort reports whether the policy has an egress rule that both targets a
// peer matching peerMatches and permits the given TCP port.
func egressAllowsPort(policy networkingv1.NetworkPolicy, port int32, peerMatches func(networkingv1.NetworkPolicyPeer) bool) bool {
	for _, rule := range policy.Spec.Egress {
		hasPort := false
		for _, p := range rule.Ports {
			// Treat a nil protocol as TCP (the Kubernetes default) and accept only TCP,
			// so a UDP rule on the same port number does not satisfy the assertion.
			if p.Port != nil &&
				p.Port.IntVal == port &&
				(p.Protocol == nil || *p.Protocol == corev1.ProtocolTCP) {
				hasPort = true
				break
			}
		}
		if !hasPort {
			continue
		}
		for _, peer := range rule.To {
			if peerMatches(peer) {
				return true
			}
		}
	}
	return false
}

// crossNamespacePeer matches a namespaceSelector: {} peer (all namespaces, used for
// cross-namespace user-project egress such as the DSPA pipeline server).
func crossNamespacePeer(peer networkingv1.NetworkPolicyPeer) bool {
	return peer.IPBlock == nil &&
		peer.PodSelector == nil &&
		peer.NamespaceSelector != nil &&
		len(peer.NamespaceSelector.MatchLabels) == 0 &&
		len(peer.NamespaceSelector.MatchExpressions) == 0
}

// namespacePeer returns a matcher for a namespaceSelector scoped to a specific
// kubernetes.io/metadata.name value.
func namespacePeer(name string) func(networkingv1.NetworkPolicyPeer) bool {
	return func(peer networkingv1.NetworkPolicyPeer) bool {
		// Require a namespaceSelector scoped to exactly the named namespace and nothing
		// else: a future peer that adds labels, expressions, a podSelector, or an ipBlock
		// would otherwise satisfy the test while narrowing the allowed Thanos endpoints.
		return peer.NamespaceSelector != nil &&
			peer.PodSelector == nil &&
			peer.IPBlock == nil &&
			len(peer.NamespaceSelector.MatchLabels) == 1 &&
			peer.NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"] == name &&
			len(peer.NamespaceSelector.MatchExpressions) == 0
	}
}

// TestDashboardEgressAllowsPipelineServer guards RHOAIENG-100654: the dashboard backend
// proxies pipeline API calls to ds-pipeline-dspa.<ns>.svc:8443 in user-project namespaces,
// so egress to port 8443 cross-namespace must be allowed.
func TestDashboardEgressAllowsPipelineServer(t *testing.T) {
	policy := loadDashboardAllowPorts(t)
	assert.True(t,
		egressAllowsPort(policy, 8443, crossNamespacePeer),
		"dashboard NetworkPolicy must allow cross-namespace egress to the DSPA pipeline server on port 8443",
	)
}

// TestDashboardEgressAllowsThanosMonitoring guards RHOAIENG-100638: the dashboard backend
// proxies storage/PVC metrics queries to thanos-querier in openshift-monitoring on the
// tenancy (9092) and web (9091) ports.
func TestDashboardEgressAllowsThanosMonitoring(t *testing.T) {
	policy := loadDashboardAllowPorts(t)
	monitoring := namespacePeer("openshift-monitoring")
	assert.True(t,
		egressAllowsPort(policy, 9092, monitoring),
		"dashboard NetworkPolicy must allow egress to Thanos (openshift-monitoring) on tenancy port 9092",
	)
	assert.True(t,
		egressAllowsPort(policy, 9091, monitoring),
		"dashboard NetworkPolicy must allow egress to Thanos (openshift-monitoring) on web port 9091",
	)
}
