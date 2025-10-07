package repositories

import (
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck            *HealthCheckRepository
	Models                 *ModelsRepository
	MaaSModels             *MaaSModelsRepository
	AAModels               *AAModelsRepository
	VectorStores           *VectorStoresRepository
	Files                  *FilesRepository
	Responses              *ResponsesRepository
	Template               *TemplateRepository
	Namespace              *NamespaceRepository
	LlamaStackDistribution *LlamaStackDistributionRepository
	MCPClient              *MCPClientRepository
}

// NewRepositories creates domain-specific repositories.
func NewRepositories() *Repositories {
	return &Repositories{
		HealthCheck:            NewHealthCheckRepository(),
		Models:                 NewModelsRepository(),
		MaaSModels:             NewMaaSModelsRepository(),
		AAModels:               NewAAModelsRepository(),
		VectorStores:           NewVectorStoresRepository(),
		Files:                  NewFilesRepository(),
		Responses:              NewResponsesRepository(),
		Template:               NewTemplateRepository(),
		Namespace:              NewNamespaceRepository(),
		LlamaStackDistribution: NewLlamaStackDistributionRepository(),
		MCPClient:              nil, // Will be initialized separately with MCP client factory
	}
}

// NewRepositoriesWithMCP creates repositories with MCP client factory
func NewRepositoriesWithMCP(mcpClientFactory mcp.MCPClientFactory, logger *slog.Logger) *Repositories {
	repos := NewRepositories()
	repos.MCPClient = NewMCPClientRepository(mcpClientFactory, logger)
	return repos
}
