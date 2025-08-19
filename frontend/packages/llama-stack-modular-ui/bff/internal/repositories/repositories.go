package repositories

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck            *HealthCheckRepository
	LlamaStackModels       *LlamaStackModels
	LlamaStackVectorStores *LlamaStackVectorStores
	LlamaStackResponses    *LlamaStackResponses
	LlamaStackFiles        *LlamaStackFiles
}

// NewRepositories creates repositories with OpenAI SDK support
func NewRepositories(client interfaces.LlamaStackClientInterface) *Repositories {
	return &Repositories{
		HealthCheck:            NewHealthCheckRepository(),
		LlamaStackModels:       NewLlamaStackModels(client),
		LlamaStackVectorStores: NewLlamaStackVectorStores(client),
		LlamaStackResponses:    NewLlamaStackResponses(client),
		LlamaStackFiles:        NewLlamaStackFiles(client),
	}
}
