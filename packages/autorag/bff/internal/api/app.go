package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx/ogxmocks"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corek8smocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes/mocks"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	corepipelinesmocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines/mocks"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	cores3mocks "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3/mocks"
	"k8s.io/client-go/kubernetes"

	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"

	"github.com/julienschmidt/httprouter"
)

const (
	Version             = "1.0.0"
	PathPrefix          = "/autorag"
	ApiPathPrefix       = "/api/v1"
	HealthCheckPath     = "/healthcheck"
	UserPath            = ApiPathPrefix + "/user"
	NamespacePath       = ApiPathPrefix + "/namespaces"
	SecretsPath         = ApiPathPrefix + "/secrets"
	S3FilePath          = ApiPathPrefix + "/s3/files/:key"
	S3FilesPath         = ApiPathPrefix + "/s3/files"
	OGXModelsPath       = ApiPathPrefix + "/ogx/models"
	OGXVectorStoresPath = ApiPathPrefix + "/ogx/vector-stores"
	PipelineRunsPath    = ApiPathPrefix + "/pipeline-runs"
)

type App struct {
	config       config.EnvConfig
	logger       *slog.Logger
	repositories *repositories.Repositories
	// k8sService provides business logic for Kubernetes operations using autox-core
	k8sService *corek8s.K8sService
	// s3PostMaxFilePartBytes is for package api tests only (see PostS3FileHandler).
	s3PostMaxFilePartBytes int64
	// s3PostMaxRequestBodyBytes caps total POST body in tests (0 = file max + multipart envelope).
	s3PostMaxRequestBodyBytes int64
	// s3PostMaxCollisionAttempts limits HeadObject-based key suffix attempts in tests (0 = default cap).
	s3PostMaxCollisionAttempts int
	// rootCAs used for outbound TLS connections to Client Service
	rootCAs *x509.CertPool
	// portForwardManager manages on-demand port-forwards for local dev (nil in production)
	portForwardManager *k8s.PortForwardManager
}

func NewApp(cfg config.EnvConfig, logger *slog.Logger) (*App, error) {
	logger.Debug("Initializing app with config", slog.Any("config", cfg))
	var err error
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

	// Create autox-core Kubernetes client and service.
	var k8sClient corek8s.K8sClientInterface
	if cfg.MockK8Client {
		k8sClient = &corek8smocks.MockK8sClient{}
	} else {
		if cfg.AuthMethod == config.AuthMethodUser {
			k8sClient, err = corek8s.NewDefaultK8sTokenClient()
		} else {
			k8sClient, err = corek8s.NewDefaultK8sInternalClient()
		}
		if err != nil {
			return nil, fmt.Errorf("failed to create autox-core Kubernetes client: %w", err)
		}
	}
	k8sService := corek8s.NewK8sService(corek8s.K8sServiceConfig{Logger: logger}, k8sClient)

	// Create autox-core Pipelines client and service.
	var pipelinesClient corepipelines.PipelinesClientInterface
	if cfg.MockPipelineServerClient {
		pipelinesClient = &corepipelinesmocks.MockPipelinesClient{}
	} else {
		pipelinesCfg := corepipelines.PipelinesClientConfig{
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			RootCAs:            rootCAs,
		}
		if pfManager != nil {
			pipelinesCfg.WrapTransport = k8s.PortForwardWrapTransport(pfManager, logger)
		}
		pipelinesClient = corepipelines.NewDefaultPipelinesClient(pipelinesCfg)
	}
	pipelinesService := corepipelines.NewPipelinesService(corepipelines.PipelinesServiceConfig{
		Logger: logger,
	}, pipelinesClient, k8sService)

	// Initialize autox-core S3 client and service.
	const envAllowUnresolvedS3Endpoints = "ALLOW_UNRESOLVED_S3_ENDPOINTS"
	allowUnresolvedS3 := os.Getenv(envAllowUnresolvedS3Endpoints) == "true"
	if !cfg.DevMode && allowUnresolvedS3 {
		logger.Error("ALLOW_UNRESOLVED_S3_ENDPOINTS is set but DevMode is false — this weakens SSRF protection and must not be used in production")
		os.Exit(1)
	}
	s3ClientCfg := cores3.S3ClientConfig{
		RootCAs:                 rootCAs,
		InsecureSkipVerify:      cfg.InsecureSkipVerify && cfg.DevMode,
		AllowUnresolvedEndpoint: cfg.DevMode && allowUnresolvedS3,
	}
	if pfManager != nil {
		s3ClientCfg.WrapTransport = k8s.PortForwardWrapTransport(pfManager, logger)
	}
	var s3Client cores3.S3ClientInterface
	if cfg.MockS3Client {
		s3Client = cores3.NewS3Client(&cores3mocks.MockS3Provider{})
	} else {
		s3Client = cores3.NewDefaultS3Client(s3ClientCfg)
	}
	s3Service := cores3.NewS3Service(cores3.S3ServiceConfig{Logger: logger}, s3Client)

	// Initialize Open GenAI Stack client (single shared instance).
	var ogxClient ogx.OGXClientInterface
	if cfg.MockOGXClient {
		ogxClient = ogxmocks.NewMockOGXClient()
	} else {
		ogxCfg := ogx.OGXClientConfig{
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			RootCAs:            rootCAs,
		}
		if pfManager != nil {
			ogxCfg.WrapTransport = k8s.PortForwardWrapTransport(pfManager, logger)
		}
		ogxClient = ogx.NewDefaultOGXClient(ogxCfg)
	}

	app := &App{
		config: cfg,
		logger: logger,
		repositories: repositories.NewRepositories(repositories.RepositoriesConfig{
			K8sService:       k8sService,
			PipelinesService: pipelinesService,
			PipelinesCfg: repositories.PipelinesRepositoryConfig{
				AutoRAGPipelineName: cfg.AutoRAGPipelineNamePrefix,
			},
			S3Service: s3Service,
			OGXClient: ogxClient,
		}),
		k8sService:         k8sService,
		rootCAs:            rootCAs,
		portForwardManager: pfManager,
	}
	return app, nil
}

