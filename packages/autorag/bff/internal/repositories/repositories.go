package repositories

import (
	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	Secret          *SecretRepository
	Pipelines       *PipelinesRepository
	S3              *S3Repository
	OGXModels       *OGXModelsRepository
	OGXVectorStores *OGXVectorStoresRepository
}

// RepositoriesConfig holds the dependencies needed to construct all repositories.
type RepositoriesConfig struct {
	K8sService       *kubernetes.Service
	PipelinesService *pipelines.Service
	PipelinesCfg     PipelinesRepositoryConfig
	S3Service        *s3.Service
	OGXClient        ogx.OGXClientInterface
}

func NewRepositories(cfg RepositoriesConfig) *Repositories {
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		Secret:          NewSecretRepository(),
		Pipelines:       NewPipelinesRepository(cfg.PipelinesService, cfg.PipelinesCfg),
		S3:              NewS3Repository(cfg.S3Service, cfg.K8sService, cfg.PipelinesService),
		OGXModels:       NewOGXModelsRepository(cfg.OGXClient, cfg.K8sService),
		OGXVectorStores: NewOGXVectorStoresRepository(cfg.OGXClient, cfg.K8sService),
	}
}
