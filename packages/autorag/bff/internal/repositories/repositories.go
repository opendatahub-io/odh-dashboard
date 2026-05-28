package repositories

import (
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	User            *UserRepository
	Namespace       *NamespaceRepository
	OGXModels       *OGXModelsRepository
	OGXVectorStores *OGXVectorStoresRepository
	Secret          *SecretRepository
	S3              S3RepositoryInterface
	Pipelines       *PipelinesRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
type RepositoriesConfig struct {
	PipelinesService *corepipelines.PipelinesService
	PipelinesCfg     PipelinesRepositoryConfig
	K8sService       *corek8s.K8sService
	S3Service        *cores3.S3Service
}

func NewRepositories(cfg RepositoriesConfig) *Repositories {
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		OGXModels:       NewOGXModelsRepository(),
		OGXVectorStores: NewOGXVectorStoresRepository(),
		Secret:          NewSecretRepository(),
		S3:              NewS3Repository(cfg.K8sService, cfg.S3Service, cfg.PipelinesService),
		Pipelines:       NewPipelinesRepository(cfg.PipelinesService, cfg.PipelinesCfg),
	}
}
