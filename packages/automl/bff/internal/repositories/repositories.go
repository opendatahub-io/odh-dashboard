package repositories

import (
	"log/slog"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck  *HealthCheckRepository
	User         *UserRepository
	Namespace    *NamespaceRepository
	Pipeline     *PipelineRepository
	Secret       *SecretRepository
	PipelineRuns *PipelineRunsRepository
}

func NewRepositories(_ *slog.Logger) *Repositories {
	return &Repositories{
		HealthCheck:  NewHealthCheckRepository(),
		User:         NewUserRepository(),
		Namespace:    NewNamespaceRepository(),
		Pipeline:     NewPipelineRepository(),
		Secret:       NewSecretRepository(),
		PipelineRuns: NewPipelineRunsRepository(),
	}
}
