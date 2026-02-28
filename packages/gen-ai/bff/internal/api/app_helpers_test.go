package api

import (
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/config"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas/maasmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow/mlflowmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/services"
)

// TestAppOption configures a test App created by NewTestApp.
type TestAppOption func(*App)

// WithOpenAPIHandler sets the OpenAPI handler, required for tests that call Routes().
func WithOpenAPIHandler(h *OpenAPIHandler) TestAppOption {
	return func(a *App) { a.openAPI = h }
}

// NewTestApp constructs an App with all mock factories for full-stack handler tests.
// For tests that only exercise one or two factories, construct App directly.
func NewTestApp(cfg config.EnvConfig, logger *slog.Logger, k8sFactory k8s.KubernetesClientFactory, opts ...TestAppOption) *App {
	memStore := cache.NewMemoryStore()
	mcpFactory := mcpmocks.NewMockedMCPClientFactory(cfg, logger)

	app := &App{
		config:                  cfg,
		logger:                  logger,
		repositories:            repositories.NewRepositoriesWithMCP(mcpFactory, logger),
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		maasClientFactory:       maasmocks.NewMockClientFactory(),
		mcpClientFactory:        mcpFactory,
		mlflowClientFactory:     mlflowmocks.NewMockClientFactory(),
		dashboardNamespace:      "opendatahub",
		memoryStore:             memStore,
		fileUploadJobTracker:    services.NewFileUploadJobTracker(memStore, logger),
	}

	for _, opt := range opts {
		opt(app)
	}

	return app
}
