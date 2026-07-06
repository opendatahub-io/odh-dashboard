package api

import (
	"log/slog"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sFactory k8s.KubernetesClientFactory,
	psFactory ps.PipelineServerClientFactory,
	s3Factory s3int.S3ClientFactory,
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
		s3ClientFactory:             s3Factory,
		repositories:                repos,
	}
}
