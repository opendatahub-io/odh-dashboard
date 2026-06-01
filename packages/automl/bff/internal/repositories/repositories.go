package repositories

import (
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// Repositories is a single convenient container for all repository instances.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	Secret        *SecretRepository
	Pipelines     *PipelinesRepository
	S3            *S3Repository
	ModelRegistry *ModelRegistryRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
type RepositoriesConfig struct {
	K8sService          *kubernetes.Service
	PipelinesService    *pipelines.Service
	PipelinesCfg        PipelinesRepositoryConfig
	S3Service           *s3.Service
	ModelRegistryClient modelregistry.ModelRegistryClientInterface
}

func NewRepositories(cfg RepositoriesConfig) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		Secret:        NewSecretRepository(),
		Pipelines:     NewPipelinesRepository(cfg.PipelinesService, cfg.PipelinesCfg),
		S3:            NewS3Repository(cfg.S3Service, cfg.K8sService, cfg.PipelinesService),
		ModelRegistry: NewModelRegistryRepository(cfg.ModelRegistryClient, cfg.K8sService, cfg.PipelinesService),
	}
}
