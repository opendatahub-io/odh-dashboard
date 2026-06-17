package repositories

import (
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	AgentRuntimes *AgentRuntimesRepository
}

func NewRepositories(agentSourceFactory agents.ClientFactory) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		AgentRuntimes: NewAgentRuntimesRepository(agentSourceFactory),
	}
}
