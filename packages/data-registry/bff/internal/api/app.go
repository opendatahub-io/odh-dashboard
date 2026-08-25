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

	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes/k8mocks"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/data-registry/bff/internal/helpers"

	"github.com/opendatahub-io/data-registry/bff/internal/config"
	"github.com/opendatahub-io/data-registry/bff/internal/proxy"
	"github.com/opendatahub-io/data-registry/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version         = "1.0.0"
	PathPrefix      = "/data-registry"
	ApiPathPrefix   = "/api/v1"
	HealthCheckPath = "/healthcheck"
	UserPath        = ApiPathPrefix + "/user"
	NamespacePath   = ApiPathPrefix + "/namespaces"

	// DataRegistryPathPrefix is the root under which the Data Registry API catchall proxy is
	// mounted. It intentionally matches ApiPathPrefix so the publicly exposed route shape stays
	// consistent with every other BFF in the monorepo ("/api/v1/..."). Only the literal "/api"
	// segment is stripped before forwarding upstream (see registry_proxy_handler.go), so the
	// resulting path (e.g. "/v1/{project}/config") matches the vendored OpenAPI contract's own
	// "/v1" root exactly (see openapi/src/data-registry-api.yaml). Once this module's Node
	// dashboard backend proxy is registered (module federation name "dataRegistry", see
	// frontend/config/moduleFederation.js), that backend strips its own "/_mf/dataRegistry"
	// prefix and forwards the remainder unchanged (see backend/src/routes/module-federation.ts) —
	// no further prefix stripping happens between that and this "/api/v1" root.
	DataRegistryPathPrefix = ApiPathPrefix
)

