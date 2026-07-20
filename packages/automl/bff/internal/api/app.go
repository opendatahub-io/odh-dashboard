package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"regexp"
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
	ManagedPipelinesPath    = ApiPathPrefix + "/managed-pipelines/enable"
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
	config config.EnvConfig
	logger *slog.Logger
	// k8sService provides business logic for Kubernetes operations using autox-core
	k8sService kubernetes.Service
	// rootCAs used for outbound TLS connections to Client Service
	rootCAs *x509.CertPool
	// portForwardManager manages on-demand port-forwards for local dev (nil in production)
	portForwardManager *k8s.PortForwardManager

	// Handler-composition middleware (namespace extraction, RBAC)
	mw *Middleware

	// Per-domain handler groups
	healthcheck   *HealthcheckHandler
	k8s           *K8sHandler
	s3            *S3Handler
	pipelines     *PipelinesHandler
	modelRegistry *ModelRegistryHandler
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
	if cfg.DevMode && !cfg.MockK8sClient {
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
	if cfg.MockK8sClient {
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
		pipelinesClient = fake.NewPipelinesClient()
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
		s3Client = fake.NewS3Client()
	} else {
		s3ClientCfg := s3.ClientConfig{
			RootCAs:                   rootCAs,
			InsecureSkipVerify:        cfg.InsecureSkipVerify,
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

		// Build transport wrapping chain: base → port-forward (dev only) → auth token
		var authWrapper func(http.RoundTripper) http.RoundTripper
		switch cfg.AuthMethod {
		case config.AuthMethodUser:
			authWrapper = kubernetes.NewBearerTokenRoundTripper
		case config.AuthMethodInternal:
			saWrapper, err := kubernetes.NewSATokenTransportWrapper()
			if err != nil {
				return nil, fmt.Errorf("failed to initialize SA token transport for model registry: %w", err)
			}
			authWrapper = saWrapper
		}
		mrClientCfg.WrapTransport = func(base http.RoundTripper) http.RoundTripper {
			if pfManager != nil {
				base = k8s.PortForwardWrapTransport(pfManager, logger)(base)
			}
			if authWrapper != nil {
				base = authWrapper(base)
			}
			return base
		}
		mrClient = modelregistry.NewDefaultModelRegistryClient(mrClientCfg)
	}

	app := &App{
		config:             cfg,
		logger:             logger,
		k8sService:         k8sService,
		rootCAs:            rootCAs,
		portForwardManager: pfManager,
		mw: &Middleware{
			logger:     logger,
			config:     cfg,
			k8sService: k8sService,
		},
		healthcheck: &HealthcheckHandler{
			logger: logger,
			repo:   repositories.NewHealthCheckRepository(),
		},
		k8s: &K8sHandler{
			logger:     logger,
			k8sService: k8sService,
			repo:       repositories.NewK8sRepository(),
		},
		s3: &S3Handler{
			logger: logger,
			repo:   repositories.NewS3Repository(logger, s3Service, k8sService, pipelinesService),
		},
		pipelines: &PipelinesHandler{
			logger: logger,
			repo: repositories.NewPipelinesRepository(logger, pipelinesService, repositories.PipelinesRepositoryConfig{
				TimeSeriesPipelineName: cfg.AutoMLTimeSeriesPipelineNamePrefix,
				TabularPipelineName:    cfg.AutoMLTabularPipelineNamePrefix,
			}),
		},
		modelRegistry: &ModelRegistryHandler{
			logger: logger,
			repo:   repositories.NewModelRegistryRepository(logger, mrClient, k8sService, pipelinesService),
		},
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

	apiRouter.NotFound = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		notFoundResponse(app.logger, w, r)
	})
	apiRouter.MethodNotAllowed = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		methodNotAllowedResponse(app.logger, w, r)
	})

	// Minimal Kubernetes-backed starter endpoints
	apiRouter.GET(UserPath, app.k8s.UserHandler)
	apiRouter.GET(NamespacePath, app.k8s.GetNamespacesHandler)

	// Secrets
	apiRouter.GET(SecretsPath, app.mw.AttachNamespace(app.k8s.GetSecretsHandler))

	// Pipeline Runs API endpoints (pipeline server and pipeline are auto-discovered)
	apiRouter.GET(PipelineRunsPath+"/:runId", app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.PipelineRunHandler)))
	apiRouter.GET(PipelineRunsPath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.PipelineRunsHandler)))
	apiRouter.POST(PipelineRunsPath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.CreatePipelineRunHandler)))
	apiRouter.POST(PipelineRunsPath+"/:runId/terminate", app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.TerminatePipelineRunHandler)))
	apiRouter.POST(PipelineRunsPath+"/:runId/retry", app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.RetryPipelineRunHandler)))
	apiRouter.DELETE(PipelineRunsPath+"/:runId", app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.DeletePipelineRunHandler)))

	// S3 operations — credentials resolved from explicit secretName query parameter.
	apiRouter.GET(S3FilePath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.s3.GetS3FileHandler)))
	apiRouter.GET(S3FilesPath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.s3.GetS3FilesHandler)))
	// POST /s3/files/:key: secretName is required; there is no DSPA fallback.
	apiRouter.POST(S3FilePath, app.mw.AttachNamespace(app.s3.rejectDeclaredOversizedS3Post(app.mw.RequireAccessToService(app.s3.PostS3FileHandler))))

	// Model Registry discovery — CRs are namespace-scoped within rhoai-model-registries
	// but presented as global in the RHOAI UX; no user-supplied namespace parameter needed.
	apiRouter.GET(ModelRegistriesPath, app.modelRegistry.GetModelRegistriesHandler)

	// Managed pipelines — enable AutoML pipeline definitions on an existing DSPA
	apiRouter.POST(ManagedPipelinesPath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.pipelines.EnableManagedPipelinesHandler)))
	// Model Registry - register model binary (target registry via path param + discovered ServerURL)
	apiRouter.POST(ModelRegistryModelsPath, app.mw.AttachNamespace(app.mw.RequireAccessToService(app.modelRegistry.RegisterModelHandler)))

	// App Router
	appMux := http.NewServeMux()

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

	// Create identity middleware using autox-core — applied to API routes only
	injectRequestIdentity := kubernetes.InjectRequestIdentity(kubernetes.InjectRequestIdentityConfig{
		Extractor: identityExtractor,
		OnError: func(w http.ResponseWriter, r *http.Request, err error) {
			badRequestResponse(app.logger, w, r, err.Error())
		},
		ContextKey: constants.RequestIdentityKey,
	})

	// handler for api calls — preserveRawPath ensures percent-encoded path parameters
	// (e.g., S3 keys containing %2F) are forwarded to the router without decoding,
	// so :key matches the full encoded segment rather than splitting on /.
	authedAPI := injectRequestIdentity(preserveRawPath(apiRouter))
	appMux.Handle(ApiPathPrefix+"/", authedAPI)
	appMux.Handle(PathPrefix+ApiPathPrefix+"/", http.StripPrefix(PathPrefix, authedAPI))

	// file server for the frontend files and SPA routes (no auth required)
	staticDir := http.Dir(app.config.StaticAssetsDir)
	fileServer := http.FileServer(staticDir)
	appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ctxLogger := helper.GetContextLoggerFromReq(r)
		// Check if the requested file exists
		if f, err := staticDir.Open(r.URL.Path); err == nil {
			f.Close()
			ctxLogger.Debug("Serving static file", slog.String("path", r.URL.Path))
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
	healthcheckRouter.GET(HealthCheckPath, app.healthcheck.HealthcheckHandler)
	healthcheckMux.Handle(HealthCheckPath, app.RecoverPanic(app.EnableTelemetry(healthcheckRouter)))

	// Combines the healthcheck endpoint with the rest of the routes
	combinedMux := http.NewServeMux()
	combinedMux.Handle(HealthCheckPath, healthcheckMux)
	combinedMux.Handle("/", app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(appMux))))

	return combinedMux
}
