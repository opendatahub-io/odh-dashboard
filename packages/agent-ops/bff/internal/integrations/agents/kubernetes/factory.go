package kubernetes

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
)

// Factory creates Kubernetes-backed agents.Client instances per request.
type Factory struct {
	k8sFactory k8s.KubernetesClientFactory
	logger     *slog.Logger
}

// NewFactory returns a ClientFactory that reads kagenti workloads from Kubernetes.
func NewFactory(k8sFactory k8s.KubernetesClientFactory, logger *slog.Logger) *Factory {
	return &Factory{
		k8sFactory: k8sFactory,
		logger:     logger,
	}
}

// GetClient implements agents.ClientFactory.
func (f *Factory) GetClient(ctx context.Context) (agents.Client, error) {
	if f.k8sFactory == nil {
		return nil, fmt.Errorf("kubernetes client factory is not configured")
	}

	identity, err := requestIdentityFromContext(ctx)
	if err != nil {
		return nil, err
	}

	if err := f.k8sFactory.ValidateRequestIdentity(identity); err != nil {
		return nil, err
	}

	k8sClient, err := f.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	return &Client{
		k8sClient: k8sClient,
		identity:  identity,
		logger:    f.logger,
	}, nil
}
