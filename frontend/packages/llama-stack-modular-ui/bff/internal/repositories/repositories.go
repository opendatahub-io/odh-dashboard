package repositories

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/llamastack"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck  *HealthCheckRepository
	Models       *ModelsRepository
	VectorStores *VectorStoresRepository
	Files        *FilesRepository
	Responses    *ResponsesRepository
	Template     *TemplateRepository
}

// NewRepositories creates domain-specific repositories with the specified client interface.
func NewRepositories(client llamastack.LlamaStackClientInterface) *Repositories {
	return &Repositories{
		HealthCheck:  NewHealthCheckRepository(),
		Models:       NewModelsRepository(client),
		VectorStores: NewVectorStoresRepository(client),
		Files:        NewFilesRepository(client),
		Responses:    NewResponsesRepository(client),
		Template:     NewTemplateRepository(),
	}
}
