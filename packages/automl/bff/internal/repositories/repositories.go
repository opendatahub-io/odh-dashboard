package repositories

import (
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// Repositories is a single convenient container for all repository instances.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	Pipelines     *PipelinesRepository
	Secret        *SecretRepository
	S3            S3RepositoryInterface
	ModelRegistry *ModelRegistryRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
type RepositoriesConfig struct {
	K8sService       *corek8s.K8sService
	PipelinesService *corepipelines.PipelinesService
	PipelinesCfg     PipelinesRepositoryConfig
	S3Service        *cores3.S3Service
}

func NewRepositories(cfg RepositoriesConfig) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		Pipelines:     NewPipelinesRepository(cfg.PipelinesService, cfg.PipelinesCfg),
		Secret:        NewSecretRepository(),
		S3:            NewS3Repository(cfg.S3Service, cfg.K8sService, cfg.PipelinesService),
		ModelRegistry: NewModelRegistryRepository(),
	}
}
