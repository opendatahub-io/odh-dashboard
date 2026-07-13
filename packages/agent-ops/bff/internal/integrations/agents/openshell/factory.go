package openshell

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	v1 "github.com/rhuss/openshell-sdk-go/openshell/v1"
)

// Factory creates OpenShell-backed agents.Client instances.
// The OpenShell SDK client is shared (one gRPC connection). The k8s client
// is only used for stop/start (SDK has no methods for operatingMode).
type Factory struct {
	osClient   v1.ClientInterface
	k8sFactory k8s.KubernetesClientFactory
	namespace  string
	logger     *slog.Logger
}

func NewFactory(osClient v1.ClientInterface, k8sFactory k8s.KubernetesClientFactory, namespace string, logger *slog.Logger) *Factory {
	return &Factory{
		osClient:   osClient,
		k8sFactory: k8sFactory,
		namespace:  namespace,
		logger:     logger,
	}
}

func (f *Factory) GetClient(ctx context.Context) (agents.Client, error) {
	var k8sClient k8s.KubernetesClientInterface
	if f.k8sFactory != nil {
		var err error
		k8sClient, err = f.k8sFactory.GetClient(ctx)
		if err != nil {
			f.logger.Warn("K8s client unavailable — stop/start will fail", slog.Any("error", err))
		}
	}

	return &Client{
		osClient:  f.osClient,
		k8sClient: k8sClient,
		namespace: f.namespace,
		logger:    f.logger,
	}, nil
}
