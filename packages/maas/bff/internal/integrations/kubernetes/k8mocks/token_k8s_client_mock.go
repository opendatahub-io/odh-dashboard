package k8mocks

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// ⚠️ WHY THIS FILE EXISTS:
// envtest does NOT support real authentication or token evaluation.
// It allows you to simulate Kubernetes behavior, but all requests use the test client's identity (usually cluster-admin).
// So, we simulate token-based behavior by mapping FAKE tokens to preconfigured test users.

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(clientset kubernetes.Interface, dynamicClient dynamic.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client:        clientset,
				DynamicClient: dynamicClient,
				Logger:        logger,
				Token:         k8s.NewBearerToken(""), // Unused because impersonation is already handled in the client config
			},
		},
	}
}

// GetServiceDetails overrides to simulate ClusterIP for localhost access
// Client service discovery removed in minimal starter.

// GetNamespaces lists namespaces from the envtest cluster.
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, identity *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	nsList, err := m.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}
	return nsList.Items, nil
}

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// GetGroups removed in minimal starter.
