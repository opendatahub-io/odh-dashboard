package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"

	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes/k8mocks"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow/mlflowmocks"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version         = "1.0.0"
	PathPrefix      = "/mlflow"
	APIPathPrefix   = "/api/v1"
	HealthCheckPath = "/healthcheck"
	StatusPath      = APIPathPrefix + "/status"
	UserPath        = APIPathPrefix + "/user"
	NamespacePath   = APIPathPrefix + "/namespaces"
	ExperimentsPath = APIPathPrefix + "/experiments"
)

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	kubernetesClientFactory k8s.KubernetesClientFactory
	mlflowMu                sync.RWMutex
	mlflowClientFactory     mlflowpkg.MLflowClientFactory
	mlflowConfigured        bool
	mlflowTrackingURL       string
	mlflowWatcherDone       chan struct{}
	mlflowWatcherWg         sync.WaitGroup
	shutdownOnce            sync.Once
	shutdownErr             error
	repositories            *repositories.Repositories
	testEnv                 *envtest.Environment     // used only with mocked k8s client
	rootCAs                 *x509.CertPool           // custom CA pool for outbound TLS connections
	mlflowState             *mlflowmocks.MLflowState // set when MockHTTPClient starts a child MLflow via uv
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))

	rootCAs := initRootCAs(cfg.BundlePaths, logger)

	var k8sFactory k8s.KubernetesClientFactory
	var testEnv *envtest.Environment
	if cfg.AuthMethod != config.AuthMethodDisabled || cfg.MockK8Client {
		var err error
		k8sFactory, testEnv, err = initK8sFactory(cfg, logger)
		if err != nil {
			return nil, err
		}
	}

	mlflowFactory, mlflowState, trackingURL, mlflowConfigured, err := initMLflowFactory(cfg, logger, rootCAs)
	if err != nil {
		return nil, err
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		mlflowClientFactory:     mlflowFactory,
		mlflowConfigured:        mlflowConfigured,
		mlflowTrackingURL:       trackingURL,
		repositories:            repositories.NewRepositories(),
		testEnv:                 testEnv,
		rootCAs:                 rootCAs,
		mlflowState:             mlflowState,
	}

	if app.shouldWatchMLflow() {
		app.startMLflowWatcher()
	}

	return app, nil
}

func initRootCAs(bundlePaths []string, logger *slog.Logger) *x509.CertPool {
	if len(bundlePaths) == 0 {
		return nil
	}

	pool, err := x509.SystemCertPool()
	if err != nil {
		pool = x509.NewCertPool()
	}

	var loadedAny bool
	for _, p := range bundlePaths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		pemBytes, readErr := os.ReadFile(p)
		if readErr != nil {
			logger.Debug("CA bundle not readable, skipping", slog.String("path", p), slog.Any("error", readErr))
			continue
		}
		if ok := pool.AppendCertsFromPEM(pemBytes); !ok {
			logger.Debug("No certs appended from PEM bundle", slog.String("path", p))
			continue
		}
		loadedAny = true
		logger.Info("Added CA bundle", slog.String("path", p))
	}

	if !loadedAny {
		logger.Warn("No CA certificates loaded from bundle-paths; falling back to system defaults")
		return nil
	}
	return pool
}

func initK8sFactory(cfg config.EnvConfig, logger *slog.Logger) (k8s.KubernetesClientFactory, *envtest.Environment, error) {
	if cfg.MockK8Client {
		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Ctx: context.Background(),
		})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to setup envtest: %w", err)
		}
		factory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to create mocked Kubernetes client: %w", err)
		}
		return factory, testEnv, nil
	}

	factory, err := k8s.NewKubernetesClientFactory(cfg, logger)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}
	return factory, nil, nil
}

func (app *App) Shutdown() error {
	app.shutdownOnce.Do(func() {
		app.logger.Info("shutting down app...")

		if app.mlflowWatcherDone != nil {
			close(app.mlflowWatcherDone)
			app.mlflowWatcherWg.Wait()
		}

		if app.mlflowState != nil {
			app.logger.Info("stopping MLflow server...")
			mlflowmocks.CleanupMLflowState(app.mlflowState, app.logger)
		}

		if app.testEnv != nil {
			app.logger.Info("shutting env test...")
			app.shutdownErr = app.testEnv.Stop()
		}
	})
	return app.shutdownErr
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)

	// MLflow API routes
	apiRouter.GET(StatusPath, app.RequireValidIdentity(app.StatusHandler))
	apiRouter.GET(ExperimentsPath, app.AttachWorkspace(app.RequireValidIdentity(app.AttachMLflowClient(app.MLflowListExperimentsHandler))))

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(APIPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+APIPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)
		// Check if the requested file exists
		if _, err := staticDir.Open(r.URL.Path); err == nil {
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		http.ServeFile(w, r, path.Join(app.config.StaticAssetsDir, "index.html"))
	})

	// Create a mux for the healthcheck endpoint
	healthcheckMux := http.NewServeMux()
	healthcheckRouter := httprouter.New()
	healthcheckRouter.GET(HealthCheckPath, app.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Combines the healthcheck endpoint with the rest of the routes
	// Apply middleware to appMux which contains the API routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(app.InjectRequestIdentity(appMux)))))

	return combinedMux
}
