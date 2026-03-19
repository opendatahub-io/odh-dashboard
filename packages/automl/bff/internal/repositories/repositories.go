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
	S3           S3RepositoryInterface
	PipelineRuns *PipelineRunsRepository
}

// RepositoryConfig contains configuration for repository initialization
type RepositoryConfig struct {
	MockS3Client bool
	DevMode      bool // Pass through DevMode for security checks in repositories
}

// NewRepositories creates a new Repositories instance.
// Accepts an optional RepositoryConfig - if not provided, uses default values.
func NewRepositories(_ *slog.Logger, configs ...RepositoryConfig) *Repositories {
	// Use default config if none provided
	var config RepositoryConfig
	if len(configs) > 0 {
		config = configs[0]
	}

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
		Pipeline:     NewPipelineRepository(),
		Secret:       NewSecretRepository(),
		S3:           s3Repo,
		PipelineRuns: NewPipelineRunsRepository(),
	}
}
