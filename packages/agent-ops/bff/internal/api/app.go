package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	agentsk8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/kubernetes"
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/bffclient/bffmocks"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes/k8mocks"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version                = "1.0.0"
	PathPrefix             = "/mod-arch"
	ApiPathPrefix          = "/api/v1"
	HealthCheckPath        = "/healthcheck"
	UserPath               = ApiPathPrefix + "/user"
	NamespacePath          = ApiPathPrefix + "/namespaces"
	AgentRuntimesPath      = ApiPathPrefix + "/agents/runtimes"
	AgentRuntimeDetailPath = ApiPathPrefix + "/agents/runtimes/:ns/:name"
	AgentDeployPath        = ApiPathPrefix + "/agents/deploy"
)

var hashPattern = regexp.MustCompile(`[.\-][0-9a-f]{8,}`)
var staticAssetPattern = regexp.MustCompile(`(?i)\.(woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif|bmp)$`)

func isHashedAsset(filePath string) bool {
	match := hashPattern.FindString(path.Base(filePath))
	return match != "" && strings.ContainsAny(match, "abcdef")
}

func isStaticAsset(filePath string) bool {
	return staticAssetPattern.MatchString(filePath)
}

func cacheControlForStaticFile(filePath string) string {
	if isHashedAsset(filePath) {
		return "public, max-age=31536000, immutable"
	}
	if isStaticAsset(filePath) {
		return "public, max-age=86400"
	}
	return "no-cache"
}

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

	if cfg.AuthMethod == config.AuthMethodDisabled && !cfg.MockAgentClient {
		return nil, fmt.Errorf("AUTH_METHOD=disabled requires MOCK_AGENT_CLIENT=true: Kubernetes-backed agent routes need authenticated access")
	}

	if cfg.AuthMethod != config.AuthMethodDisabled || cfg.MockK8Client {
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

	var agentSourceFactory agents.ClientFactory
	if cfg.MockAgentClient {
		logger.Warn("MOCK_AGENT_CLIENT is enabled (local development only): agent routes serve fabricated demo data without RBAC checks; do not enable in staging or production")
		agentSourceFactory = &agentsmock.Factory{Client: agentsmock.NewDemoClient()}
	} else {
		logger.Info("Using Kubernetes agent data client")
		agentSourceFactory = agentsk8s.NewFactory(k8sFactory, logger)
	}

	app := &App{
		config:                  cfg,
		logger:                  logger,
		kubernetesClientFactory: k8sFactory,
		repositories:            repositories.NewRepositories(agentSourceFactory),
		testEnv:                 testEnv,
		rootCAs:                 rootCAs,
		bffClientFactory:        bffFactory,
	}
	return app, nil
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	if app.testEnv == nil {
		return nil
	}
	//shutdown the envtest control plane when we are in the mock mode.
	app.logger.Info("shutting env test...")
	return app.testEnv.Stop()
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.handlerWithOverride(HandlerUserID, func() httprouter.Handle {
		return app.UserHandler
	}))
	apiRouter.GET(NamespacePath, app.handlerWithOverride(HandlerNamespacesID, func() httprouter.Handle {
		return app.GetNamespacesHandler
	}))

	// Agent list: RequireAuthenticatedForAgents gates identity when auth is enabled; per-namespace
	// SSAR filtering happens inside the Kubernetes agent client (ListNamespaces / ListAgents).
	apiRouter.GET(AgentRuntimesPath, app.RequireAuthenticatedForAgents(app.ListAgentRuntimesHandler))
	apiRouter.GET(AgentRuntimeDetailPath,
		app.AttachNamespaceFromParam("ns",
			app.RequireAccessToAgent(app.GetAgentRuntimeDetailHandler)))
	apiRouter.POST(AgentDeployPath, app.RequireAuthenticatedForAgents(app.DeployAgentHandler))

	// Inter-BFF Communication routes — wire your target BFF endpoints here.
	// Example:
	//
	//   apiRouter.POST(ApiPathPrefix+"/bff/<target>/endpoint",
	//       app.AttachNamespace(
	//           bffclient.AttachBFFClient(app.bffClientFactory, bffclient.BFFTarget<Target>)(
	//               app.YourHandler)))

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls
	appMux.Handle(ApiPathPrefix+"/", apiRouter)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, apiRouter))

	// file server for the frontend file and SPA routes
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)
		// Check if the requested file exists
		if f, err := staticDir.Open(r.URL.Path); err == nil {
			f.Close()
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
			// Serve the file if it exists
			w.Header().Set("Cache-Control", cacheControlForStaticFile(r.URL.Path))
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes
		ctxLogger.Debug("Static asset not found, serving index.html", slog.String("path", r.URL.Path))
		w.Header().Set("Cache-Control", "no-cache")
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
