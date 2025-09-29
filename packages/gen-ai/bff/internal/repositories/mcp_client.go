package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// MCPClientRepository handles MCP client operations
type MCPClientRepository struct {
	mcpClientFactory mcp.MCPClientFactory
	logger           *slog.Logger
}

// NewMCPClientRepository creates a new MCP client repository
func NewMCPClientRepository(mcpClientFactory mcp.MCPClientFactory, logger *slog.Logger) *MCPClientRepository {
	if logger == nil {
		logger = slog.Default()
	}
	return &MCPClientRepository{
		mcpClientFactory: mcpClientFactory,
		logger:           logger,
	}
}

// MCPServerInfo represents information about an MCP server from ConfigMap
type MCPServerInfo struct {
	Name   string                 `json:"name"`
	Config models.MCPServerConfig `json:"config"`
}

// MCPServersFromConfigResult represents the result of getting servers from ConfigMap with metadata
type MCPServersFromConfigResult struct {
	Servers       []MCPServerInfo `json:"servers"`
	ConfigMapInfo struct {
		Name        string `json:"name"`
		Namespace   string `json:"namespace"`
		LastUpdated string `json:"last_updated"` // ISO 8601 format
	} `json:"config_map_info"`
}

// MCPServerStatus represents the status of an MCP server
type MCPServerStatus struct {
	Name             string                   `json:"name"`
	Config           models.MCPServerConfig   `json:"config"`
	ConnectionStatus *models.ConnectionStatus `json:"connection_status"`
	Tools            []models.Tool            `json:"tools,omitempty"`
}

// GetMCPServersFromConfig retrieves MCP server configurations from ConfigMap
func (r *MCPClientRepository) GetMCPServersFromConfig(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	configMapName string,
) ([]MCPServerInfo, error) {
	configMap, err := k8sClient.GetConfigMap(ctx, identity, namespace, configMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP server ConfigMap: %w", err)
	}

	var servers []MCPServerInfo

	for serverName, configJSON := range configMap.Data {
		var config models.MCPServerConfig
		if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
			r.logger.Error("Failed to parse MCP server configuration JSON",
				"server_name", serverName,
				"error", err)
			continue
		}

		config.Name = serverName

		servers = append(servers, MCPServerInfo{
			Name:   serverName,
			Config: config,
		})
	}

	return servers, nil
}

// GetMCPServersFromConfigWithMetadata retrieves MCP server configurations with ConfigMap metadata
func (r *MCPClientRepository) GetMCPServersFromConfigWithMetadata(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	configMapName string,
) (*MCPServersFromConfigResult, error) {
	configMap, err := k8sClient.GetConfigMap(ctx, identity, namespace, configMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP server ConfigMap: %w", err)
	}

	var servers []MCPServerInfo

	for serverName, configJSON := range configMap.Data {
		var config models.MCPServerConfig
		if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
			r.logger.Error("Failed to parse MCP server configuration JSON",
				"server_name", serverName,
				"error", err)
			continue
		}

		config.Name = serverName

		servers = append(servers, MCPServerInfo{
			Name:   serverName,
			Config: config,
		})
	}

	result := &MCPServersFromConfigResult{
		Servers: servers,
	}

	result.ConfigMapInfo.Name = configMap.Name
	result.ConfigMapInfo.Namespace = configMap.Namespace

	if configMap.CreationTimestamp.IsZero() {
		result.ConfigMapInfo.LastUpdated = "unknown"
	} else {
		result.ConfigMapInfo.LastUpdated = configMap.CreationTimestamp.Format("2006-01-02T15:04:05Z")
	}

	return result, nil
}

// CheckMCPServerStatus checks the connection status of an MCP server
func (r *MCPClientRepository) CheckMCPServerStatus(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	serverConfig models.MCPServerConfig,
) (*models.ConnectionStatus, error) {
	mcpClient, err := r.mcpClientFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP client: %w", err)
	}

	return mcpClient.CheckConnectionStatus(ctx, identity, serverConfig)
}

// ListMCPServerToolsWithStatus retrieves comprehensive tools information with server metadata
func (r *MCPClientRepository) ListMCPServerToolsWithStatus(
	ctx context.Context,
	identity *integrations.RequestIdentity,
	serverConfig models.MCPServerConfig,
) (*models.ToolsStatus, error) {
	mcpClient, err := r.mcpClientFactory.GetClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get MCP client: %w", err)
	}

	return mcpClient.ListToolsWithStatus(ctx, identity, serverConfig)
}
