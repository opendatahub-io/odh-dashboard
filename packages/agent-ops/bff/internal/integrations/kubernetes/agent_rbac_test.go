package kubernetes

import (
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
