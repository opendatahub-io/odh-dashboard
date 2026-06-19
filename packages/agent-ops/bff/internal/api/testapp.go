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
// When repos is nil, repositories are created without an agent data source.
// Pass an explicit repositories instance (for example from test helpers) to
// exercise agent handlers.
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sFactory k8s.KubernetesClientFactory,
	repos *repositories.Repositories,
) *App {
	if repos == nil {
		repos = repositories.NewRepositories(&agentsmock.Factory{Client: agentsmock.NewDemoClient()})
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		repositories:            repos,
	}
}
