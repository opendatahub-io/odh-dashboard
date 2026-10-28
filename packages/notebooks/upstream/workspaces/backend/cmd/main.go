/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strconv"

	"k8s.io/apiserver/pkg/authentication/authenticator"
	"k8s.io/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"

	tlsprofile "github.com/kubeflow/notebooks/workspaces/controller/pkg/tls"

	application "github.com/kubeflow/notebooks/workspaces/backend/api"
	"github.com/kubeflow/notebooks/workspaces/backend/internal/auth"
	"github.com/kubeflow/notebooks/workspaces/backend/internal/config"
	"github.com/kubeflow/notebooks/workspaces/backend/internal/helper"
	"github.com/kubeflow/notebooks/workspaces/backend/internal/server"
	"github.com/kubeflow/notebooks/workspaces/backend/openapi"
)

// legacyTLSConfig is the notebooks backend's historical HTTPS policy (TLS 1.3
// minimum). It is preserved under Legacy/unset cluster TLS adherence so an
// upgrade does not weaken an existing listener to a lower cluster profile.
func legacyTLSConfig() *tls.Config {
	return &tls.Config{MinVersion: tls.VersionTLS13}
}

// adherenceIsStrict reports whether the cluster TLS adherence policy requires all
// components to adopt the cluster profile. Empty (unset/unreadable) and
// LegacyAdheringComponentsOnly are non-strict; StrictAllComponents and any unknown
// value are treated as strict for forward compatibility.
func adherenceIsStrict(adherence string) bool {
	return adherence != "" && adherence != tlsprofile.AdherenceLegacy
}

// effectiveServerTLSConfig derives the HTTPS listener configuration from a resolved
// cluster result, honoring the cluster TLS adherence policy (RHOAIENG-96984).
//
//   - Degraded result: the cluster policy (both profile AND adherence, which share
//     one APIServer read) could not be authoritatively resolved — a denied/transient
//     read or a malformed profile. Return an error rather than guess the adherence:
//     at startup the caller fails closed; on reload the watcher callback propagates
//     the error so it keeps the running configuration and retries (no silent fail-open
//     to TLS 1.3 and no lost policy update once the API recovers).
//   - Strict adherence (clean read): adopt the resolved cluster profile.
//   - Legacy/unset adherence (clean read): preserve the backend's historical TLS 1.3
//     minimum instead of downgrading to the (possibly weaker) cluster profile.
func effectiveServerTLSConfig(result tlsprofile.Result) (*tls.Config, error) {
	if result.Degraded {
		return nil, fmt.Errorf("cluster TLS policy could not be authoritatively resolved (degraded); refusing to apply an unverified configuration")
	}
	if adherenceIsStrict(result.Adherence) {
		cfg := &tls.Config{}
		for _, opt := range result.TLSOpts {
			opt(cfg)
		}
		return cfg, nil
	}
	return legacyTLSConfig(), nil
}

//	@title			Kubeflow Notebooks API
//	@version		1.0.0
//	@description	This API provides endpoints to manage notebooks in a Kubernetes cluster.
//	@description	For more information, visit https://www.kubeflow.org/docs/components/notebooks/

//	@license.name	Apache 2.0
//	@license.url	http://www.apache.org/licenses/LICENSE-2.0.html

//	@host		localhost:4000
//	@BasePath	/api/v1

//	@schemes	http https
//	@consumes	application/json
//	@produces	application/json

// NOTE: the security definition for the user id header is not declared here, but injected at
//       runtime by the Swagger UI handler (see `api/swagger_handler.go`), because the name of
//       the header is configurable with the `--userid-header` flag.

func main() {
	os.Exit(run())
}

