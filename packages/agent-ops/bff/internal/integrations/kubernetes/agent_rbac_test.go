package kubernetes

import (
	"context"
	"testing"

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

func TestCanGetAgentInNamespace_AllowsJobWithoutServiceAccess(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		return attrs != nil && attrs.Resource == "jobs" && attrs.Verb == "get"
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "batch-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected job access to be allowed without service SAR")
	}
}

func TestCanGetAgentInNamespace_RequiresServiceForDeployments(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		if attrs == nil {
			return false
		}
		switch attrs.Resource {
		case "jobs":
			return false
		case "deployments":
			return attrs.Verb == "get"
		case "services":
			return attrs.Verb == "get"
		default:
			return false
		}
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !allowed {
		t.Fatal("expected deployment access with service SAR to be allowed")
	}
}

func TestCanGetAgentInNamespace_DeniesDeploymentWithoutServiceAccess(t *testing.T) {
	client := newRBACTestInternalClient(t, func(sar *authv1.SubjectAccessReview) bool {
		attrs := sar.Spec.ResourceAttributes
		if attrs == nil {
			return false
		}
		return attrs.Resource == "deployments" && attrs.Verb == "get"
	})

	allowed, err := client.CanGetAgentInNamespace(context.Background(), &RequestIdentity{UserID: "user@example.com"}, "demo-ns", "sample-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if allowed {
		t.Fatal("expected deployment access without service SAR to be denied")
	}
}
