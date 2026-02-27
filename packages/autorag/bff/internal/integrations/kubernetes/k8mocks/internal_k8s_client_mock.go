package k8mocks

import (
	"log/slog"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type InternalKubernetesClientMock struct {
	*k8s.InternalKubernetesClient
}

// newMockedInternalKubernetesClientFromClientset creates a mock from existing envtest clientset
func newMockedInternalKubernetesClientFromClientset(clientset kubernetes.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return newMockedInternalKubernetesClientFromClientsetAndConfig(clientset, nil, logger)
}

// newMockedInternalKubernetesClientFromClientsetAndConfig creates a mock from existing envtest clientset and config
func newMockedInternalKubernetesClientFromClientsetAndConfig(clientset kubernetes.Interface, config *rest.Config, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &InternalKubernetesClientMock{
		InternalKubernetesClient: &k8s.InternalKubernetesClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client:     clientset,
				Logger:     logger,
				RestConfig: config,
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

// GetGroups removed in minimal starter.
