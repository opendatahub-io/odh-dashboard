package kubernetes

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	ktesting "k8s.io/client-go/testing"
)

func newRBACTestInternalClient(t *testing.T, reactor func(*authv1.SubjectAccessReview) bool) *InternalKubernetesClient {
	t.Helper()

	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "subjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		sar := action.(ktesting.CreateAction).GetObject().(*authv1.SubjectAccessReview)
		sar.Status.Allowed = reactor(sar)
		return true, sar, nil
	})

	return &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
		},
		sarClientset: clientset,
	}
}

func TestCanListAgentsInNamespace_ChecksSandboxesList(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "list"
	})

	allowed, err := client.CanListAgentsInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected sandboxes list access to be allowed")
	}
}

func TestCanGetAgentInNamespace_ChecksSandboxesGet(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "get" &&
			attrs.Name == "sample-agent"
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected sandboxes get access to be allowed")
	}
}

func TestCanGetAgentInNamespace_DeniesWithoutSandboxesGet(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		return false
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatal("expected sandboxes get access to be denied")
	}
}

func TestCanGetAgentInNamespace_ReturnsErrorOnSARFailure(t *testing.T) {
	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "subjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, assert.AnError
	})

	client := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
		},
		sarClientset: clientset,
	}

	_, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err == nil {
		t.Fatal("expected SAR failure error")
	}
}

func TestCanPatchAgentInNamespace_ChecksSandboxesPatch(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "patch" &&
			attrs.Name == "sample-agent"
	})

	allowed, err := client.CanPatchAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected sandboxes patch access to be allowed")
	}
}

func TestCanDeleteAgentInNamespace_ChecksSandboxesDelete(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "delete" &&
			attrs.Name == "sample-agent"
	})

	allowed, err := client.CanDeleteAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected sandboxes delete access to be allowed")
	}
}

func TestCanListAgentsInNamespace_ReturnsErrorOnSARFailure(t *testing.T) {
	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "subjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, assert.AnError
	})

	client := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
		},
		sarClientset: clientset,
	}

	_, err := client.CanListAgentsInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err == nil {
		t.Fatal("expected SAR failure error")
	}
}

func TestCanDeployAgentInNamespace_AllowsWhenCreateAndGetGranted(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			(attrs.Verb == "create" || attrs.Verb == "get")
	})

	allowed, err := client.CanDeployAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected deploy access to be allowed")
	}
}

func TestCanDeployAgentInNamespace_DeniesWithoutCreate(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "get"
	})

	allowed, err := client.CanDeployAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatal("expected deploy access to be denied without sandboxes create")
	}
}

func TestCanDeployAgentInNamespace_DeniesWithoutGet(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "create"
	})

	allowed, err := client.CanDeployAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatal("expected deploy access to be denied without sandboxes get")
	}
}

func TestCanDeployAgentInNamespace_ReturnsErrorOnSARFailure(t *testing.T) {
	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "subjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, assert.AnError
	})

	client := &InternalKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
		},
		sarClientset: clientset,
	}

	_, err := client.CanDeployAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err == nil {
		t.Fatal("expected SAR failure error")
	}
}

func TestCanListAgentsInNamespace_DeniesWithoutSandboxesList(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		return false
	})

	allowed, err := client.CanListAgentsInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatal("expected sandboxes list access to be denied")
	}
}

func TestTokenCanListAgentsInNamespace_UsesSelfSAR(t *testing.T) {
	client := newSelfSARRBACTestTokenClient(t, func(sar *authv1.SelfSubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "list"
	})

	allowed, err := client.CanListAgentsInNamespace(context.Background(), nil, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected token list access to be allowed")
	}
}

func TestTokenCanGetAgentInNamespace_UsesSelfSAR(t *testing.T) {
	client := newSelfSARRBACTestTokenClient(t, func(sar *authv1.SelfSubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			attrs.Verb == "get" &&
			attrs.Name == "sample-agent"
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), nil, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected token get access to be allowed")
	}
}

func TestTokenCanListAgentsInNamespace_ReturnsErrorOnSelfSARFailure(t *testing.T) {
	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "selfsubjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, assert.AnError
	})

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		},
	}

	_, err := client.CanListAgentsInNamespace(context.Background(), nil, "demo-ns")
	if err == nil {
		t.Fatal("expected self-SAR failure error")
	}
}

func TestTokenCanGetAgentInNamespace_ReturnsErrorOnSelfSARFailure(t *testing.T) {
	clientset := fake.NewClientset()
	clientset.PrependReactor("create", "selfsubjectaccessreviews", func(action ktesting.Action) (bool, runtime.Object, error) {
		return true, nil, assert.AnError
	})

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		},
	}

	_, err := client.CanGetAgentInNamespace(context.Background(), nil, "demo-ns", "sample-agent")
	if err == nil {
		t.Fatal("expected self-SAR failure error")
	}
}

func TestTokenCanDeployAgentInNamespace_UsesSelfSAR(t *testing.T) {
	client := newSelfSARRBACTestTokenClient(t, func(sar *authv1.SelfSubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil &&
			attrs.Group == sandboxAPIGroup &&
			attrs.Resource == "sandboxes" &&
			(attrs.Verb == "create" || attrs.Verb == "get")
	})

	allowed, err := client.CanDeployAgentInNamespace(context.Background(), nil, "demo-ns")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected token deploy access to be allowed")
	}
}
