package charts_test

import (
	"os/exec"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"sigs.k8s.io/yaml"
)

// renderOperatorNetworkPolicy renders the chart and returns the controller-pod metrics
// NetworkPolicy. extraArgs are forwarded to `helm template` (e.g. toggles / overrides).
func renderOperatorNetworkPolicy(t *testing.T, extraArgs ...string) networkingv1.NetworkPolicy {
	t.Helper()

	args := append([]string{"--namespace", "opendatahub"}, extraArgs...)
	output, err := renderChartTemplate("../charts/dashboard", args...)
	if err != nil {
		t.Fatalf("render chart: %v", err)
	}

	for _, doc := range strings.Split(output, "---") {
		doc = strings.TrimSpace(doc)
		if doc == "" || !strings.Contains(doc, "kind: NetworkPolicy") {
			continue
		}
		var policy networkingv1.NetworkPolicy
		if err := yaml.Unmarshal([]byte(doc), &policy); err != nil {
			t.Fatalf("parse NetworkPolicy: %v", err)
		}
		return policy
	}

	t.Fatal("expected a NetworkPolicy in rendered chart output")
	return networkingv1.NetworkPolicy{}
}

// ingressRuleForPort returns the first ingress rule that permits the given TCP port, or nil.
func ingressRuleForPort(policy networkingv1.NetworkPolicy, port int32) *networkingv1.NetworkPolicyIngressRule {
	for i := range policy.Spec.Ingress {
		rule := &policy.Spec.Ingress[i]
		for _, p := range rule.Ports {
			// Treat a nil protocol as TCP (the Kubernetes default) and accept only TCP.
			if p.Port != nil && p.Port.IntVal == port &&
				(p.Protocol == nil || *p.Protocol == corev1.ProtocolTCP) {
				return rule
			}
		}
	}
	return nil
}

// namespaceNamePeer reports whether a peer is a namespaceSelector scoped to exactly the named
// namespace (by kubernetes.io/metadata.name) with no other selectors.
func namespaceNamePeer(peer networkingv1.NetworkPolicyPeer, name string) bool {
	return peer.PodSelector == nil &&
		peer.IPBlock == nil &&
		peer.NamespaceSelector != nil &&
		len(peer.NamespaceSelector.MatchExpressions) == 0 &&
		len(peer.NamespaceSelector.MatchLabels) == 1 &&
		peer.NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"] == name
}

func TestOperatorNetworkPolicy(t *testing.T) {
	if _, err := exec.LookPath("helm"); err != nil {
		t.Skip("helm not installed")
	}

	policy := renderOperatorNetworkPolicy(t)

	// Selects the controller pod via the chart's selectorLabels.
	if got := policy.Spec.PodSelector.MatchLabels["app.kubernetes.io/name"]; got != "dashboard-operator" {
		t.Fatalf("podSelector must select the operator pod; app.kubernetes.io/name = %q", got)
	}

	// Ingress-only policy.
	if len(policy.Spec.PolicyTypes) != 1 || policy.Spec.PolicyTypes[0] != networkingv1.PolicyTypeIngress {
		t.Fatalf("expected policyTypes [Ingress], got %v", policy.Spec.PolicyTypes)
	}

	// Health/readiness probes (:8081) are port-scoped with no `from` (kubelet probes are host-sourced).
	healthRule := ingressRuleForPort(policy, 8081)
	if healthRule == nil {
		t.Fatal("expected an ingress rule allowing health port 8081")
	}
	if len(healthRule.From) != 0 {
		t.Fatalf("health rule (8081) must be port-scoped with no `from` peers, got %d", len(healthRule.From))
	}

	// Metrics (:8443) allowed from exactly the four supported monitoring namespaces.
	metricsRule := ingressRuleForPort(policy, 8443)
	if metricsRule == nil {
		t.Fatal("expected an ingress rule allowing metrics port 8443")
	}
	wantNamespaces := []string{
		"openshift-monitoring",
		"openshift-user-workload-monitoring",
		"redhat-ods-monitoring",
		"opendatahub-monitoring",
	}
	// There must be exactly one TCP 8443 rule: a second peerless rule would silently allow
	// metrics from all sources (CWE-284) while this test only inspects the first match.
	metricsRuleCount := 0
	for i := range policy.Spec.Ingress {
		for _, p := range policy.Spec.Ingress[i].Ports {
			if p.Port != nil && p.Port.IntVal == 8443 &&
				(p.Protocol == nil || *p.Protocol == corev1.ProtocolTCP) {
				metricsRuleCount++
				break
			}
		}
	}
	if metricsRuleCount != 1 {
		t.Fatalf("expected exactly one metrics rule (8443), got %d", metricsRuleCount)
	}
	if len(metricsRule.From) != len(wantNamespaces) {
		t.Fatalf("metrics rule (8443) must contain exactly %d namespace peers, got %d",
			len(wantNamespaces), len(metricsRule.From))
	}
	for _, ns := range wantNamespaces {
		found := false
		for _, peer := range metricsRule.From {
			if namespaceNamePeer(peer, ns) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("metrics rule (8443) must allow ingress from monitoring namespace %q", ns)
		}
	}
}

func TestOperatorNetworkPolicyWebhookRule(t *testing.T) {
	if _, err := exec.LookPath("helm"); err != nil {
		t.Skip("helm not installed")
	}

	// Disabled by default: no webhook (9443) ingress rule.
	if rule := ingressRuleForPort(renderOperatorNetworkPolicy(t), 9443); rule != nil {
		t.Fatal("webhook port 9443 must not be allowed when webhook.enabled=false")
	}

	// When the webhook is enabled, a port-scoped rule for its port is added.
	policy := renderOperatorNetworkPolicy(t, "--set", "webhook.enabled=true")
	rule := ingressRuleForPort(policy, 9443)
	if rule == nil {
		t.Fatal("expected an ingress rule allowing webhook port 9443 when webhook.enabled=true")
	}
	if len(rule.From) != 0 {
		t.Fatalf("webhook rule (9443) must be port-scoped with no `from` peers, got %d", len(rule.From))
	}
}

func TestOperatorNetworkPolicyDisabled(t *testing.T) {
	if _, err := exec.LookPath("helm"); err != nil {
		t.Skip("helm not installed")
	}

	output, err := renderChartTemplate(
		"../charts/dashboard",
		"--namespace", "opendatahub",
		"--set", "networkPolicy.enabled=false",
	)
	if err != nil {
		t.Fatalf("render chart: %v", err)
	}
	if strings.Contains(output, "kind: NetworkPolicy") {
		t.Fatal("expected no NetworkPolicy when networkPolicy.enabled=false")
	}
}
