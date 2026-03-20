package repositories

import (
	"log/slog"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck     *HealthCheckRepository
	User            *UserRepository
	Namespace       *NamespaceRepository
	LSDModels       *LSDModelsRepository
	LSDVectorStores *LSDVectorStoresRepository
	Secret          *SecretRepository
	S3              *S3Repository
	Pipeline        *PipelineRepository
	PipelineRuns    *PipelineRunsRepository
}

func NewRepositories(_ *slog.Logger) *Repositories {
	return &Repositories{
		HealthCheck:     NewHealthCheckRepository(),
		User:            NewUserRepository(),
		Namespace:       NewNamespaceRepository(),
		LSDModels:       NewLSDModelsRepository(),
		LSDVectorStores: NewLSDVectorStoresRepository(),
		Secret:          NewSecretRepository(),
		S3:              NewS3Repository(),
		Pipeline:        NewPipelineRepository(),
		PipelineRuns:    NewPipelineRunsRepository(),
	}
}
