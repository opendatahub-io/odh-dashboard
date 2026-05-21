package repositories

import (
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	User            *UserRepository
	Namespace       *NamespaceRepository
	OGXModels       *OGXModelsRepository
	OGXVectorStores *OGXVectorStoresRepository
	Secret          *SecretRepository
	S3              *S3Repository
	Pipelines       *PipelinesRepository
}

func NewRepositories(pipelinesService *corepipelines.PipelinesService, pipelinesCfg PipelinesRepositoryConfig) *Repositories {
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		OGXModels:       NewOGXModelsRepository(),
		OGXVectorStores: NewOGXVectorStoresRepository(),
		Secret:          NewSecretRepository(),
		S3:              NewS3Repository(),
		Pipelines:       NewPipelinesRepository(pipelinesService, pipelinesCfg),
	}
}
