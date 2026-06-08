package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"os/signal"
	"syscall"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/api"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"

	"log/slog"
	"net/http"
	"os"
	"time"
)

const defaultCABundlePaths = "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem," +
	"/var/run/secrets/kubernetes.io/serviceaccount/ca.crt," +
	"/var/run/secrets/kubernetes.io/serviceaccount/service-ca.crt," +
	"/etc/pki/tls/certs/odh-ca-bundle.crt," +
	"/etc/pki/tls/certs/odh-trusted-ca-bundle.crt"

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

	if v := getEnvAsString("DEPLOYMENT_MODE", "standalone"); v != "" {
		if err := cfg.DeploymentMode.Set(v); err != nil {
			fmt.Fprintf(os.Stderr, "invalid DEPLOYMENT_MODE %q: %v\n", v, err)
			os.Exit(1)
		}
	}
	flag.Var(&cfg.DeploymentMode, "deployment-mode", "Deployment mode (federated or standalone)")

	flag.StringVar(&cfg.StaticAssetsDir, "static-assets-dir", "./static", "Configure frontend static assets root directory")
	flag.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "INFO")), "Sets server log level, possible values: error, warn, info, debug")
	flag.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none", newOriginParser(&cfg.AllowedOrigins, getEnvAsString("ALLOWED_ORIGINS", "")))
	defaultBundlePaths := getEnvAsString("BUNDLE_PATHS", defaultCABundlePaths)
	flag.Func("bundle-paths", "Comma-separated list of PEM CA bundle file paths to trust for outbound TLS (optional)", newOriginParser(&cfg.BundlePaths, defaultBundlePaths))
	flag.StringVar(&cfg.AuthMethod, "auth-method", getEnvAsString("AUTH_METHOD", "user_token"), "Authentication method (disabled or user_token)")
	flag.StringVar(&cfg.AuthTokenHeader, "auth-token-header", getEnvAsString("AUTH_TOKEN_HEADER", config.DefaultAuthTokenHeader), "Header used to extract the token (default: x-forwarded-access-token)")
	flag.StringVar(&cfg.AuthTokenPrefix, "auth-token-prefix", getEnvAsString("AUTH_TOKEN_PREFIX", config.DefaultAuthTokenPrefix), "Prefix to strip from the token header value (default: none)")

	// TLS configuration flags
	flag.BoolVar(&cfg.InsecureSkipVerify, "insecure-skip-verify", getEnvAsBool("INSECURE_SKIP_VERIFY", false), "Skip TLS certificate verification (useful for development, default: false)")

	// ─── BFF Inter-Communication ─────────────────────────────────
	flag.BoolVar(&cfg.MockBFFClients, "mock-bff-clients",
		getEnvAsBool("MOCK_BFF_CLIENTS", false),
		"Enable mock BFF clients (no real HTTP calls to other BFFs)")

	// ─── Core BFF ─────────────────────────────────────────────
	if v := getEnvAsString("ODH_PLATFORM_TYPE", ""); v != "" {
		if err := cfg.PlatformType.Set(v); err != nil {
			fmt.Fprintf(os.Stderr, "invalid ODH_PLATFORM_TYPE %q: %v\n", v, err)
			os.Exit(1)
		}
	}
	flag.Var(&cfg.PlatformType, "platform-type", "Platform type: OpenShift, XKS, or empty (auto-detect)")
	flag.StringVar(&cfg.Namespace, "namespace",
		getEnvAsString("NAMESPACE", getEnvAsString("OC_PROJECT", "opendatahub")),
		"Kubernetes namespace where the dashboard is deployed (falls back to OC_PROJECT env var)")
	flag.StringVar(&cfg.WorkbenchNamespace, "workbench-namespace",
		getEnvAsString("WORKBENCH_NAMESPACE", ""),
		"Kubernetes namespace for workbenches (defaults to dashboard namespace if empty)")
	flag.StringVar(&cfg.DashboardConfigName, "dashboard-config-name",
		getEnvAsString("DASHBOARD_CONFIG_NAME", "odh-dashboard-config"),
		"Name of the OdhDashboardConfig CR")
	flag.StringVar(&cfg.EnabledAppsCM, "enabled-apps-cm",
		getEnvAsString("ENABLED_APPS_CM", ""),
		"Name of the ConfigMap that tracks enabled applications")
	flag.StringVar(&cfg.MFRemotesConfig, "mf-remotes-config",
		getEnvAsString("MF_REMOTES_CONFIG", ""),
		"Path to module federation remotes config file")

	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	if cfg.AuthMethod != config.AuthMethodDisabled && cfg.AuthMethod != config.AuthMethodUser {
		logger.Error("invalid auth method: (must be disabled or user_token)", "authMethod", cfg.AuthMethod)
		os.Exit(1)
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
		WriteTimeout: 60 * time.Second,
		ErrorLog:     slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	// Start the server in a goroutine
	go func() {
		logger.Info("starting server", "addr", srv.Addr, "TLS enabled", (certFile != "" && keyFile != ""))
		var err error
		if certFile != "" && keyFile != "" {
			// Configure TLS if both cert and key files are provided
			tlsConfig := &tls.Config{
				MinVersion: tls.VersionTLS13,
			}
			srv.TLSConfig = tlsConfig
			err = srv.ListenAndServeTLS(certFile, keyFile)
		} else {
			err = srv.ListenAndServe()
		}
		if err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server ListenAndServe", "error", err)
		}
	}()

	// Graceful shutdown setup
	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)

	// Wait for shutdown signal
	<-shutdownCh
	logger.Info("shutting down gracefully...")

	// Create a context with timeout for the shutdown process
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown the HTTP server gracefully
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", "error", err)
	}

	// Shutdown the App gracefully
	if err := app.Shutdown(); err != nil {
		logger.Error("failed to shutdown Kubernetes manager", "error", err)
	}

	logger.Info("server stopped")
	os.Exit(0)
}
