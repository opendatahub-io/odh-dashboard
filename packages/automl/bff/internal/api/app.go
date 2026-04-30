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

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	k8mocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	ps "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver"
	psmocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/pipelineserver/psmocks"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	s3mocks "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3/s3mocks"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version                 = "1.0.0"
	PathPrefix              = "/automl"
	ApiPathPrefix           = "/api/v1"
	HealthCheckPath         = "/healthcheck"
	UserPath                = ApiPathPrefix + "/user"
	NamespacePath           = ApiPathPrefix + "/namespaces"
	SecretsPath             = ApiPathPrefix + "/secrets"
	S3FilePath              = ApiPathPrefix + "/s3/files/:key"
	S3FilesPath             = ApiPathPrefix + "/s3/files"
	PipelineRunsPath        = ApiPathPrefix + "/pipeline-runs"
	ModelRegistriesPath     = ApiPathPrefix + "/model-registries"
	ModelRegistryModelsPath = ModelRegistriesPath + "/:registryId/models"
)

// modelRegistryHTTPClientFactory builds a client for Model Registry register calls.
// If nil, modelregistry.NewHTTPClient is used. Set by tests only.
type modelRegistryHTTPClientFactory func(*slog.Logger, string, http.Header, bool, *x509.CertPool) (modelregistry.HTTPClientInterface, error)

type App struct {
	config                      config.EnvConfig
	logger                      *slog.Logger
	kubernetesClientFactory     k8s.KubernetesClientFactory
	pipelineServerClientFactory ps.PipelineServerClientFactory
	s3ClientFactory             s3int.S3ClientFactory
	repositories                *repositories.Repositories
	// s3PostMaxFilePartBytes is for package api tests only (see PostS3FileHandler).
	s3PostMaxFilePartBytes int64
	// s3PostMaxRequestBodyBytes caps total POST body in tests (0 = file max + multipart envelope).
	s3PostMaxRequestBodyBytes int64
	// s3PostMaxCollisionAttempts limits HeadObject-based key suffix attempts in tests (0 = default cap).
	s3PostMaxCollisionAttempts int
	//used only on mocked k8s client
	testEnv *envtest.Environment
	// rootCAs used for outbound TLS connections to Client Service
	rootCAs *x509.CertPool
	// modelRegistryHTTPClientFactory is nil in production; tests may set it to inject mock clients.
	modelRegistryHTTPClientFactory modelRegistryHTTPClientFactory
	// portForwardManager manages on-demand port-forwards for local dev (nil in production)
	portForwardManager *k8s.PortForwardManager
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

	// LOCAL DEVELOPMENT ONLY: Enable dynamic port-forwarding when DevMode is true
	// and a real K8s client is in use. This rewrites in-cluster service URLs
	// (*.svc.cluster.local) to localhost via SPDY tunnels, eliminating the need
	// for manual oc port-forward commands and /etc/hosts entries.
	// Production deployments never set DevMode, so pfManager stays nil and all
	// ForwardURL call sites in the middleware are no-ops.
	// Uses the BFF's own kubeconfig credentials (not per-request user tokens)
	// since port-forwards are long-lived and shared across requests.
	var pfManager *k8s.PortForwardManager
	if cfg.DevMode && !cfg.MockK8Client {
		restCfg, pfErr := helper.GetKubeconfig()
		if pfErr != nil {
			logger.Warn("could not initialize dynamic port-forwarding", "error", pfErr)
		} else {
			clientset, csErr := kubernetes.NewForConfig(restCfg)
			if csErr != nil {
				logger.Warn("could not initialize dynamic port-forwarding", "error", csErr)
			} else {
				pfManager = k8s.NewPortForwardManager(restCfg, clientset, logger)
				logger.Info("dynamic port-forwarding enabled — in-cluster URLs will be forwarded to localhost")
			}
		}
	}

	// Initialize Pipeline Server client factory
	var pipelineServerClientFactory ps.PipelineServerClientFactory
	if cfg.MockPipelineServerClient {
		logger.Info("Using mock Pipeline Server client factory")
		pipelineServerClientFactory = psmocks.NewMockClientFactory()
	} else {
		logger.Info("Using real Pipeline Server client factory")
		pipelineServerClientFactory = ps.NewRealClientFactory()
	}

	// Initialize S3 client factory
	var s3ClientFactory s3int.S3ClientFactory
	if cfg.MockS3Client {
		logger.Info("Using mock S3 client factory")
		s3ClientFactory = s3mocks.NewMockClientFactory()
	} else {
		logger.Info("Using real S3 client factory")
		// TLS verification uses the operator-mounted CA bundles (rootCAs) so that
		// self-signed MinIO certificates are validated properly rather than skipped.
		// The RHOAI operator passes --bundle-paths with cluster CA, service-ca, and
		// odh-trusted-ca-bundle paths, which are loaded into rootCAs above.
		// HTTPS is always required; plain HTTP is rejected to prevent credentials
		// from being transmitted in cleartext.
		// RFC-1918 private IPs are allowed (MinIO runs in-cluster); loopback,
		// link-local, and reserved ranges are always blocked.
		s3ClientFactory = s3int.NewRealClientFactory(s3int.S3ClientOptions{
			DevMode: cfg.DevMode,
			RootCAs: rootCAs,
		})
	}

	app := &App{
		config:                      cfg,
		logger:                      logger,
		kubernetesClientFactory:     k8sFactory,
		pipelineServerClientFactory: pipelineServerClientFactory,
		s3ClientFactory:             s3ClientFactory,
		repositories:                repositories.NewRepositories(logger),
		testEnv:                     testEnv,
		rootCAs:                     rootCAs,
		portForwardManager:          pfManager,
	}
	return app, nil
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	if app.portForwardManager != nil {
		app.portForwardManager.Close()
	}
	if app.testEnv == nil {
		return nil
	}
	//shutdown the envtest control plane when we are in the mock mode.
	app.logger.Info("shutting env test...")
	return app.testEnv.Stop()
}

