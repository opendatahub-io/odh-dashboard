package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os/signal"
	"syscall"

	"github.com/opendatahub-io/data-registry/bff/internal/api"
	"github.com/opendatahub-io/data-registry/bff/internal/config"
	tlsprofile "github.com/opendatahub-io/odh-dashboard/pkg/tls"

	"log/slog"
	"net/http"
	"os"
	"time"
)

func main() {
	var cfg config.EnvConfig
	var certFile, keyFile string

	flag.IntVar(&cfg.Port, "port", getEnvAsInt("PORT", 4000), "API server port")
	flag.StringVar(&certFile, "cert-file", "", "Path to TLS certificate file")
	flag.StringVar(&keyFile, "key-file", "", "Path to TLS key file")
	flag.BoolVar(&cfg.MockK8Client, "mock-k8s-client", false, "Use mock Kubernetes client")
	flag.BoolVar(&cfg.MockHTTPClient, "mock-http-client", false, "Use mock HTTP client")
	registerDevModeFlag(flag.CommandLine, &cfg.DevMode)
	flag.IntVar(&cfg.DevModeClientPort, "dev-mode-client-port", getEnvAsInt("DEV_MODE_CLIENT_PORT", 8080), "Use port when in development mode for client")

	// New deployment mode flag
	flag.Var(&cfg.DeploymentMode, "deployment-mode", "Deployment mode (federated or standalone)")

	flag.StringVar(&cfg.StaticAssetsDir, "static-assets-dir", "./static", "Configure frontend static assets root directory")
	flag.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "INFO")), "Sets server log level, possible values: error, warn, info, debug")
	flag.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none", newOriginParser(&cfg.AllowedOrigins, getEnvAsString("ALLOWED_ORIGINS", "")))
	// bundle-paths accepts a comma-separated list of CA bundle file paths to trust for outbound TLS.
	// If not provided via flag, it can be set via BUNDLE_PATHS env var (comma-separated). Defaults to empty.
	defaultBundlePaths := getEnvAsString("BUNDLE_PATHS", "")
	flag.Func("bundle-paths", "Comma-separated list of PEM CA bundle file paths to trust for outbound TLS (optional)", newOriginParser(&cfg.BundlePaths, defaultBundlePaths))
	flag.StringVar(&cfg.AuthMethod, "auth-method", config.AuthMethodUser, "Authentication method (user_token only)")
	flag.StringVar(&cfg.AuthTokenHeader, "auth-token-header", getEnvAsString("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader), "Header used to extract the token (e.g., Authorization)")
	flag.StringVar(&cfg.AuthTokenPrefix, "auth-token-prefix", getEnvAsString("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix), "Prefix used in the token header (e.g., 'Bearer ')")

	// TLS configuration flags
	flag.BoolVar(&cfg.InsecureSkipVerify, "insecure-skip-verify", getEnvAsBool("INSECURE_SKIP_VERIFY", false), "Skip TLS certificate verification (useful for development, default: false)")

	// ─── BFF Inter-Communication ─────────────────────────────────
	flag.BoolVar(&cfg.MockBFFClients, "mock-bff-clients",
		getEnvAsBool("MOCK_BFF_CLIENTS", false),
		"Enable mock BFF clients (no real HTTP calls to other BFFs)")
	flag.BoolVar(&cfg.BFFClientsAllowInsecureHTTP, "bff-clients-allow-insecure-http",
		getEnvAsBool("BFF_CLIENTS_ALLOW_INSECURE_HTTP", false),
		"Allow plaintext HTTP for inter-BFF clients in development only; forwarded bearer tokens are exposed")

	// ─── Data Registry API ────────────────────────────────────────
	flag.StringVar(&cfg.BFFDCHServiceName, "bff-dch-service-name", getEnvAsString("BFF_DCH_SERVICE_NAME", ""), "DCH BFF service name; empty disables DCH")
	flag.StringVar(&cfg.BFFDCHServiceNamespace, "bff-dch-service-namespace", getEnvAsString("BFF_DCH_SERVICE_NAMESPACE", ""), "DCH BFF namespace; defaults to this pod's namespace")
	flag.IntVar(&cfg.BFFDCHServicePort, "bff-dch-service-port", getEnvAsInt("BFF_DCH_SERVICE_PORT", 9243), "DCH BFF service port")
	flag.BoolVar(&cfg.BFFDCHTLSEnabled, "bff-dch-tls-enabled", getEnvAsBool("BFF_DCH_TLS_ENABLED", true), "Use HTTPS for the DCH BFF; disabling TLS requires DEV_MODE=true")
	flag.StringVar(&cfg.BFFDCHAuthTokenHeader, "bff-dch-auth-token-header", getEnvAsString("BFF_DCH_AUTH_TOKEN_HEADER", "x-forwarded-access-token"), "User-token header expected by the DCH BFF")
	flag.StringVar(&cfg.BFFDCHAuthTokenPrefix, "bff-dch-auth-token-prefix", getEnvAsString("BFF_DCH_AUTH_TOKEN_PREFIX", ""), "User-token prefix expected by the DCH BFF")
	flag.StringVar(&cfg.BFFDCHDevURL, "bff-dch-dev-url", getEnvAsString("BFF_DCH_DEV_URL", ""), "Local DCH BFF URL override, including /api/v1")
	flag.IntVar(&cfg.BFFDCHTimeoutSeconds, "bff-dch-timeout-seconds", getEnvAsInt("BFF_DCH_TIMEOUT_SECONDS", 5), "Deadline for both DCH lookups, before Secret fallback")

	flag.StringVar(&cfg.DataRegistryAPIURL, "data-registry-api-url", getEnvAsString("DATA_REGISTRY_API_URL", ""),
		"HTTPS base URL of the upstream Data Registry API (HTTP is allowed only for loopback IP dev/test targets). Overrides the ConfigMap lookup when set")
	flag.StringVar(&cfg.DataRegistryConfigMapName, "data-registry-configmap-name", getEnvAsString("DATA_REGISTRY_CONFIGMAP_NAME", config.DefaultDataRegistryConfigMapName),
		"Name of the ConfigMap (in the pod's namespace) holding the Data Registry API URL")
	flag.StringVar(&cfg.DataRegistryConfigMapKey, "data-registry-configmap-key", getEnvAsString("DATA_REGISTRY_CONFIGMAP_KEY", config.DefaultDataRegistryConfigMapKey),
		"Key within the Data Registry ConfigMap holding the API URL")

	// Deprecated flags - kept for backward compatibility
	flag.BoolVar(&cfg.StandaloneMode, "standalone-mode", false, "DEPRECATED: Use -deployment-mode=standalone instead")
	flag.BoolVar(&cfg.FederatedPlatform, "federated-platform", false, "DEPRECATED: Use -deployment-mode=federated instead")

	flag.Parse()

	// Handle backward compatibility: if old flags are used, override deployment mode
	if cfg.StandaloneMode {
		cfg.DeploymentMode = config.DeploymentModeStandalone
	} else if cfg.FederatedPlatform {
		cfg.DeploymentMode = config.DeploymentModeFederated
	}

	// Ensure the deprecated boolean fields are consistent with the new deployment mode
	cfg.StandaloneMode = cfg.DeploymentMode.IsStandaloneMode()
	cfg.FederatedPlatform = cfg.DeploymentMode.IsFederatedMode()

	if err := validateInsecureSkipVerify(cfg.InsecureSkipVerify, certFile); err != nil {
		os.Exit(1)
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	if err := validateBFFTransportTLSConfig(cfg.DevMode, cfg.BFFClientsAllowInsecureHTTP, cfg.BFFDCHServiceName != "", cfg.BFFDCHTLSEnabled); err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	// Data Registry runs as an RHOAI/ODH Dashboard module and always uses the caller's
	// OpenShift bearer token. Service-account authentication is intentionally unsupported.
	if cfg.AuthMethod != config.AuthMethodUser {
		logger.Error("invalid auth method: (must be user_token)", "authMethod", cfg.AuthMethod)
		os.Exit(1)
	}

	// Only use for logging errors about logging configuration.
	slog.SetDefault(logger)
	if cfg.BFFDCHServiceName != "" && (cfg.BFFDCHTimeoutSeconds <= 0 || cfg.BFFDCHServicePort <= 0 || cfg.BFFDCHServicePort > 65535) {
		logger.Error("DCH requires a positive timeout and a valid service port")
		os.Exit(1)
	}

	app, err := api.NewApp(cfg, slog.New(logger.Handler()))
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      app.Routes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		ErrorLog:     slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	tlsEnabled := certFile != "" && keyFile != ""

	// signalCtx is cancelled on the first shutdown signal; both the HTTPS reload
	// loop and the graceful-shutdown sequence below key off it.
	signalCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)
	defer stop()

	var serveErr error
	serverClosed := make(chan struct{})
	go func() {
		defer close(serverClosed)
		logger.Info("starting server", "addr", srv.Addr, "TLS enabled", tlsEnabled)
		if tlsEnabled {
			serveErr = tlsprofile.ListenAndServeTLSWithReload(signalCtx, logger, srv, certFile, keyFile)
		} else {
			serveErr = srv.ListenAndServe()
		}
		if serveErr != nil && serveErr != http.ErrServerClosed {
			logger.Error("HTTP server failed", "error", serveErr)
			stop()
		}
	}()

	<-signalCtx.Done()
	logger.Info("shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if !tlsEnabled {
		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("server shutdown failed", "error", err)
		}
	}
	<-serverClosed

	// Shutdown the App gracefully
	if err := app.Shutdown(); err != nil {
		logger.Error("failed to shutdown Kubernetes manager", "error", err)
	}

	logger.Info("server stopped")
	if serveErr != nil && serveErr != http.ErrServerClosed {
		os.Exit(1)
	}
	os.Exit(0)
}

func validateInsecureSkipVerify(insecureSkipVerify bool, certFile string) error {
	if !insecureSkipVerify {
		return nil
	}

	if certFile != "" {
		slog.Error("SECURITY: InsecureSkipVerify cannot be used when TLS certificates are mounted",
			"cert_file", certFile,
			"insecure_skip_verify", insecureSkipVerify,
			"fix", "Remove --insecure-skip-verify flag and INSECURE_SKIP_VERIFY env var",
		)
		return errors.New("InsecureSkipVerify cannot be used when TLS certificates are mounted (deployed environment detected)")
	}

	slog.Warn("SECURITY WARNING: TLS certificate verification is DISABLED (InsecureSkipVerify=true)",
		"use_case", "local development only - NEVER use in production",
	)
	return nil
}
