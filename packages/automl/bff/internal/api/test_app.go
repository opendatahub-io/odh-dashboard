package api

import (
	"log/slog"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

// NewTestApp creates a minimal App instance for testing or downstream extensions.
func NewTestApp( //nolint:unused
	cfg config.EnvConfig,
	logger *slog.Logger,
	repos *repositories.Repositories,
) *App {
	if repos == nil {
		repos = repositories.NewRepositories(repositories.RepositoriesConfig{})
	}
	return &App{
		config:       cfg,
		logger:       logger,
		repositories: repos,
	}
}
