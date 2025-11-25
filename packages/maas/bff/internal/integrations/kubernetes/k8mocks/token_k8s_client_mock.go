package k8mocks

import (
	"log/slog"

	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"k8s.io/client-go/kubernetes"
)

// ⚠️ WHY THIS FILE EXISTS:
// envtest does NOT support real authentication or token evaluation.
// It allows you to simulate Kubernetes behavior, but all requests use the test client's identity (usually cluster-admin).
// So, we simulate token-based behavior by mapping FAKE tokens to preconfigured test users.

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(clientset kubernetes.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client: clientset,
				Logger: logger,
				Token:  k8s.NewBearerToken(""), // Unused because impersonation is already handled in the client config
			},
		},
	}
}

// GetServiceDetails overrides to simulate ClusterIP for localhost access
// Client service discovery removed in minimal starter.

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// GetGroups removed in minimal starter.
