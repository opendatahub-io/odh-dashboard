package repositories

import (
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck *HealthCheckRepository
	User        *UserRepository
	Namespace   *NamespaceRepository
	Tiers       *TiersRepository
	APIKeys     *APIKeysRepository
}

func NewRepositories(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory, config config.EnvConfig) (*Repositories, error) {
	apiKeysRepo, err := NewAPIKeysRepository(logger, config.MaasApiUrl)
	if err != nil {
		return nil, err
	}

	return &Repositories{
		HealthCheck: NewHealthCheckRepository(),
		User:        NewUserRepository(),
		Namespace:   NewNamespaceRepository(),
		Tiers: NewTiersRepository(
			logger,
			k8sFactory,
			config.TiersConfigMapNamespace,
			config.TiersConfigMapName,
			config.GatewayNamespace,
			config.GatewayName),
		APIKeys: apiKeysRepo,
	}, nil
}
