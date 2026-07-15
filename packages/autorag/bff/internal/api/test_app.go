package api

import (
	"log/slog"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
// This constructor allows creating an App without the full initialization logic
// of NewApp, which is useful for:
//   - Unit testing handlers in isolation
//   - Downstream code that needs to construct custom App instances
//   - Integration tests with mocked dependencies
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	k8sService kubernetes.Service,
	healthcheckRepo *repositories.HealthCheckRepository,
	k8sRepo *repositories.K8sRepository,
	s3Repo *repositories.S3Repository,
	pipelinesRepo *repositories.PipelinesRepository,
	ogxRepo *repositories.OGXRepository,
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
		ogx: &OGXHandler{
			logger: logger,
			repo:   ogxRepo,
		},
	}
}
