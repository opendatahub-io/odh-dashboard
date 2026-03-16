package k8mocks

import (
	"log/slog"

	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
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
