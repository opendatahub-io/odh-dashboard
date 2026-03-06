package repositories

import (
	"log/slog"
)

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck  *HealthCheckRepository
	User         *UserRepository
	Namespace    *NamespaceRepository
	LSDModels    *LSDModelsRepository
	Secret       *SecretRepository
	PipelineRuns *PipelineRunsRepository
}

func NewRepositories(logger *slog.Logger) *Repositories {
	// logger parameter is reserved for future use when repository constructors need logging
	_ = logger
	return &Repositories{
		HealthCheck:  NewHealthCheckRepository(),
		User:         NewUserRepository(),
		Namespace:    NewNamespaceRepository(),
		LSDModels:    NewLSDModelsRepository(),
		Secret:       NewSecretRepository(),
		PipelineRuns: NewPipelineRunsRepository(),
	}
}
