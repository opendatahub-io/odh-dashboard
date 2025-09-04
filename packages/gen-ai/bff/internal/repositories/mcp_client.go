package repositories

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	kubernetes "github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
)

// MCPClientRepository handles MCP client operations
type MCPClientRepository struct {
	mcpClientFactory mcp.MCPClientFactory
}

// NewMCPClientRepository creates a new MCP client repository
func NewMCPClientRepository(mcpClientFactory mcp.MCPClientFactory) *MCPClientRepository {
	return &MCPClientRepository{
		mcpClientFactory: mcpClientFactory,
	}
}

// MCPServerInfo represents information about an MCP server from ConfigMap
type MCPServerInfo struct {
	Name   string              `json:"name"`
	Config mcp.MCPServerConfig `json:"config"`
}

// MCPServerStatus represents the status of an MCP server
type MCPServerStatus struct {
	Name             string                `json:"name"`
	Config           mcp.MCPServerConfig   `json:"config"`
	ConnectionStatus *mcp.ConnectionStatus `json:"connection_status"`
	Tools            []mcp.Tool            `json:"tools,omitempty"`
}

// GetMCPServersFromConfig retrieves MCP server configurations from ConfigMap
func (r *MCPClientRepository) GetMCPServersFromConfig(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	configMapName string,
) ([]MCPServerInfo, error) {
	// Get the ConfigMap containing MCP server configurations
	configMap, err := k8sClient.GetMCPServerConfig(ctx, identity, namespace, configMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP server ConfigMap: %w", err)
	}

	var servers []MCPServerInfo

	// Parse each entry in the ConfigMap data
	for serverName, configJSON := range configMap.Data {
		var config mcp.MCPServerConfig
		if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
			// Log the error but continue with other servers
			continue
		}

		servers = append(servers, MCPServerInfo{
			Name:   serverName,
			Config: config,
		})
	}

	return servers, nil
}

// CheckMCPServerStatus checks the connection status of an MCP server
func (r *MCPClientRepository) CheckMCPServerStatus(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	serverURL string,
) (*mcp.ConnectionStatus, error) {
	mcpClient, err := r.mcpClientFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP client: %w", err)
	}

	return mcpClient.CheckConnectionStatus(ctx, identity, serverURL)
}

// ListMCPServerTools retrieves the list of tools from an MCP server
func (r *MCPClientRepository) ListMCPServerTools(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	serverURL string,
) (*mcp.ToolList, error) {
	mcpClient, err := r.mcpClientFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP client: %w", err)
	}

	return mcpClient.ListTools(ctx, identity, serverURL)
}

// GetMCPServersStatus retrieves status information for all MCP servers
func (r *MCPClientRepository) GetMCPServersStatus(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	configMapName string,
	includeTools bool,
) ([]MCPServerStatus, error) {
	// First, get all MCP server configurations
	servers, err := r.GetMCPServersFromConfig(k8sClient, ctx, identity, namespace, configMapName)
	if err != nil {
		return nil, err
	}

	var statuses []MCPServerStatus

	// Check status for each server
	for _, server := range servers {
		status := MCPServerStatus{
			Name:   server.Name,
			Config: server.Config,
		}

		// Check connection status
		connectionStatus, err := r.CheckMCPServerStatus(ctx, identity, server.Config.URL)
		if err != nil {
			// If we can't check status, create a disconnected status
			status.ConnectionStatus = &mcp.ConnectionStatus{
				ServerURL: server.Config.URL,
				Status:    "error",
				Message:   fmt.Sprintf("Failed to check status: %v", err),
			}
		} else {
			status.ConnectionStatus = connectionStatus
		}

		// If requested and server is connected, get tools
		if includeTools && status.ConnectionStatus.Status == "connected" {
			toolList, err := r.ListMCPServerTools(ctx, identity, server.Config.URL)
			if err == nil {
				status.Tools = toolList.Tools
			}
			// If we can't get tools, we don't fail the whole operation
		}

		statuses = append(statuses, status)
	}

	return statuses, nil
}
