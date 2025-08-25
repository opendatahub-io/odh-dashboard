package k8smocks

import (
	"context"
	"log/slog"

	k8s "github.com/opendatahub-io/llama-stack-modular-ui/internal/api/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(clientset kubernetes.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			Client: clientset,
			Logger: logger,
			Token:  k8s.NewBearerToken(""), // Unused because impersonation is already handled in the client config
		},
	}
}

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// GetNamespaces returns mock namespace data for testing
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	// Return mock test namespaces instead of real cluster data
	return []corev1.Namespace{
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-1",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-2",
			},
		},
		{
			ObjectMeta: metav1.ObjectMeta{
				Name: "mock-test-namespace-3",
			},
		},
	}, nil
}
