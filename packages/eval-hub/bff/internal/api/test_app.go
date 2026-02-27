package api

import (
	"log/slog"

	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	k8s "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/repositories"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sFactory k8s.KubernetesClientFactory,
	ehFactory evalhub.EvalHubClientFactory,
	repos *repositories.Repositories,
) *App {
	if repos == nil {
		repos = repositories.NewRepositories()
	}
	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		evalHubClientFactory:    ehFactory,
		repositories:            repos,
	}
}
