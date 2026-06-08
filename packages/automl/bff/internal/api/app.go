package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"

	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	k8sclient "k8s.io/client-go/kubernetes"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"

	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/fake"
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

type App struct {
	config       config.EnvConfig
	logger       *slog.Logger
	repositories *repositories.Repositories
	// k8sService provides business logic for Kubernetes operations using autox-core
	k8sService kubernetes.Service
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
			clientset, csErr := k8sclient.NewForConfig(restCfg)
			if csErr != nil {
				logger.Warn("could not initialize dynamic port-forwarding", "error", csErr)
			} else {
				pfManager = k8s.NewPortForwardManager(restCfg, clientset, logger)
				logger.Info("dynamic port-forwarding enabled — in-cluster URLs will be forwarded to localhost")
			}
		}
	}

	// Create autox-core Kubernetes client and service.
	var k8sClient kubernetes.Client
	if cfg.MockK8Client {
		k8sClient = &fake.K8sClient{}
	} else {
		if cfg.AuthMethod == config.AuthMethodUser {
			k8sClient, err = kubernetes.NewDefaultTokenClient()
		} else {
			k8sClient, err = kubernetes.NewDefaultInternalClient()
		}
		if err != nil {
			return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
		}
	}
	k8sService := kubernetes.NewService(kubernetes.ServiceConfig{Logger: logger}, k8sClient)

	// Create autox-core Pipelines client and service.
	var pipelinesClient pipelines.Client
	if cfg.MockPipelineServerClient {
		pipelinesClient = &fake.PipelinesClient{}
	} else {
		pipelinesCfg := pipelines.ClientConfig{
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			RootCAs:            rootCAs,
		}
		if pfManager != nil {
			pipelinesCfg.WrapTransport = k8s.PortForwardWrapTransport(pfManager, logger)
		}
		pipelinesClient = pipelines.NewDefaultClient(pipelinesCfg)
	}
	pipelinesService := pipelines.NewService(pipelines.ServiceConfig{
		Logger: logger,
	}, pipelinesClient, k8sService)

	// Initialize autox-core S3 client and service.
	// SECURITY: AllowUnresolvableEndpoint requires DevMode — autox-core applies these knobs
	// without policy judgement, so we enforce the guard here before constructing the client.
	const envAllowUnresolvedS3Endpoints = "ALLOW_UNRESOLVED_S3_ENDPOINTS"
	allowUnresolvedS3 := os.Getenv(envAllowUnresolvedS3Endpoints) == "true"
	if !cfg.DevMode && allowUnresolvedS3 {
		logger.Error("ALLOW_UNRESOLVED_S3_ENDPOINTS is set but DevMode is false — this weakens SSRF protection and must not be used in production")
		os.Exit(1)
	}
	var s3Client s3.Client
	if cfg.MockS3Client {
		s3Client = &fake.S3Client{}
	} else {
		s3ClientCfg := s3.ClientConfig{
			RootCAs:                 rootCAs,
			InsecureSkipVerify:      cfg.InsecureSkipVerify && cfg.DevMode,
			AllowUnresolvableEndpoint: cfg.DevMode && allowUnresolvedS3,
		}
		if pfManager != nil {
			s3ClientCfg.WrapTransport = k8s.PortForwardWrapTransport(pfManager, logger)
		}
		s3Client = s3.NewDefaultClient(s3ClientCfg)
	}
	s3Service := s3.NewService(s3.ServiceConfig{Logger: logger}, s3Client)

	// Initialize Model Registry client (single shared stateless instance).
	var mrClient modelregistry.ModelRegistryClientInterface
	if cfg.MockModelRegistryClient {
		mrClient = &fake.ModelRegistryClient{}
	} else {
		mrClientCfg := modelregistry.ModelRegistryClientConfig{
			InsecureSkipVerify: cfg.InsecureSkipVerify,
			RootCAs:            rootCAs,
		}
		switch cfg.AuthMethod {
		case config.AuthMethodUser:
			mrClientCfg.WrapTransport = kubernetes.NewBearerTokenRoundTripper
		case config.AuthMethodInternal:
			saWrapper, err := kubernetes.NewSATokenTransportWrapper()
			if err != nil {
				return nil, fmt.Errorf("failed to initialize SA token transport for model registry: %w", err)
			}
			mrClientCfg.WrapTransport = saWrapper
		}
		mrClient = modelregistry.NewDefaultModelRegistryClient(mrClientCfg)
	}

	app := &App{
		config: cfg,
		logger: logger,
		repositories: repositories.NewRepositories(repositories.RepositoriesConfig{
			K8sService:       k8sService,
			PipelinesService: pipelinesService,
			PipelinesCfg: repositories.PipelinesRepositoryConfig{
				TimeSeriesPipelineName: cfg.AutoMLTimeSeriesPipelineNamePrefix,
				TabularPipelineName:    cfg.AutoMLTabularPipelineNamePrefix,
			},
			S3Service:           s3Service,
			ModelRegistryClient: mrClient,
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

	// Pipeline Runs API endpoints (pipeline server and pipeline are auto-discovered)
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

	// Model Registry discovery — CRs are namespace-scoped within rhoai-model-registries
	// but presented as global in the RHOAI UX; no user-supplied namespace parameter needed.
	apiRouter.GET(ModelRegistriesPath, app.GetModelRegistriesHandler)
	// Model Registry - register model binary (target registry via path param + discovered ServerURL)
	apiRouter.POST(ModelRegistryModelsPath, app.AttachNamespace(app.RequireAccessToService(app.RegisterModelHandler)))

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
	var identityExtractor kubernetes.IdentityExtractor
	switch app.config.AuthMethod {
	case config.AuthMethodDisabled:
		identityExtractor = &fake.IdentityExtractor{}
	case config.AuthMethodInternal:
		identityExtractor = &kubernetes.KubeflowHeaderExtractor{
			UserIDHeader:     constants.KubeflowUserIDHeader,
			UserGroupsHeader: constants.KubeflowUserGroupsIdHeader,
		}
	case config.AuthMethodUser:
		identityExtractor = &kubernetes.TokenHeaderExtractor{
			Header: app.config.AuthTokenHeader,
			Prefix: app.config.AuthTokenPrefix,
		}
	}

	// Create identity middleware using autox-core
	injectRequestIdentity := kubernetes.InjectRequestIdentity(kubernetes.InjectRequestIdentityConfig{
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
