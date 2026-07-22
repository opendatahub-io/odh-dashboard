package openshell

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	gatewayLabelSelector = "app.kubernetes.io/name=openshell"
	gatewayStatusHealthy   = "healthy"
	gatewayStatusUnhealthy = "unhealthy"
	gatewayStatusUnknown   = "unknown"
)

type GatewayDiscovery struct {
	k8sFactory k8s.KubernetesClientFactory
	registry   *GatewayRegistry
	logger     *slog.Logger
}

func NewGatewayDiscovery(k8sFactory k8s.KubernetesClientFactory, registry *GatewayRegistry, logger *slog.Logger) *GatewayDiscovery {
	return &GatewayDiscovery{
		k8sFactory: k8sFactory,
		registry:   registry,
		logger:     logger,
	}
}

func (d *GatewayDiscovery) DiscoverGateways(ctx context.Context, namespace string) ([]models.Gateway, error) {
	if d.k8sFactory != nil && namespace != "" {
		if err := d.discoverFromK8s(ctx, namespace); err != nil {
			d.logger.Warn("K8s gateway discovery failed, using registered gateways only", slog.Any("error", err))
		}
	}

	entries := d.registry.List()
	gateways := make([]models.Gateway, 0, len(entries))

	for _, entry := range entries {
		gw := models.Gateway{
			Name:      entry.Name,
			Namespace: entry.Namespace,
			Endpoint:  entry.Endpoint,
			Status:    gatewayStatusUnknown,
			IsGlobal:  entry.IsGlobal,
		}

		client, err := d.registry.GetClient(ctx, entry.Name)
		if err != nil {
			d.logger.Warn("Failed to get client for gateway", slog.String("name", entry.Name), slog.Any("error", err))
			gw.Status = gatewayStatusUnhealthy
			gateways = append(gateways, gw)
			continue
		}

		health := client.Health()
		if health != nil {
			if _, err := health.Check(ctx); err == nil {
				gw.Status = gatewayStatusHealthy
			} else {
				gw.Status = gatewayStatusUnhealthy
				d.logger.Debug("Gateway health check failed", slog.String("name", entry.Name), slog.Any("error", err))
			}
		}

		sandboxes, err := client.Sandboxes().List(ctx)
		if err == nil {
			gw.SandboxCount = len(sandboxes)
		}

		providers, err := client.Providers().List(ctx)
		if err == nil {
			gw.ProviderCount = len(providers)
		}

		gateways = append(gateways, gw)
	}

	return gateways, nil
}

func (d *GatewayDiscovery) discoverFromK8s(ctx context.Context, namespace string) error {
	k8sClient, err := d.k8sFactory.GetClient(ctx)
	if err != nil {
		return fmt.Errorf("failed to get k8s client: %w", err)
	}

	clientset := k8sClient.KubernetesClientset()
	services, err := clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: gatewayLabelSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to list gateway services: %w", err)
	}

	for _, svc := range services.Items {
		port := int32(8080)
		if len(svc.Spec.Ports) > 0 {
			port = svc.Spec.Ports[0].Port
		}

		endpoint := fmt.Sprintf("%s.%s.svc.cluster.local:%d", svc.Name, svc.Namespace, port)
		isGlobal := svc.Labels["openshell.io/global"] == "true"

		d.registry.Register(svc.Name, svc.Namespace, endpoint, isGlobal)
	}

	return nil
}
