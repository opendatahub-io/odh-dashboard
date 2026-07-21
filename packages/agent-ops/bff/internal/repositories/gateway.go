package repositories

import (
	"context"
	"fmt"

	agentsopenshell "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/openshell"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type GatewayRepository struct {
	discovery *agentsopenshell.GatewayDiscovery
	registry  *agentsopenshell.GatewayRegistry
}

func NewGatewayRepository(discovery *agentsopenshell.GatewayDiscovery, registry *agentsopenshell.GatewayRegistry) *GatewayRepository {
	return &GatewayRepository{
		discovery: discovery,
		registry:  registry,
	}
}

func (r *GatewayRepository) ListGateways(ctx context.Context, namespace string) (*models.GatewayListResponse, error) {
	gateways, err := r.discovery.DiscoverGateways(ctx, namespace)
	if err != nil {
		return nil, err
	}
	return &models.GatewayListResponse{Gateways: gateways}, nil
}

func (r *GatewayRepository) GetGateway(ctx context.Context, name string) (*models.Gateway, error) {
	entry, ok := r.registry.Get(name)
	if !ok {
		return nil, fmt.Errorf("gateway %q not found", name)
	}

	gw := &models.Gateway{
		Name:      entry.Name,
		Namespace: entry.Namespace,
		Endpoint:  entry.Endpoint,
		Status:    "unknown",
		IsGlobal:  entry.IsGlobal,
	}

	client, err := r.registry.GetClient(ctx, name)
	if err != nil {
		gw.Status = "unhealthy"
		return gw, nil
	}

	if health := client.Health(); health != nil {
		if _, err := health.Check(ctx); err == nil {
			gw.Status = "healthy"
		} else {
			gw.Status = "unhealthy"
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

	return gw, nil
}

func (r *GatewayRepository) CreateGateway(_ context.Context, req *models.CreateGatewayRequest) (*models.Gateway, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("gateway name is required")
	}
	if req.Endpoint == "" {
		return nil, fmt.Errorf("gateway endpoint is required")
	}

	r.registry.Register(req.Name, req.Namespace, req.Endpoint, req.IsGlobal)

	return &models.Gateway{
		Name:      req.Name,
		Namespace: req.Namespace,
		Endpoint:  req.Endpoint,
		Status:    "unknown",
		IsGlobal:  req.IsGlobal,
	}, nil
}

func (r *GatewayRepository) DeleteGateway(_ context.Context, name string) error {
	if _, ok := r.registry.Get(name); !ok {
		return fmt.Errorf("gateway %q not found", name)
	}
	r.registry.Unregister(name)
	return nil
}
