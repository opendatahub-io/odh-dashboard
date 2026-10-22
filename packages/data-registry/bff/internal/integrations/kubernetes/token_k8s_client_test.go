package kubernetes

import (
	"io"
	"log/slog"
	"testing"

	authnv1 "k8s.io/api/authentication/v1"
	"k8s.io/apimachinery/pkg/runtime"
	kubernetesfake "k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

func TestTokenKubernetesClientGetUserPreservesNamespaceQualifiedServiceAccount(t *testing.T) {
	const username = "system:serviceaccount:team-a:worker"
	clientset := kubernetesfake.NewSimpleClientset()
	clientset.PrependReactor("create", "selfsubjectreviews", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, &authnv1.SelfSubjectReview{
			Status: authnv1.SelfSubjectReviewStatus{
				UserInfo: authnv1.UserInfo{Username: username},
			},
		}, nil
	})

	client := &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: clientset,
			Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
		},
	}

	got, err := client.GetUser(nil)
	if err != nil {
		t.Fatalf("GetUser() error = %v", err)
	}
	if got != username {
		t.Fatalf("GetUser() = %q, want namespace-qualified identity %q", got, username)
	}
}
