package repositories

import (
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/interfaces"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck *HealthCheckRepository
	LlamaStack  *LlamaStackRepository
}

// NewRepositories creates repositories with the specified client interface.
func NewRepositories(client interfaces.LlamaStackClientInterface) *Repositories {
	return &Repositories{
		HealthCheck: NewHealthCheckRepository(),
		LlamaStack:  NewLlamaStackRepository(client),
	}
}
