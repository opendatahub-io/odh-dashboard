package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	corev1 "k8s.io/api/core/v1"
)

type MCPServerRepository struct{}

func NewMCPServerRepository() *MCPServerRepository {
	return &MCPServerRepository{}
}

// GetMCPServerConfig retrieves the MCP server configuration from the cluster
func (r *MCPServerRepository) GetMCPServerConfig(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	name string,
) (*corev1.ConfigMap, error) {
	return client.GetMCPServerConfig(ctx, identity, namespace, name)
}
