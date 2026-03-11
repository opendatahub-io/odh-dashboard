package k8mocks

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// envtest does NOT support real authentication or token evaluation.
// We simulate token-based behavior by mapping FAKE tokens to preconfigured test users.

type TokenKubernetesClientMock struct {
	*k8s.TokenKubernetesClient
}

func newMockedTokenKubernetesClientFromClientset(clientset kubernetes.Interface, logger *slog.Logger) k8s.KubernetesClientInterface {
	return &TokenKubernetesClientMock{
		TokenKubernetesClient: &k8s.TokenKubernetesClient{
			SharedClientLogic: k8s.SharedClientLogic{
				Client: clientset,
				Logger: logger,
				Token:  k8s.NewBearerToken(""),
			},
		},
	}
}

// GetNamespaces returns all namespaces from envtest directly (no OpenShift Projects API fallback).
func (m *TokenKubernetesClientMock) GetNamespaces(ctx context.Context, _ *k8s.RequestIdentity) ([]corev1.Namespace, error) {
	nsList, err := m.SharedClientLogic.Client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}
	return nsList.Items, nil
}

func (m *TokenKubernetesClientMock) BearerToken() (string, error) {
	return "FAKE-BEARER-TOKEN", nil
}

func (m *TokenKubernetesClientMock) CanListEvalHubInstances(_ context.Context, _ *k8s.RequestIdentity, _ string) (bool, error) {
	return true, nil
}

func (m *TokenKubernetesClientMock) GetEvalHubServiceURL(_ context.Context, _ *k8s.RequestIdentity, _ string) (string, error) {
	return "http://mock-evalhub.test.svc.cluster.local", nil
}

// GetEvalHubCRStatus returns a deterministic mock CR status for test environments.
func (m *TokenKubernetesClientMock) GetEvalHubCRStatus(_ context.Context, _ *k8s.RequestIdentity, namespace string) (*models.EvalHubCRStatus, error) {
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
