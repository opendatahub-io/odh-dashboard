package k8mocks

import (
	"context"
	"log/slog"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	"k8s.io/client-go/kubernetes"
)

type InternalKubernetesClientMock struct {
	*k8s.InternalKubernetesClient
}

// newMockedInternalKubernetesClientFromClientset creates a mock from existing envtest clientset
func newMockedInternalKubernetesClientFromClientset(clientset kubernetes.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &InternalKubernetesClientMock{
		InternalKubernetesClient: &k8s.InternalKubernetesClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client: clientset,
				Logger: logger,
			},
		},
	}
}

// BearerToken always returns a fake token for tests
func (m *InternalKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// CanListEvalHubInstances always returns true in tests — envtest SAR responses are unreliable.
func (m *InternalKubernetesClientMock) CanListEvalHubInstances(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

// GetEvalHubServiceURL returns a deterministic fake URL for test environments.
func (m *InternalKubernetesClientMock) GetEvalHubServiceURL(_ context.Context, _ *k8s.RequestIdentity, _ string) (string, error) {
	return "http://mock-evalhub.test.svc.cluster.local", nil
}

// GetEvalHubCRStatus returns a deterministic mock CR status for test environments.
func (m *InternalKubernetesClientMock) GetEvalHubCRStatus(_ context.Context, _ *k8s.RequestIdentity, namespace string) (*models.EvalHubCRStatus, error) {
	return &models.EvalHubCRStatus{
		Name:            "evalhub",
		Namespace:       namespace,
		Phase:           "Ready",
		Ready:           "True",
		URL:             "http://mock-evalhub.test.svc.cluster.local",
		ActiveProviders: []string{"lm-evaluation-harness", "garak"},
		ReadyReplicas:   1,
		Replicas:        1,
	}, nil
}
