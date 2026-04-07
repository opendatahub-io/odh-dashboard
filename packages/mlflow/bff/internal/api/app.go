package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"

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
	UserPath        = APIPathPrefix + "/user"
	NamespacePath   = APIPathPrefix + "/namespaces"
	ExperimentsPath = APIPathPrefix + "/experiments"
)

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	kubernetesClientFactory k8s.KubernetesClientFactory
	mlflowClientFactory     mlflowpkg.MLflowClientFactory
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

	mlflowFactory, mlflowState, err := initMLflowFactory(cfg, logger, rootCAs)
	if err != nil {
		return nil, err
	}

	return &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		mlflowClientFactory:     mlflowFactory,
		repositories:            repositories.NewRepositories(),
		testEnv:                 testEnv,
		rootCAs:                 rootCAs,
		mlflowState:             mlflowState,
	}, nil
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

func initMLflowFactory(cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (mlflowpkg.MLflowClientFactory, *mlflowmocks.MLflowState, error) {
	if cfg.MockHTTPClient {
		return initMockMLflowFactory(cfg, logger)
	}

	trackingURL := resolveMLflowURL(cfg, logger)
	if trackingURL == "" {
		return mlflowpkg.NewUnavailableClientFactory(), nil, nil
	}
	return newRealClientFactory(trackingURL, rootCAs, cfg.InsecureSkipVerify, logger), nil, nil
}

func initMockMLflowFactory(cfg config.EnvConfig, logger *slog.Logger) (mlflowpkg.MLflowClientFactory, *mlflowmocks.MLflowState, error) {
	if cfg.MLflowURL != "" {
		if err := validateLoopbackURL(cfg.MLflowURL, cfg.DevMode); err != nil {
			return nil, nil, err
		}
		logger.Info("Using external MLflow (no auth)", slog.String("url", cfg.MLflowURL))
		return mlflowmocks.NewMockClientFactory(cfg.MLflowURL), nil, nil
	}

	if cfg.StaticMLflowMock {
		logger.Info("Using static in-memory MLflow mock data")
		return mlflowmocks.NewStaticMockClientFactory(), nil, nil
	}

	state, err := mlflowmocks.SetupMLflow(logger)
	if err != nil {
		logger.Info("MLflow mock server not available, using static mock data", slog.Any("error", err))
		return mlflowmocks.NewStaticMockClientFactory(), nil, nil
	}
	return mlflowmocks.NewMockClientFactory(state.TrackingURI), state, nil
}

func validateLoopbackURL(rawURL string, devMode bool) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid MLflow URL: %w", err)
	}
	host := parsed.Hostname()
	ip := net.ParseIP(host)
	if !devMode || (host != "localhost" && (ip == nil || !ip.IsLoopback())) {
		return fmt.Errorf("external no-auth MLflow is only allowed in dev mode for loopback hosts")
	}
	return nil
}

func sanitizeURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "<invalid-url>"
	}
	return (&url.URL{
		Scheme: parsed.Scheme,
		Host:   parsed.Host,
		Path:   parsed.Path,
	}).String()
}

func normalizeTrackingURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", fmt.Errorf("invalid MLflow URL: %s", sanitizeURL(rawURL))
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid MLflow URL: missing scheme or host")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("unsupported MLflow URL scheme %q", parsed.Scheme)
	}
	return (&url.URL{
		Scheme: parsed.Scheme,
		Host:   parsed.Host,
		Path:   parsed.Path,
	}).String(), nil
}

func resolveMLflowURL(cfg config.EnvConfig, logger *slog.Logger) string {
	if cfg.MLflowURL != "" {
		normalized, err := normalizeTrackingURL(cfg.MLflowURL)
		if err != nil {
			logger.Warn("Configured MLflow URL is invalid, MLflow endpoints will return 503", slog.String("url", sanitizeURL(cfg.MLflowURL)))
			return ""
		}
		logger.Info("Using MLflow URL from configuration", slog.String("url", sanitizeURL(normalized)))
		return normalized
	}
	if cfg.AuthMethod == config.AuthMethodDisabled {
		logger.Info("Auth disabled, skipping MLflow URL discovery")
		return ""
	}
	discoveredURL, err := mlflowpkg.DiscoverMLflowURL()
	if err != nil {
		logger.Warn("MLflow CR auto-discovery failed, MLflow endpoints will return 503", slog.Any("error", err))
		return ""
	}
	if discoveredURL == "" {
		logger.Warn("MLflow CR auto-discovery returned empty URL, MLflow endpoints will return 503")
		return ""
	}
	normalized, err := normalizeTrackingURL(discoveredURL)
	if err != nil {
		logger.Warn("Discovered MLflow URL is invalid, MLflow endpoints will return 503", slog.String("url", sanitizeURL(discoveredURL)))
		return ""
	}
	logger.Info("Discovered MLflow URL from CR", slog.String("url", sanitizeURL(normalized)))
	return normalized
}

func newRealClientFactory(trackingURL string, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) mlflowpkg.MLflowClientFactory {
	return mlflowpkg.NewRealClientFactory(mlflowpkg.RealClientFactoryConfig{
		TrackingURL:        trackingURL,
		RootCAs:            rootCAs,
		InsecureSkipVerify: insecureSkipVerify,
		Logger:             logger,
	})
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")

	if app.mlflowState != nil {
		app.logger.Info("stopping MLflow server...")
		mlflowmocks.CleanupMLflowState(app.mlflowState, app.logger)
	}

	if app.testEnv == nil {
		return nil
	}
	app.logger.Info("shutting env test...")
	return app.testEnv.Stop()
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