type App struct {
	config                  config.EnvConfig
	logger                  *slog.Logger
	kubernetesClientFactory k8s.KubernetesClientFactory
	repositories            *repositories.Repositories
	//used only on mocked k8s client
	testEnv *envtest.Environment
	// rootCAs used for outbound TLS connections to Client Service
	rootCAs *x509.CertPool
	// bffClientFactory creates clients for inter-BFF communication
	bffClientFactory bffclient.BFFClientFactory
	wsTracker        *proxy.ConnectionTracker
	// dataRegistryAPIURL holds the resolved base URL of the upstream Data Registry API,
	// unvalidated (see registry_proxy_handler.go, which validates on every read). Empty when not
	// yet configured (e.g. ConfigMap not deployed) — proxy routes return 503 until it's set. It's
	// a StringHolder rather than a plain string because a background discovery retry loop (see
	// data_registry_discovery.go) may set it after startup, once the ConfigMap appears, without
	// requiring the process to restart.
	dataRegistryAPIURL *helper.StringHolder
	// dataRegistryDiscoveryCancel stops the background discovery loop above. nil if the URL was
	// already known at startup, so no loop was started. Called from Shutdown.
	dataRegistryDiscoveryCancel context.CancelFunc
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))
	var k8sFactory k8s.KubernetesClientFactory
	var err error
	// used only on mocked k8s client
	var testEnv *envtest.Environment
	var rootCAs *x509.CertPool

	// Initialize CA pool if bundle paths are provided
	if len(cfg.BundlePaths) > 0 {
		// Start with system certs if available
		if pool, err := x509.SystemCertPool(); err == nil {
			rootCAs = pool
		} else {
			rootCAs = x509.NewCertPool()
		}
		var loadedAny bool
		for _, p := range cfg.BundlePaths {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			// Read and append each PEM bundle; ignore errors per file, log at debug
			pemBytes, readErr := os.ReadFile(p)
			if readErr != nil {
				logger.Debug("CA bundle not readable, skipping", slog.String("path", p), slog.Any("error", readErr))
				continue
			}
			if ok := rootCAs.AppendCertsFromPEM(pemBytes); !ok {
				logger.Debug("No certs appended from PEM bundle", slog.String("path", p))
				continue
			}
			loadedAny = true
			logger.Info("Added CA bundle", slog.String("path", p))
		}
		if !loadedAny {
			// If none were loaded successfully, keep rootCAs nil to fall back to default transport behavior
			rootCAs = nil
			logger.Warn("No CA certificates loaded from bundle-paths; falling back to system defaults")
		}
	}

	if cfg.MockK8Client {
		//mock all k8s calls with 'env test'
		var clientset kubernetes.Interface
		ctx, cancel := context.WithCancel(context.Background())
		testEnv, clientset, err = k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to setup envtest: %w", err)
		}
		//create mocked kubernetes client factory
		k8sFactory, err = k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)

	} else {
		//create kubernetes client factory
		k8sFactory, err = k8s.NewKubernetesClientFactory(cfg, logger)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	// Initialize BFF client factory for inter-BFF communication
	var bffFactory bffclient.BFFClientFactory
	bffConfig := bffclient.NewDefaultBFFClientConfig()
	bffConfig.MockBFFClients = cfg.MockBFFClients
	bffConfig.InsecureSkipVerify = cfg.InsecureSkipVerify

	// Apply target-specific configuration overrides from CLI flags/env vars here.
	// Example: to configure a target BFF, add fields to EnvConfig and apply them:
	//
	//   if targetCfg := bffConfig.GetServiceConfig(bffclient.BFFTargetMaaS); targetCfg != nil {
	//       targetCfg.ServiceName = cfg.BFFTargetServiceName
	//       targetCfg.Port = cfg.BFFTargetServicePort
	//       targetCfg.DevOverrideURL = cfg.BFFTargetDevURL
	//   }

	if cfg.MockBFFClients {
		logger.Info("Using mock BFF client factory")
		bffFactory = bffmocks.NewMockClientFactory(logger)
	} else {
		logger.Info("Using real BFF client factory")
		bffFactory = bffclient.NewRealClientFactory(bffConfig, rootCAs, cfg.InsecureSkipVerify, logger)
	}

	// Resolve the Data Registry API URL: an explicit flag/env value always wins (local dev,
	// tests). Otherwise, attempt a best-effort, bounded-timeout ConfigMap lookup — a stalled API
	// server must not block startup — falling back to a background retry loop (below) rather
	// than a fatal error, since the backend (RHAISTRAT-2381) may not be deployed yet.
	dataRegistryAPIURLHolder := helper.NewStringHolder(cfg.DataRegistryAPIURL)
	needsDiscoveryLoop := false
	if cfg.DataRegistryAPIURL == "" && !cfg.MockK8Client {
		resolveCtx, cancel := context.WithTimeout(context.Background(), dataRegistryConfigMapLookupTimeout)
		resolvedURL, cmErr := k8s.ResolveDataRegistryAPIURL(resolveCtx, cfg.DataRegistryConfigMapName, cfg.DataRegistryConfigMapKey, logger)
		cancel()
		if cmErr != nil {
			logger.Warn("Data Registry API URL not yet available; proxy routes will return 503 until it's found (retrying in the background)",
				slog.Any("error", cmErr))
			needsDiscoveryLoop = true
		} else {
			dataRegistryAPIURLHolder.Set(resolvedURL)
		}
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(),
		testEnv:                 testEnv,
		rootCAs:                 rootCAs,
		bffClientFactory:        bffFactory,
		dataRegistryAPIURL:      dataRegistryAPIURLHolder,
	}

	if needsDiscoveryLoop {
		discoveryCtx, cancel := context.WithCancel(context.Background())
		app.dataRegistryDiscoveryCancel = cancel
		startDataRegistryDiscoveryLoop(discoveryCtx, cfg, logger, dataRegistryAPIURLHolder)
	}

	app.wsTracker = proxy.NewConnectionTracker(app.logger)

	return app, nil
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	if app.dataRegistryDiscoveryCancel != nil {
		app.dataRegistryDiscoveryCancel()
	}
	if app.wsTracker != nil {
		app.wsTracker.Stop()
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

	// Inter-BFF Communication routes — wire your target BFF endpoints here.
	// Example:
	//
	//   apiRouter.POST(ApiPathPrefix+"/bff/<target>/endpoint",
	//       app.AttachNamespace(
	//           bffclient.AttachBFFClient(app.bffClientFactory, bffclient.BFFTarget<Target>)(
	//               app.YourHandler)))

	// App Router
	appMux := http.NewServeMux()

	// The BFF's own handlers are mounted on exact patterns (UserPath, NamespacePath) so they
	// take precedence over the Data Registry catchall proxy mounted on the broader
	// DataRegistryPathPrefix+"/" subtree below — Go's ServeMux always prefers the more specific
	// pattern regardless of registration order (same technique already used for HealthCheckPath
	// vs. the root pattern further down).
	appMux.Handle(UserPath, apiRouter)
	appMux.Handle(NamespacePath, apiRouter)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))

	// Data Registry API catchall proxy (Iceberg REST Catalog-compatible + RHOAI extensions):
	// every request under DataRegistryPathPrefix is forwarded verbatim to the upstream Data
	// Registry API — no per-operation routes, so new upstream endpoints are automatically
	// reachable without any BFF change ("dumb proxy", confirmed in RHAI-415 review). See
	// registry_proxy_handler.go.
	appMux.Handle(DataRegistryPathPrefix+"/", app.DataRegistryReverseProxy())

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