// attachPipelineClientIfNeeded is a best-effort shim for the S3 file routes.
// When the caller supplies an explicit secretName query parameter the handler
// can resolve S3 credentials directly, so DSPA discovery is skipped and next
// is called immediately. Otherwise the full AttachPipelineServerClient
// middleware runs as normal.
func (app *App) attachPipelineClientIfNeeded(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if strings.TrimSpace(r.URL.Query().Get("secretName")) != "" {
			next(w, r, ps)
			return
		}
		app.AttachPipelineServerClient(next)(w, r, ps)
	}
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)
	apiRouter.GET(SecretsPath, app.AttachNamespace(app.GetSecretsHandler))

	// Model Registry discovery — CRs are namespace-scoped within rhoai-model-registries
	// but presented as global in the RHOAI UX; no user-supplied namespace parameter needed.
	apiRouter.GET(ModelRegistriesPath, app.GetModelRegistriesHandler)

	// Pipeline Runs API endpoints (pipeline server and pipeline are auto-discovered)
	apiRouter.GET(PipelineRunsPath+"/:runId", app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.PipelineRunHandler)))))
	apiRouter.GET(PipelineRunsPath, app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.PipelineRunsHandler)))))
	apiRouter.POST(PipelineRunsPath, app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.CreatePipelineRunHandler)))))
	apiRouter.POST(PipelineRunsPath+"/:runId/terminate", app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.TerminatePipelineRunHandler)))))
	apiRouter.POST(PipelineRunsPath+"/:runId/retry", app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.RetryPipelineRunHandler)))))
	apiRouter.DELETE(PipelineRunsPath+"/:runId", app.AttachNamespace(app.RequireAccessToPipelineServers(app.AttachPipelineServerClient(app.AttachDiscoveredPipeline(app.DeletePipelineRunHandler)))))

	// S3 operations — DSPA discovery is skipped when the caller supplies an explicit
	// secretName (the handler resolves credentials directly in that case).
	apiRouter.GET(S3FilePath, app.AttachNamespace(app.RequireAccessToPipelineServers(app.attachPipelineClientIfNeeded(app.GetS3FileHandler))))
	apiRouter.GET(S3FilesPath, app.AttachNamespace(app.RequireAccessToPipelineServers(app.attachPipelineClientIfNeeded(app.GetS3FilesHandler))))
	// POST /s3/files/:key deliberately omits attachPipelineClientIfNeeded: secretName is required;
	// there is no DSPA fallback (creation flow uses an explicitly chosen input/target data secret).
	apiRouter.POST(S3FilePath, app.AttachNamespace(app.rejectDeclaredOversizedS3Post(app.RequireAccessToPipelineServers(app.PostS3FileHandler))))

	// Model Registry - register model binary (target registry via path param + discovered ServerURL)
	// Does NOT use AttachPipelineServerClient (which gates on a ready pipeline server and can
	// 404/503). The handler performs best-effort DSPA discovery itself via
	// injectDSPAObjectStorageIfAvailable — this only needs the DSPA spec (present regardless
	// of pipeline server readiness) to resolve bucket, endpoint, and region for the artifact URI.
	apiRouter.POST(ModelRegistryModelsPath, app.AttachNamespace(app.RequireAccessToPipelineServers(app.RegisterModelHandler)))

	// App Router
	appMux := http.NewServeMux()

	// handler for api calls — preserveRawPath ensures percent-encoded path parameters
	// (e.g., S3 keys containing %2F) are forwarded to the router without decoding,
	// so :key matches the full encoded segment rather than splitting on /.
	rawPathRouter := preserveRawPath(apiRouter)
	appMux.Handle(ApiPathPrefix+"/", rawPathRouter)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, rawPathRouter))

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
