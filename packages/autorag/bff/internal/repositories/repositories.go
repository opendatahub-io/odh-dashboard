package repositories

import (
	"log/slog"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck  *HealthCheckRepository
	User         *UserRepository
	Namespace    *NamespaceRepository
	PipelineRuns *PipelineRunsRepository
}

func NewRepositories(logger *slog.Logger) *Repositories {
	if logger == nil {
		logger = slog.Default()
	}
	return &Repositories{
		HealthCheck:  NewHealthCheckRepository(),
		User:         NewUserRepository(),
		Namespace:    NewNamespaceRepository(),
		PipelineRuns: NewPipelineRunsRepository(),
	}
}