func (app *App) Shutdown() error {
	app.logger.Info("shutting down app...")
	if app.portForwardManager != nil {
		app.portForwardManager.Close()
	}
	return nil
}

func (app *App) Routes() http.Handler {
	// Router for /api/v1/*
	apiRouter := httprouter.New()

	apiRouter.NotFound = http.HandlerFunc(app.notFoundResponse)
	apiRouter.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.UserHandler)
	apiRouter.GET(NamespacePath, app.GetNamespacesHandler)

	// Secrets
	apiRouter.GET(SecretsPath, app.AttachNamespace(app.GetSecretsHandler))

	// Pipeline Runs API endpoints (pipeline server is auto-discovered)
	apiRouter.GET(PipelineRunsPath+"/:runId", app.AttachNamespace(app.RequireAccessToService(app.PipelineRunHandler)))
	apiRouter.GET(PipelineRunsPath, app.AttachNamespace(app.RequireAccessToService(app.PipelineRunsHandler)))
	apiRouter.POST(PipelineRunsPath, app.AttachNamespace(app.RequireAccessToService(app.CreatePipelineRunHandler)))
	apiRouter.POST(PipelineRunsPath+"/:runId/terminate", app.AttachNamespace(app.RequireAccessToService(app.TerminatePipelineRunHandler)))
	apiRouter.POST(PipelineRunsPath+"/:runId/retry", app.AttachNamespace(app.RequireAccessToService(app.RetryPipelineRunHandler)))
	apiRouter.DELETE(PipelineRunsPath+"/:runId", app.AttachNamespace(app.RequireAccessToService(app.DeletePipelineRunHandler)))

	// S3 operations — credentials resolved from explicit secretName query parameter.
	apiRouter.GET(S3FilePath, app.AttachNamespace(app.RequireAccessToService(app.GetS3FileHandler)))
	apiRouter.GET(S3FilesPath, app.AttachNamespace(app.RequireAccessToService(app.GetS3FilesHandler)))
	// POST /s3/files/:key: secretName is required; there is no DSPA fallback.
	apiRouter.POST(S3FilePath, app.AttachNamespace(app.rejectDeclaredOversizedS3Post(app.RequireAccessToService(app.PostS3FileHandler))))

	// Open GenAI Stack — credentials are resolved by the repository from the secretName query param
	apiRouter.GET(OGXModelsPath, app.AttachNamespace(app.RequireAccessToService(app.OGXModelsHandler)))
	apiRouter.GET(OGXVectorStoresPath, app.AttachNamespace(app.RequireAccessToService(app.OGXVectorStoresHandler)))

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

	// Create identity extractor based on auth method
	identityExtractor, err := corek8s.NewIdentityExtractor(
		app.config.AuthMethod,
		app.config.AuthTokenHeader,
		app.config.AuthTokenPrefix,
		constants.KubeflowUserIDHeader,
		constants.KubeflowUserGroupsIdHeader,
	)
	if err != nil {
		panic(fmt.Sprintf("failed to create identity extractor: %v", err))
	}

	// Create identity middleware using autox-core
	injectRequestIdentity := corek8s.InjectRequestIdentity(corek8s.InjectRequestIdentityConfig{
		Extractor:  identityExtractor,
		OnError:    app.badRequestResponse,
		ContextKey: constants.RequestIdentityKey,
	})

	// Combines the healthcheck endpoint with the rest of the routes
	// Apply middleware to appMux which contains the API routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(injectRequestIdentity(appMux)))))

	return combinedMux
}
