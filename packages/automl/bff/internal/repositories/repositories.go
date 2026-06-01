package repositories

import (
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
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
	K8sService          *corek8s.Service
	PipelinesService    *corepipelines.Service
	PipelinesCfg        PipelinesRepositoryConfig
	S3Service           *cores3.Service
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
