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
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestAutoMLManifestConnectivity(t *testing.T) {
	source := filepath.Join("..", "..", "..", "manifests", "modules", "automl")
	rendered, err := kustomize.NewEngine().Render(source, kustomize.WithNamespace("redhat-ods-applications"))
	require.NoError(t, err)

	var policy *unstructured.Unstructured
	for i := range rendered {
		resource := &rendered[i]
		if resource.GetKind() == "NetworkPolicy" && resource.GetName() == "automl-allow-ports" {
			policy = resource
			break
		}
	}
	require.NotNil(t, policy)

	var networkPolicy networkingv1.NetworkPolicy
	require.NoError(t, runtime.DefaultUnstructuredConverter.FromUnstructured(policy.Object, &networkPolicy))
	assert.Equal(t, "automl-ui", networkPolicy.Spec.PodSelector.MatchLabels["deployment"])
	assert.Contains(t, networkPolicy.Spec.PolicyTypes, networkingv1.PolicyTypeIngress)
	assert.Contains(t, networkPolicy.Spec.PolicyTypes, networkingv1.PolicyTypeEgress)

	allowsIngress := func(port int32, peerMatches func(networkingv1.NetworkPolicyPeer) bool) bool {
		for _, rule := range networkPolicy.Spec.Ingress {
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

	allowsEgress := func(port int32, protocol corev1.Protocol, peerMatches func(networkingv1.NetworkPolicyPeer) bool) bool {
		for _, rule := range networkPolicy.Spec.Egress {
			for _, policyPort := range rule.Ports {
				if policyPort.Port == nil || policyPort.Port.IntVal != port {
					continue
				}
				if policyPort.Protocol == nil && protocol != corev1.ProtocolTCP {
					continue
				}
				if policyPort.Protocol != nil && *policyPort.Protocol != protocol {
					continue
				}
				for _, peer := range rule.To {
					if peerMatches(peer) {
						return true
					}
				}
			}
		}
		return false
	}

	dashboardPeer := func(peer networkingv1.NetworkPolicyPeer) bool {
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
	ipBlockPeer := func(peer networkingv1.NetworkPolicyPeer) bool {
		return peer.IPBlock != nil &&
			peer.IPBlock.CIDR == "0.0.0.0/0" &&
			peer.PodSelector == nil &&
			peer.NamespaceSelector == nil
	}

	assert.True(t, allowsIngress(8643, dashboardPeer), "AutoML must allow dashboard ingress on TCP 8643")
	dns := namespacePeer("openshift-dns")
	assert.True(t, allowsEgress(5353, corev1.ProtocolUDP, dns), "AutoML must allow UDP DNS egress")
	assert.True(t, allowsEgress(5353, corev1.ProtocolTCP, dns), "AutoML must allow TCP DNS egress")
	assert.True(t, allowsEgress(6443, corev1.ProtocolTCP, ipBlockPeer), "AutoML must allow Kubernetes API egress")
	assert.True(t, allowsEgress(80, corev1.ProtocolTCP, ipBlockPeer), "AutoML must allow external HTTP egress")
	assert.True(t, allowsEgress(443, corev1.ProtocolTCP, ipBlockPeer), "AutoML must allow external HTTPS egress")

	unrestricted := false
	for _, rule := range networkPolicy.Spec.Egress {
		if len(rule.Ports) != 0 {
			continue
		}
		for _, peer := range rule.To {
			if crossNamespacePeer(peer) {
				unrestricted = true
			}
		}
	}
	assert.True(t, unrestricted, "AutoML must allow arbitrary ports to in-cluster pods")
}