// run returns the process exit status. It is a named return so the deferred
// envtest cleanup below can surface a stop failure as a non-zero exit code
// even though the server already returned successfully.
func run() (status int) {
	// Define command line flags
	cfg := &config.EnvConfig{}
	var certFile, keyFile string
	flag.IntVar(&cfg.Port,
		"port",
		getEnvAsInt("PORT", 4000),
		"API server port",
	)
	flag.Float64Var(
		&cfg.ClientQPS,
		"client-qps",
		getEnvAsFloat64("CLIENT_QPS", 50),
		"QPS configuration passed to rest.Client",
	)
	flag.IntVar(
		&cfg.ClientBurst,
		"client-burst",
		getEnvAsInt("CLIENT_BURST", 100),
		"Maximum Burst configuration passed to rest.Client",
	)
	// ODH Dashboard contract-test harness flags (RHOAIENG-58841); see odh_contract_harness.go.
	odhFlags := registerODHContractHarnessFlags(cfg)
	flag.StringVar(
		&cfg.AuthMethod,
		"auth-method",
		getEnvAsStr("AUTH_METHOD", "internal"),
		"Method used to resolve the request identity: \"internal\" (kubeflow-userid/kubeflow-groups "+
			"request headers) or \"user_token\" (Authorization: Bearer token, validated via TokenReview)",
	)
	flag.StringVar(
		&cfg.AuthTokenHeader,
		"auth-token-header",
		getEnvAsStr("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader),
		"Header used to extract the token when --auth-method=user_token (e.g. Authorization or x-forwarded-access-token)",
	)
	flag.StringVar(
		&cfg.AuthTokenPrefix,
		"auth-token-prefix",
		getEnvAsStr("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix),
		`Prefix stripped from the auth token header's value when --auth-method=user_token (e.g. \"Bearer \");
		leave empty for a raw token`,
	)
	flag.BoolVar(
		// TODO: remove before GA
		&cfg.DisableAuth,
		"disable-auth",
		getEnvAsBool("DISABLE_AUTH", true),
		"Disable authentication and authorization",
	)
	flag.StringVar(
		&cfg.UserIdHeader,
		"userid-header",
		getEnvAsStr("USERID_HEADER", "kubeflow-userid"),
		"Key of request header containing user id",
	)
	flag.StringVar(
		&cfg.UserIdPrefix,
		"userid-prefix",
		getEnvAsStr("USERID_PREFIX", ":"),
		"Request header user id common prefix",
	)
	flag.StringVar(
		&cfg.GroupsHeader,
		"groups-header",
		getEnvAsStr("GROUPS_HEADER", "kubeflow-groups"),
		"Key of request header containing user groups",
	)
	flag.StringVar(
		&cfg.ProxyUrlPrefix,
		"proxy-url-prefix",
		getEnvAsStr("PROXY_URL_PREFIX", ""),
		"For if this service is behind a reverse proxy which rewrites URL paths. "+
			"Prefix is prepended to absolute URLs returned by this service (e.g. asset URLs for icons/logos).",
	)
	flag.BoolVar(
		&cfg.SwaggerEnabled,
		"swagger-enabled",
		getEnvAsBool("SWAGGER_ENABLED", false),
		"Enable the Swagger UI",
	)
	flag.StringVar(
		&cfg.SwaggerHost,
		"swagger-host",
		getEnvAsStr("SWAGGER_HOST", "localhost:4000"),
		"Host used in the Swagger UI (e.g. localhost:4000)",
	)
	flag.StringVar(
		&cfg.SwaggerBasePath,
		"swagger-base-path",
		getEnvAsStr("SWAGGER_BASE_PATH", "/api/v1"),
		"Base path used in the Swagger UI",
	)
	flag.StringVar(
		&cfg.SwaggerScheme,
		"swagger-scheme",
		getEnvAsStr("SWAGGER_SCHEME", "http"),
		"Scheme used in the Swagger UI (http or https)",
	)

	flag.StringVar(
		&cfg.StaticAssetsDir,
		"static-assets-dir",
		getEnvAsStr("STATIC_ASSETS_DIR", "/static"),
		"Directory containing frontend static assets",
	)
	flag.StringVar(&certFile, "cert-file", getEnvAsStr("CERT_FILE", ""), "Path to TLS certificate file")
	flag.StringVar(&keyFile, "key-file", getEnvAsStr("KEY_FILE", ""), "Path to TLS key file")

	flag.Parse()

	// Override Swagger metadata with runtime config (must be after flag.Parse)
	if cfg.SwaggerEnabled {
		openapi.SwaggerInfo.Host = cfg.SwaggerHost
		openapi.SwaggerInfo.BasePath = cfg.SwaggerBasePath
		openapi.SwaggerInfo.Schemes = []string{cfg.SwaggerScheme}
	}

	// Initialize the logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	odhFlags.warn(logger)

	kubeconfig, stopMockK8s, err := resolveKubeconfig(cfg, logger)
	if err != nil {
		logger.Error(err.Error())
		return 1
	}
	defer deferMockK8sStop(stopMockK8s, &status, logger)
	kubeconfig.QPS = float32(cfg.ClientQPS)
	kubeconfig.Burst = cfg.ClientBurst

	// Build the Kubernetes scheme
	scheme, err := helper.BuildScheme()
	if err != nil {
		logger.Error("failed to build Kubernetes scheme", "error", err)
		return 1
	}

	// Create the controller manager
	mgr, err := helper.NewManager(kubeconfig, scheme)
	if err != nil {
		logger.Error("unable to create manager", "error", err)
		return 1
	}

	clientset, err := kubernetes.NewForConfig(kubeconfig)
	if err != nil {
		logger.Error("failed to create Kubernetes clientset", "error", err)
		return 1
	}

	// Create the request authenticator
	var reqAuthN authenticator.Request
	switch cfg.AuthMethod {
	case "user_token":
		reqAuthN, err = auth.NewBearerTokenAuthenticator(
			clientset.AuthenticationV1().TokenReviews(),
			cfg.AuthTokenHeader,
			cfg.AuthTokenPrefix,
		)
	case "internal":
		reqAuthN, err = auth.NewRequestAuthenticator(cfg.UserIdHeader, cfg.UserIdPrefix, cfg.GroupsHeader)
	default:
		err = fmt.Errorf("unsupported auth method %q: must be \"internal\" or \"user_token\"", cfg.AuthMethod)
	}
	if err != nil {
		logger.Error("failed to create request authenticator", "error", err)
		return 1
	}

	// Create the request authorizer
	reqAuthZ, err := auth.NewRequestAuthorizer(mgr.GetConfig(), mgr.GetHTTPClient())
	if err != nil {
		logger.Error("failed to create request authorizer", "error", err)
		return 1
	}

	// Create a filtered cache client for ConfigMaps with the label 'notebooks.kubeflow.org/image-source=true'
	imageSourceConfigMapClient, err := helper.BuildImageSourceConfigMapClient(mgr)
	if err != nil {
		logger.Error("failed to create 'notebooks.kubeflow.org/image-source=true' label "+
			"filtered ConfigMap client", "error", err)
		return 1
	}

	// Create the application and server
	app, err := application.NewApp(
		cfg,
		logger,
		mgr.GetClient(),
		imageSourceConfigMapClient,
		mgr.GetScheme(),
		reqAuthN,
		reqAuthZ,
		clientset,
	)
	if err != nil {
		logger.Error("failed to create app", "error", err)
		return 1
	}
	// Resolve the HTTPS listener TLS configuration from the cluster TLS profile and
	// adherence policy (replaces the previously hardcoded TLS 1.3). Only when TLS
	// is enabled.
	var serverTLSConfig *tls.Config
	var initialTLSResult tlsprofile.Result
	tlsEnabled := certFile != "" && keyFile != ""
	if tlsEnabled {
		initialTLSResult, err = tlsprofile.Resolve(context.Background(), kubeconfig)
		if err != nil {
			logger.Error("failed to resolve cluster TLS profile", "error", err)
			return 1
		}
		serverTLSConfig, err = effectiveServerTLSConfig(initialTLSResult)
		if err != nil {
			logger.Error("failed to determine HTTPS listener TLS configuration", "error", err)
			return 1
		}
	}

	svr, err := server.NewServer(app, logger, certFile, keyFile, serverTLSConfig)
	if err != nil {
		logger.Error("failed to create server", "error", err)
		return 1
	}
	if err := svr.SetupWithManager(mgr); err != nil {
		logger.Error("failed to setup server with manager", "error", err)
		return 1
	}

	// Watch the cluster TLS profile and adherence policy, and gracefully restart
	// the HTTPS listener when either changes, so policy updates apply without a pod
	// restart. Only register the watcher on OpenShift clusters where the APIServer
	// config API exists; on plain Kubernetes it is absent and the controller would fail.
	if tlsEnabled && initialTLSResult.APIAvailable {
		watcher := &tlsprofile.ProfileWatcher{
			Client:           mgr.GetClient(),
			InitialProfile:   initialTLSResult.Profile,
			InitialAdherence: initialTLSResult.Adherence,
			OnProfileChange: func(ctx context.Context) error {
				result, resolveErr := tlsprofile.Resolve(ctx, kubeconfig)
				if resolveErr != nil {
					// Keep the running configuration and let the watcher retry
					// rather than downgrading on a transient/denied re-read.
					logger.Error("failed to re-resolve TLS profile on change; keeping current configuration and retrying", "error", resolveErr)
					return resolveErr
				}
				newCfg, cfgErr := effectiveServerTLSConfig(result)
				if cfgErr != nil {
					logger.Error("failed to determine new HTTPS listener TLS configuration; keeping current and retrying", "error", cfgErr)
					return cfgErr
				}
				logger.Info("cluster TLS profile/adherence changed, reloading HTTPS listener")
				svr.ReloadTLSConfig(newCfg)
				return nil
			},
		}
		if err := watcher.SetupWithManager(mgr); err != nil {
			logger.Error("failed to setup TLS profile watcher", "error", err)
			return 1
		}
	}

	// Start the controller manager
	logger.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		logger.Error("problem running manager", "error", err)
		return 1
	}
	return 0
}

func getEnvAsInt(name string, defaultVal int) int {
	if value, exists := os.LookupEnv(name); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultVal
}

func getEnvAsFloat64(name string, defaultVal float64) float64 {
	if value, exists := os.LookupEnv(name); exists {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultVal
}

func getEnvAsStr(name string, defaultVal string) string {
	if value, exists := os.LookupEnv(name); exists {
		return value
	}
	return defaultVal
}

func getEnvAsBool(name string, defaultVal bool) bool {
	if value, exists := os.LookupEnv(name); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultVal
}
