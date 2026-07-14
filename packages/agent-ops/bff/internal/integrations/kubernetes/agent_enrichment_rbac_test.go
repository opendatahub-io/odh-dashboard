package kubernetes

import (
	"context"
	"testing"

	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	ktesting "k8s.io/client-go/testing"
)

func TestCanAccessAgentCardEnrichment_GrantsRoutesWhenAllowed(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == openshiftRouteEnrichmentGroup &&
			attrs.Resource == openshiftRouteEnrichmentResource &&
			attrs.Verb == "list"
	})

	access, err := client.CanAccessAgentCardEnrichment(
		context.Background(),
		&RequestIdentity{UserID: "user@example.com"},
		"demo-ns",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !access.Routes {
		t.Fatalf("expected route enrichment access to be granted, got %+v", access)
	}
	if access.MCPServers {
		t.Fatalf("expected MCP enrichment to be disabled, got %+v", access)
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
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if access.Routes || access.MCPServers {
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

	access, err := client.CanAccessAgentCardEnrichment(context.Background(), nil, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !access.Routes {
		t.Fatal("expected route enrichment to be allowed")
	}
	if access.MCPServers {
		t.Fatalf("expected only route access, got %+v", access)
	}
}
