package openshell

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
)

type gatewayContextKey struct{}

const DefaultGatewayName = "default"

func ContextWithGateway(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, gatewayContextKey{}, name)
}

func GatewayFromContext(ctx context.Context) string {
	if name, ok := ctx.Value(gatewayContextKey{}).(string); ok && name != "" {
		return name
	}
	return DefaultGatewayName
}

type MultiGatewayFactory struct {
	registry   *GatewayRegistry
	k8sFactory k8s.KubernetesClientFactory
	logger     *slog.Logger
}

var _ agents.ClientFactory = (*MultiGatewayFactory)(nil)

func NewMultiGatewayFactory(registry *GatewayRegistry, k8sFactory k8s.KubernetesClientFactory, logger *slog.Logger) *MultiGatewayFactory {
	return &MultiGatewayFactory{
		registry:   registry,
		k8sFactory: k8sFactory,
		logger:     logger,
	}
}

func (f *MultiGatewayFactory) GetClient(ctx context.Context) (agents.Client, error) {
	gwName := GatewayFromContext(ctx)
	return f.GetClientForGateway(ctx, gwName)
}

func (f *MultiGatewayFactory) GetClientForGateway(ctx context.Context, gwName string) (agents.Client, error) {
	osClient, err := f.registry.GetClient(ctx, gwName)
	if err != nil {
		return nil, err
	}

	entry, ok := f.registry.Get(gwName)
	if !ok {
		return nil, agents.ErrNotFound
	}

	var k8sClient k8s.KubernetesClientInterface
	if f.k8sFactory != nil {
		k8sClient, err = f.k8sFactory.GetClient(ctx)
		if err != nil {
			f.logger.Warn("K8s client unavailable for gateway — stop/start/restart will fail",
				slog.String("gateway", gwName), slog.Any("error", err))
		}
	}

	return &Client{
		osClient:  osClient,
		k8sClient: k8sClient,
		namespace: entry.Namespace,
		logger:    f.logger,
	}, nil
}
