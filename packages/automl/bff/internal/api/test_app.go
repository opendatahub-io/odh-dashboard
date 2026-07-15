package api

import (
	"log/slog"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sService kubernetes.Service,
	healthcheckRepo *repositories.HealthCheckRepository,
	k8sRepo *repositories.K8sRepository,
	s3Repo *repositories.S3Repository,
	pipelinesRepo *repositories.PipelinesRepository,
	modelRegistryRepo *repositories.ModelRegistryRepository,
) *App {
	if healthcheckRepo == nil {
		healthcheckRepo = repositories.NewHealthCheckRepository()
	}
	if k8sRepo == nil {
		k8sRepo = repositories.NewK8sRepository()
	}
	return &App{
		config:     cfg,
		logger:     logger,
		k8sService: k8sService,
		healthcheck: &HealthcheckHandler{
			logger: logger,
			repo:   healthcheckRepo,
		},
		k8s: &K8sHandler{
			logger:     logger,
			k8sService: k8sService,
			repo:       k8sRepo,
		},
		s3: &S3Handler{
			logger: logger,
			repo:   s3Repo,
		},
		pipelines: &PipelinesHandler{
			logger: logger,
			repo:   pipelinesRepo,
		},
		modelRegistry: &ModelRegistryHandler{
			logger: logger,
			repo:   modelRegistryRepo,
		},
	}
}
