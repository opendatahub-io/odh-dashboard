package repositories

import (
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
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

func NewRepositories(pipelinesService *pipelines.PipelinesService, pipelinesCfg PipelinesRepositoryConfig) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		Pipelines:     NewPipelinesRepository(pipelinesService, pipelinesCfg),
		Secret:        NewSecretRepository(),
		S3:            NewS3Repository(),
		ModelRegistry: NewModelRegistryRepository(),
	}
}
