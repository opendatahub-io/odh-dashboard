package api

import (
	"log/slog"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
// This constructor allows creating an App without the full initialization logic
// of NewApp, which is useful for:
//   - Unit testing handlers in isolation
//   - Downstream code that needs to construct custom App instances
//   - Integration tests with mocked dependencies
//
// Parameters:
//   - cfg: The environment configuration (set AuthMethod to config.AuthMethodDisabled
//     when passing a nil k8sFactory for contract tests or mock-only handlers)
//   - logger: The slog logger instance
//   - k8sFactory: The Kubernetes client factory (can be nil when AuthMethodDisabled)
//   - repos: The repositories container (can be nil, will create default if nil)
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sFactory k8s.KubernetesClientFactory,
	repos *repositories.Repositories,
) *App {
	if repos == nil {
		repos = repositories.NewRepositories(&agentsmock.Factory{Client: agentsmock.NewDemoClient()})
	}
	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		repositories:            repos,
	}
}
