package repositories

import (
	"log/slog"
)

// RepositoryConfig holds configuration for repository initialization
type RepositoryConfig struct {
	MockS3Client bool
	DevMode      bool // Pass through DevMode for security checks in repositories
}

// Repositories struct is a single convenient container to hold and represent all our repositories.
type Repositories struct {
	HealthCheck  *HealthCheckRepository
	User         *UserRepository
	Namespace    *NamespaceRepository
	LSDModels    *LSDModelsRepository
	Secret       *SecretRepository
	S3           S3RepositoryInterface
	Pipeline     *PipelineRepository
	PipelineRuns *PipelineRunsRepository
}

func NewRepositories(_ *slog.Logger, configs ...RepositoryConfig) *Repositories {
	// Extract config if provided, otherwise use zero value (all mocks disabled)
	var config RepositoryConfig
	if len(configs) > 0 {
		config = configs[0]
	}

	// Initialize S3 repository based on configuration
	var s3Repo S3RepositoryInterface
	if config.MockS3Client {
		s3Repo = NewMockS3Repository()
	} else {
		s3Repo = NewS3Repository(config.DevMode)
	}

	return &Repositories{
		HealthCheck:  NewHealthCheckRepository(),
		User:         NewUserRepository(),
		Namespace:    NewNamespaceRepository(),
		LSDModels:    NewLSDModelsRepository(),
		Secret:       NewSecretRepository(),
		S3:           s3Repo,
		Pipeline:     NewPipelineRepository(),
		PipelineRuns: NewPipelineRunsRepository(),
	}
}
