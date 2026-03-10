package k8mocks

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

// GetNamespaces overrides the real implementation because envtest does not
// support the OpenShift Projects API fallback used for non-admin users.
// Returns all namespaces from envtest directly.
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, _ *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	nsList, err := m.SharedClientLogic.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}
	return nsList.Items, nil
}

// BearerToken always returns a fake token for tests
func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

// CanListEvalHubInstances always returns true in tests — envtest SAR responses are unreliable.
func (m *TokenKubernetesClientMock) CanListEvalHubInstances(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

// GetEvalHubServiceURL returns a deterministic fake URL for test environments.
// The real implementation uses a dynamic client that requires a live rest.Config,
// which is not available in envtest / unit-test contexts.
func (m *TokenKubernetesClientMock) GetEvalHubServiceURL(_ context.Context, _ *k8s.RequestIdentity, _ string) (string, error) {
	return "http://mock-evalhub.test.svc.cluster.local", nil
}

// GetGroups removed in minimal starter.
