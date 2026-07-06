package mcp

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MCPClientInterface defines the contract for MCP client operations
type MCPClientInterface interface {
	CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ConnectionStatus, error)
	ListToolsWithStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig models.MCPServerConfig) (*models.ToolsStatus, error)
}
