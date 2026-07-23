package api

import (
	"log/slog"
	"os"
	"path/filepath"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes/k8smocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mcp/mcpmocks"
	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow/mlflowmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/opendatahub-io/gen-ai/internal/services"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
)

// NewK8sOnlyTestApp creates a minimal App with k8s factory and repositories.
// Use for tests that only need Kubernetes access (install/delete handlers).
func NewK8sOnlyTestApp() App {
	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
	Expect(err).NotTo(HaveOccurred())
	return App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  slog.Default(),
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(),
	}
}

// NewLSOnlyTestApp creates a minimal App with LlamaStack mock factory and repositories.
// Use for tests that only need LlamaStack access (vectorstore/file CRUD handlers).
func NewLSOnlyTestApp() App {
	return App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  slog.Default(),
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}
}

// NewK8sLSTestApp creates an App with both k8s factory and LlamaStack mock.
// Use for tests that need both Kubernetes and LlamaStack access (e.g., status handler).
func NewK8sLSTestApp() App {
	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, slog.Default())
	Expect(err).NotTo(HaveOccurred())
	return App{
		config:                  config.EnvConfig{Port: 4000},
		logger:                  slog.Default(),
		kubernetesClientFactory: k8sFactory,
		llamaStackClientFactory: lsmocks.NewMockClientFactory(),
		repositories:            repositories.NewRepositories(),
	}
}

// NewRoutesTestApp creates a full App suitable for tests that exercise HTTP routes
// (file upload, status checks). It changes the working directory to the project root
// (needed for OpenAPI YAML discovery), registers a DeferCleanup to restore it, and
// returns a fully wired *App with OpenAPI handler.
func NewRoutesTestApp() *App {
	originalWd, err := os.Getwd()
	Expect(err).NotTo(HaveOccurred())

	projectRoot := filepath.Join(originalWd, "..", "..")
	Expect(os.Chdir(projectRoot)).To(Succeed())

	DeferCleanup(func() {
		Expect(os.Chdir(originalWd)).To(Succeed())
	})

	cfg := config.EnvConfig{
		Port:            4000,
		APIPathPrefix:   "/api/v1",
		StaticAssetsDir: "static",
		AuthMethod:      config.AuthMethodUser,
		AuthTokenHeader: config.DefaultAuthTokenHeader,
		AuthTokenPrefix: config.DefaultAuthTokenPrefix,
		MockLSClient:    true,
		LlamaStackURL:   testutil.GetTestLlamaStackURL(),
		MockK8sClient:   false,
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	k8sFactory, err := k8smocks.NewTokenClientFactory(testK8sClient, testCfg, logger)
	Expect(err).NotTo(HaveOccurred())

	openAPIHandler, err := NewOpenAPIHandler(logger)
	Expect(err).NotTo(HaveOccurred())

	return NewTestApp(cfg, logger, k8sFactory, WithOpenAPIHandler(openAPIHandler))
}

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
		bffClientFactory:        bffmocks.NewMockClientFactory(logger),
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
