package repositories

import (
	"log/slog"
)

// Repositories is a single convenient container for all repository instances.
type Repositories struct {
	HealthCheck   *HealthCheckRepository
	User          *UserRepository
	Namespace     *NamespaceRepository
	Pipeline      *PipelineRepository
	Secret        *SecretRepository
	S3            S3RepositoryInterface
	PipelineRuns  *PipelineRunsRepository
	ModelRegistry *ModelRegistryRepository
}

func NewRepositories(_ *slog.Logger) *Repositories {
	return &Repositories{
		HealthCheck:   NewHealthCheckRepository(),
		User:          NewUserRepository(),
		Namespace:     NewNamespaceRepository(),
		Pipeline:      NewPipelineRepository(),
		Secret:        NewSecretRepository(),
		S3:            NewS3Repository(),
		PipelineRuns:  NewPipelineRunsRepository(),
		ModelRegistry: NewModelRegistryRepository(),
	}
}
