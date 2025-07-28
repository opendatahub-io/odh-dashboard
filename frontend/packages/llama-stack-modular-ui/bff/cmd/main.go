package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/api"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
)

func main() {
	var cfg config.EnvConfig
	// General BFF configuration
	flag.IntVar(&cfg.Port, "port", getEnvAsInt("PORT", 8080), "API server port")
	flag.StringVar(&cfg.StaticAssetsDir, "static-assets-dir", "./static", "Configure frontend static assets root directory")
	flag.TextVar(&cfg.LogLevel, "log-level", parseLevel(getEnvAsString("LOG_LEVEL", "DEBUG")), "Sets server log level, possible values: error, warn, info, debug")
	flag.Func("allowed-origins", "Sets allowed origins for CORS purposes, accepts a comma separated list of origins or * to allow all, default none", newOriginParser(&cfg.AllowedOrigins, getEnvAsString("ALLOWED_ORIGINS", "")))
	flag.BoolVar(&cfg.MockLSClient, "mock-ls-client", false, "Use mock Llama Stack client")

	// Llama Stack configuration
	flag.StringVar(&cfg.LlamaStackURL, "llama-stack-url", getEnvAsString("LLAMA_STACK_URL", ""), "Llama Stack server URL for proxying requests")

	// OAuth configuration
	flag.BoolVar(&cfg.OAuthEnabled, "oauth-enabled", getEnvAsBool("OAUTH_ENABLED", false), "Enable OAuth authentication")
	flag.StringVar(&cfg.OAuthClientID, "oauth-client-id", getEnvAsString("OAUTH_CLIENT_ID", ""), "OAuth client ID")
	flag.StringVar(&cfg.OAuthClientSecret, "oauth-client-secret", getEnvAsString("OAUTH_CLIENT_SECRET", ""), "OAuth client secret")
	flag.StringVar(&cfg.OAuthRedirectURI, "oauth-redirect-uri", getEnvAsString("OAUTH_REDIRECT_URI", ""), "OAuth redirect URI")
	flag.StringVar(&cfg.OAuthServerURL, "oauth-server-url", getEnvAsString("OAUTH_SERVER_URL", ""), "OAuth server URL")
	flag.StringVar(&cfg.OpenShiftApiServerUrl, "openshift-api-server-url", getEnvAsString("OPENSHIFT_API_SERVER_URL", "https://kubernetes.default.svc.cluster.local"), "OpenShift API server URL for token validation")
	flag.StringVar(&cfg.OAuthUserInfoEndpoint, "oauth-user-info-endpoint", getEnvAsString("OAUTH_USER_INFO_ENDPOINT", ""), "OAuth user info endpoint URL for token validation (optional, defaults to OpenShift API server + /apis/user.openshift.io/v1/users/~)")

	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

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

	// Start the server in a goroutine
	go func() {
		logger.Info("starting server", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server ListenAndServe", "error", err)
		}
	}()

	// Graceful shutdown setup
	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, os.Interrupt, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)

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

	logger.Info("server stopped")
	os.Exit(0)

}
