package repositories

import (
	"context"
	"fmt"
	"log/slog"

	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
	"k8s.io/client-go/discovery"
)

const (
	mcpServerGroup    = "mcp.x-k8s.io"
	mcpServerVersion  = "v1alpha1"
	mcpServerResource = "mcpservers"
)

type McpServerAvailabilityRepository struct {
	logger *slog.Logger
}

func NewMcpServerAvailabilityRepository(logger *slog.Logger) *McpServerAvailabilityRepository {
	return &McpServerAvailabilityRepository{logger: logger}
}

// IsMcpServerCRDAvailable checks whether the MCPServer CRD (mcp.x-k8s.io/v1alpha1/mcpservers) is installed on the cluster.
func (r *McpServerAvailabilityRepository) IsMcpServerCRDAvailable(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error) {
	cfg, err := restConfigForClient(client)
	if err != nil {
		return false, fmt.Errorf("failed to get REST config: %w", err)
	}

	disco, err := discovery.NewDiscoveryClientForConfig(cfg)
	if err != nil {
		return false, fmt.Errorf("failed to create discovery client: %w", err)
	}

	resourceList, err := disco.ServerResourcesForGroupVersion(fmt.Sprintf("%s/%s", mcpServerGroup, mcpServerVersion))
	if err != nil {
		if r.logger != nil {
			r.logger.DebugContext(ctx, "MCPServer CRD not found on cluster", "group", mcpServerGroup, "version", mcpServerVersion, "error", err)
		}
		return false, nil
	}

	for _, resource := range resourceList.APIResources {
		if resource.Name == mcpServerResource {
			return true, nil
		}
	}

	return false, nil
}
