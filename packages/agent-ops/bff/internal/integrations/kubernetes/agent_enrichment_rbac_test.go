package kubernetes

import (
	"context"
	"testing"

	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	ktesting "k8s.io/client-go/testing"
)

func TestCanAccessAgentCardEnrichment_UsesAgentRuntimeNameForGetSAR(t *testing.T) {
	var gotName string
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		if attrs == nil {
			return false
		}
		if attrs.Verb == "get" && attrs.Resource == agentRuntimeEnrichmentResource {
			gotName = attrs.Name
			return true
		}
		return attrs.Verb == "list"
	})

	access, err := client.CanAccessAgentCardEnrichment(
		context.Background(),
		&RequestIdentity{UserID: "user@example.com"},
		"demo-ns",
		"runtime-cr-name",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotName != "runtime-cr-name" {
		t.Fatalf("expected get SAR for runtime CR name, got %q", gotName)
	}
	if !access.AgentRuntime {
		t.Fatal("expected agent runtime enrichment access")
	}
}

func TestCanAccessAgentCardEnrichment_GrantsMCPWhenEitherAPIGroupAllows(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		if attrs == nil {
			return false
		}
		switch {
		case attrs.Group == "mcp.kagenti.com" && attrs.Resource == "mcpserverregistrations" && attrs.Verb == "list":
			return true
		case attrs.Group == "mcp.kuadrant.io" && attrs.Resource == "mcpserverregistrations" && attrs.Verb == "list":
			return false
		default:
			return attrs.Verb == "list" || attrs.Verb == "get"
		}
	})

	access, err := client.CanAccessAgentCardEnrichment(
		context.Background(),
		&RequestIdentity{UserID: "user@example.com"},
		"demo-ns",
		"sample-agent",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !access.AgentRuntime || !access.Routes || !access.MCPServers {
		t.Fatalf("expected enrichment access to be granted, got %+v", access)
	}
}

func TestCanAccessAgentCardEnrichment_DeniesWhenAllChecksFail(t *testing.T) {
	client := newRBACTestInternalClient(t, func(_ *authv1.SubjectAccessReview) bool {
		return false
	})

	access, err := client.CanAccessAgentCardEnrichment(
		context.Background(),
		&RequestIdentity{UserID: "user@example.com"},
		"demo-ns",
		"sample-agent",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if access.AgentRuntime || access.Routes || access.MCPServers {
		t.Fatalf("expected enrichment access to be denied, got %+v", access)
	}
}

func newSelfSARRBACTestTokenClient(t *testing.T, reactor func(*authv1.SelfSubjectAccessReview) bool) *TokenKubernetesClient {
	t.Helper()

	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "selfsubjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		sar := action.(ktesting.CreateAction).GetObject().(*authv1.SelfSubjectAccessReview)
		sar.Status.Allowed = reactor(sar)
		return true, sar, nil
	})

	return &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
		},
	}
}

func TestTokenCanAccessAgentCardEnrichment_UsesSelfSAR(t *testing.T) {
	client := newSelfSARRBACTestTokenClient(t, func(sar *authv1.SelfSubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil && attrs.Group == openshiftRouteEnrichmentGroup && attrs.Verb == "list"
	})

	access, err := client.CanAccessAgentCardEnrichment(context.Background(), nil, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !access.Routes {
		t.Fatal("expected route enrichment to be allowed")
	}
	if access.AgentRuntime || access.MCPServers {
		t.Fatalf("expected only route access, got %+v", access)
	}
}
