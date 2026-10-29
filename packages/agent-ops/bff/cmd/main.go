package main

import (
	"context"
	"flag"
	"fmt"
	"os/signal"
	"syscall"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/api"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
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
	flag.BoolVar(&cfg.DevMode, "dev-mode", false, "Use development mode for access to local K8s cluster")
	flag.IntVar(&cfg.DevModeClientPort, "dev-mode-client-port", getEnvAsInt("DEV_MODE_CLIENT_PORT", 8080), "Use port when in development mode for client")

	// New deployment mode flag
	flag.Var(&cfg.DeploymentMode, "deployment-mode", "Deployment mode (federated, standalone, or kubeflow alias for standalone)")

	flag.StringVar(&cfg.StaticAssetsDir, "static-assets-dir", "./static", "Configure frontend static assets root directory")
	flag.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "INFO")), "Sets server log level, possible values: error, warn, info, debug")
	flag.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none", newOriginParser(&cfg.AllowedOrigins, getEnvAsString("ALLOWED_ORIGINS", "")))
	// bundle-paths accepts a comma-separated list of CA bundle file paths to trust for outbound TLS.
	// If not provided via flag, it can be set via BUNDLE_PATHS env var (comma-separated). Defaults to empty.
	defaultBundlePaths := getEnvAsString("BUNDLE_PATHS", "")
	flag.Func("bundle-paths", "Comma-separated list of PEM CA bundle file paths to trust for outbound TLS (optional)", newOriginParser(&cfg.BundlePaths, defaultBundlePaths))
	flag.StringVar(&cfg.AuthMethod, "auth-method", "internal", "Authentication method (internal, user_token, or disabled)")
	flag.StringVar(&cfg.AuthTokenHeader, "auth-token-header", getEnvAsString("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader), "Header used to extract the token (e.g., Authorization)")
	flag.StringVar(&cfg.AuthTokenPrefix, "auth-token-prefix", getEnvAsString("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix), "Prefix used in the token header (e.g., 'Bearer ')")

	// TLS configuration flags
	flag.BoolVar(&cfg.InsecureSkipVerify, "insecure-skip-verify", getEnvAsBool("INSECURE_SKIP_VERIFY", false), "Skip TLS certificate verification (useful for development, default: false)")

	// ─── BFF Inter-Communication ─────────────────────────────────
	flag.BoolVar(&cfg.MockBFFClients, "mock-bff-clients",
		getEnvAsBool("MOCK_BFF_CLIENTS", false),
		"Enable mock BFF clients (no real HTTP calls to other BFFs)")
	flag.BoolVar(&cfg.MockAgentClient, "mock-agent-client",
		getEnvAsBool("MOCK_AGENT_CLIENT", false),
		"Enable mock agent data client (demo data instead of Kubernetes; local development only)")

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

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	//validate auth method
	if cfg.AuthMethod != config.AuthMethodInternal &&
		cfg.AuthMethod != config.AuthMethodUser &&
		cfg.AuthMethod != config.AuthMethodDisabled {
		logger.Error("invalid auth method: (must be internal, user_token, or disabled)", "authMethod", cfg.AuthMethod)
		os.Exit(1)
	}
	if cfg.AuthMethod == config.AuthMethodDisabled {
		logger.Warn("AUTH_METHOD=disabled: all authentication and RBAC checks are bypassed — do not use in staging or production")
	}

	// Only use for logging errors about logging configuration.
	slog.SetDefault(logger)

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
		WriteTimeout: 30 * time.Second,
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
			// Serve HTTPS and gracefully restart the listener whenever the
			// cluster TLS profile changes, so policy updates apply without a pod restart.
			serveErr = tlsprofile.ListenAndServeTLSWithReload(signalCtx, logger, srv, certFile, keyFile)
		} else {
			serveErr = srv.ListenAndServe()
		}
		if serveErr != nil && serveErr != http.ErrServerClosed {
			logger.Error("HTTP server failed", "error", serveErr)
			stop() // trigger graceful shutdown of the rest of the process
		}
	}()

	// Wait for a shutdown signal or a fatal server error.
	<-signalCtx.Done()
	logger.Info("shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// The reload loop shuts its own listener down when signalCtx is cancelled;
	// the plain listener needs an explicit shutdown.
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
