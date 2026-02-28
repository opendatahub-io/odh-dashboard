package api

import (
	"log/slog"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	ps "github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
// This constructor allows creating an App without the full initialization logic
// of NewApp, which is useful for:
//   - Unit testing handlers in isolation
//   - Downstream code that needs to construct custom App instances
//   - Integration tests with mocked dependencies
//
// Parameters:
//   - cfg: The environment configuration
//   - logger: The slog logger instance
//   - k8sFactory: The Kubernetes client factory (can be a mock)
//   - psFactory: The Pipeline Server client factory (can be a mock)
//   - repos: The repositories container (can be nil, will create default if nil)
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sFactory k8s.KubernetesClientFactory,
	psFactory ps.PipelineServerClientFactory,
	repos *repositories.Repositories,
) *App {
	if repos == nil {
		repos = repositories.NewRepositories(logger)
	}
	return &App{
		config:                      cfg,
		logger:                      logger,
		kubernetesClientFactory:     k8sFactory,
		pipelineServerClientFactory: psFactory,
		repositories:                repos,
	}
}
