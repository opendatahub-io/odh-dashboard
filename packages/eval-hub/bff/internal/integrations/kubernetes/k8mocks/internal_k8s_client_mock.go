package k8mocks

import (
	"context"
	"log/slog"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
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

// GetServiceDetails overrides to simulate ClusterIP for localhost access
// Client service discovery removed in minimal starter.

// BearerToken always returns a fake token for tests
func (m *InternalKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// CanListEvalHubInstances always returns true in tests — envtest SAR responses are unreliable.
func (m *InternalKubernetesClientMock) CanListEvalHubInstances(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

// GetEvalHubServiceURL returns a deterministic fake URL for test environments.
// The real implementation calls helper.GetKubeconfig() which is unavailable in unit-test contexts.
func (m *InternalKubernetesClientMock) GetEvalHubServiceURL(_ context.Context, _ *k8s.RequestIdentity, _ string) (string, error) {
	return "http://mock-evalhub.test.svc.cluster.local", nil
}

// GetGroups removed in minimal starter.
