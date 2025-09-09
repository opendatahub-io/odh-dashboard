package repositories

import (
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
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
	}
}
