package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/http/httptest"
	"os/signal"
	"syscall"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/api"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	tlsprofile "github.com/opendatahub-io/odh-dashboard/pkg/tls"

	"log/slog"
	"net/http"
	"os"
	"time"
)

func main() {
	startup, err := parseStartupConfig(os.Args[1:], os.Stderr)
	if errors.Is(err, flag.ErrHelp) {
		// -h / -help printed the usage; that is a successful run, not a refusal.
		os.Exit(0)
	}
	if err != nil {
		// The logger is not built yet: the log level itself comes from the
		// configuration being rejected. Diagnostics name the setting and the
		// fix, and never carry credential values.
		fmt.Fprintf(os.Stderr, "core-bff refusing to start: %v\n", err)
		os.Exit(1)
	}
	cfg := startup.Env

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	// cfg implements slog.LogValuer, so this summary is redacted by construction.
	logger.Info("resolved runtime configuration", slog.Any("config", cfg))

	if cfg.MockK8Client {
		if cleanup := startMockPrometheus(&cfg, logger); cleanup != nil {
			defer cleanup()
		}
	}

	app, err := api.NewApp(cfg, slog.New(logger.Handler()))
	if err != nil {
		logger.Error("failed to initialize app", "error", err.Error())
		os.Exit(1)
	}

	runServer(app, cfg, startup.TLS, logger)
}

func startMockPrometheus(cfg *config.EnvConfig, logger *slog.Logger) func() {
	if cfg.PrometheusHost != "" {
		return nil
	}
	mockProm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		_, _ = w.Write([]byte(`{"status":"success","data":{"resultType":"vector","result":[]}}`))
	}))
	cfg.PrometheusHost = mockProm.URL
	logger.Info("Started mock Prometheus server", slog.String("url", mockProm.URL))
	return mockProm.Close
}

// runServer builds the HTTP server, serves it, and manages graceful shutdown.
// When TLS is enabled it serves HTTPS via tlsprofile.ListenAndServeTLSWithReload,
// which tracks the cluster TLS profile and restarts the listener on change so
// policy updates apply without a pod restart.
// A half-configured or unusable certificate pair never reaches this point:
// config.Validate rejects it at startup, so TLSFiles.Enabled() reporting false
// always means TLS was deliberately not requested.
func runServer(app *api.App, cfg config.EnvConfig, tlsFiles config.TLSFiles, logger *slog.Logger) {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      app.Routes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		ErrorLog:     slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	tlsEnabled := tlsFiles.Enabled()

	// signalCtx is cancelled on the first shutdown signal; both the HTTPS reload
	// loop and the graceful-shutdown sequence below key off it.
	signalCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)
	defer stop()

	// On a confirmed xKS platform the cluster TLS profile lives in an OpenShift
	// configuration API that does not exist, so reading it could only fall back
	// to Intermediate defaults anyway, but issuing the request would put a
	// config.openshift.io dependency in the xKS startup path. Serve the same
	// defaults directly. A platform guessed after an inconclusive probe keeps the
	// profile-aware listener so a real OpenShift policy is never bypassed.
	withoutClusterProfile := app.ServeTLSWithoutClusterProfile()

	var serveErr error
	serverClosed := make(chan struct{})
	go func() {
		defer close(serverClosed)
		logger.Info("starting server", "addr", srv.Addr, "TLS enabled", tlsEnabled, "platform", app.PlatformType().String(), "clusterTLSProfile", tlsEnabled && !withoutClusterProfile)
		switch {
		case tlsEnabled && withoutClusterProfile:
			serveErr = tlsprofile.ListenAndServeTLSWithoutClusterProfile(signalCtx, logger, srv, tlsFiles.CertFile, tlsFiles.KeyFile)
		case tlsEnabled:
			serveErr = tlsprofile.ListenAndServeTLSWithReload(signalCtx, logger, srv, tlsFiles.CertFile, tlsFiles.KeyFile)
		default:
			serveErr = srv.ListenAndServe()
		}
		if serveErr != nil && serveErr != http.ErrServerClosed {
			logger.Error("HTTP server failed", "error", serveErr)
			stop() // trigger graceful shutdown of the rest of the process
		}
	}()

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

	if err := app.Shutdown(); err != nil {
		logger.Error("failed to shutdown Kubernetes manager", "error", err)
	}

	logger.Info("server stopped")
	if serveErr != nil && serveErr != http.ErrServerClosed {
		os.Exit(1)
	}
	os.Exit(0)
}
