package mcp

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

// MCPClientInterface defines the contract for MCP client operations
type MCPClientInterface interface {
	CheckConnectionStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig genaiassets.MCPServerConfig) (*genaiassets.ConnectionStatus, error)
	ListToolsWithStatus(ctx context.Context, identity *integrations.RequestIdentity, serverConfig genaiassets.MCPServerConfig) (*genaiassets.ToolsStatus, error)
}
