package repositories

import (
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	agentsopenshell "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/openshell"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	AgentRuntimes *AgentRuntimesRepository
	Gateway       *GatewayRepository
	Provider      *ProviderRepository
}

func NewRepositories(agentSourceFactory agents.ClientFactory) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		AgentRuntimes: NewAgentRuntimesRepository(agentSourceFactory),
	}
}

func NewRepositoriesWithGateway(agentSourceFactory agents.ClientFactory, discovery *agentsopenshell.GatewayDiscovery, registry *agentsopenshell.GatewayRegistry, k8sFactory k8s.KubernetesClientFactory, logger *slog.Logger) *Repositories {
	repos := NewRepositories(agentSourceFactory)
	repos.Gateway = NewGatewayRepository(discovery, registry, k8sFactory, logger)
	repos.Provider = NewProviderRepository(registry)
	return repos
}
