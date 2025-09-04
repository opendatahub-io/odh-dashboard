package repositories

import (
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/mcp"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck            *HealthCheckRepository
	Models                 *ModelsRepository
	AAModels               *AAModelsRepository
	VectorStores           *VectorStoresRepository
	Files                  *FilesRepository
	Responses              *ResponsesRepository
	Template               *TemplateRepository
	Namespace              *NamespaceRepository
	LlamaStackDistribution *LlamaStackDistributionRepository
	MCPServer              *MCPServerRepository
	MCPClient              *MCPClientRepository
}

// NewRepositories creates domain-specific repositories with the specified client interface.
func NewRepositories(client llamastack.LlamaStackClientInterface) *Repositories {
	return &Repositories{
		HealthCheck:            NewHealthCheckRepository(),
		Models:                 NewModelsRepository(client),
		AAModels:               NewAAModelsRepository(),
		VectorStores:           NewVectorStoresRepository(client),
		Files:                  NewFilesRepository(client),
		Responses:              NewResponsesRepository(client),
		Template:               NewTemplateRepository(),
		Namespace:              NewNamespaceRepository(),
		LlamaStackDistribution: NewLlamaStackDistributionRepository(),
		MCPServer:              NewMCPServerRepository(),
		MCPClient:              nil, // Will be initialized separately with MCP client factory
	}
}

// NewRepositoriesWithMCP creates repositories with both LlamaStack and MCP clients
func NewRepositoriesWithMCP(client llamastack.LlamaStackClientInterface, mcpClientFactory mcp.MCPClientFactory) *Repositories {
	repos := NewRepositories(client)
	repos.MCPClient = NewMCPClientRepository(mcpClientFactory)
	return repos
}
