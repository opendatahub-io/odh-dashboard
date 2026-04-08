package api

import (
	"crypto/x509"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/opendatahub-io/mlflow/bff/internal/config"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow/mlflowmocks"
)

const mlflowDiscoveryInterval = 30 * time.Second

// mlflowState groups the fields on App that are protected by mlflowMu.
// They are defined inline on App (not embedded) so the mutex, factory,
// and bookkeeping live next to each other in the struct.
//
// Read access:  isMLflowConfigured, getMLflowClientFactory  (RLock)
// Write access: refreshMLflowState → setMLflow{Available,Unavailable} (Lock)

// --- initialisation --------------------------------------------------------

func initMLflowFactory(cfg config.EnvConfig, logger *slog.Logger, rootCAs *x509.CertPool) (mlflowpkg.MLflowClientFactory, *mlflowmocks.MLflowState, string, bool, error) {
	if cfg.MockHTTPClient {
		// In mock mode, always report configured=true so the full MLflow UI is
		// exercisable during development — even when falling back to the static
		// in-memory mock (no real tracking URI).
		factory, state, err := initMockMLflowFactory(cfg, logger)
		if err != nil {
			return nil, nil, "", false, err
		}
		return factory, state, "", true, nil
	}

	trackingURL := resolveMLflowURL(cfg, logger)
	if trackingURL == "" {
		return mlflowpkg.NewUnavailableClientFactory(), nil, "", false, nil
	}
	return newRealClientFactory(trackingURL, rootCAs, cfg.InsecureSkipVerify, logger), nil, trackingURL, true, nil
}

func initMockMLflowFactory(cfg config.EnvConfig, logger *slog.Logger) (mlflowpkg.MLflowClientFactory, *mlflowmocks.MLflowState, error) {
	if cfg.MLflowURL != "" {
		if err := validateLoopbackURL(cfg.MLflowURL, cfg.DevMode); err != nil {
			return nil, nil, err
		}
		logger.Info("Using external MLflow (no auth)", slog.String("url", cfg.MLflowURL))
		return mlflowmocks.NewMockClientFactory(cfg.MLflowURL), nil, nil
	}

	if cfg.StaticMLflowMock {
		logger.Info("Using static in-memory MLflow mock data")
		return mlflowmocks.NewStaticMockClientFactory(), nil, nil
	}

	state, err := mlflowmocks.SetupMLflow(logger)
	if err != nil {
		logger.Info("MLflow mock server not available, using static mock data", slog.Any("error", err))
		return mlflowmocks.NewStaticMockClientFactory(), nil, nil
	}
	return mlflowmocks.NewMockClientFactory(state.TrackingURI), state, nil
}

// --- URL helpers -----------------------------------------------------------

func validateLoopbackURL(rawURL string, devMode bool) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid MLflow URL: %w", err)
	}
	host := parsed.Hostname()
	ip := net.ParseIP(host)
	if !devMode || (host != "localhost" && (ip == nil || !ip.IsLoopback())) {
		return fmt.Errorf("external no-auth MLflow is only allowed in dev mode for loopback hosts")
	}
	return nil
}

func sanitizeURL(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "<invalid-url>"
	}
	return (&url.URL{
		Scheme: parsed.Scheme,
		Host:   parsed.Host,
		Path:   parsed.Path,
	}).String()
}

func normalizeTrackingURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", fmt.Errorf("invalid MLflow URL %s: %w", sanitizeURL(rawURL), err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid MLflow URL: missing scheme or host")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("unsupported MLflow URL scheme %q", parsed.Scheme)
	}
	return (&url.URL{
		Scheme: parsed.Scheme,
		Host:   parsed.Host,
		Path:   parsed.Path,
	}).String(), nil
}

func resolveMLflowURL(cfg config.EnvConfig, logger *slog.Logger) string {
	if cfg.MLflowURL != "" {
		normalized, err := normalizeTrackingURL(cfg.MLflowURL)
		if err != nil {
			logger.Warn("Configured MLflow URL is invalid, MLflow endpoints will return 503", slog.String("url", sanitizeURL(cfg.MLflowURL)))
			return ""
		}
		logger.Info("Using MLflow URL from configuration", slog.String("url", sanitizeURL(normalized)))
		return normalized
	}
	if cfg.AuthMethod == config.AuthMethodDisabled {
		logger.Info("Auth disabled, skipping MLflow URL discovery")
		return ""
	}
	discoveredURL, err := mlflowpkg.DiscoverMLflowURL()
	if err != nil {
		logger.Warn("MLflow CR auto-discovery failed, MLflow endpoints will return 503", slog.Any("error", err))
		return ""
	}
	if discoveredURL == "" {
		logger.Warn("MLflow CR auto-discovery returned empty URL, MLflow endpoints will return 503")
		return ""
	}
	normalized, err := normalizeTrackingURL(discoveredURL)
	if err != nil {
		logger.Warn("Discovered MLflow URL is invalid, MLflow endpoints will return 503", slog.String("url", sanitizeURL(discoveredURL)))
		return ""
	}
	logger.Info("Discovered MLflow URL from CR", slog.String("url", sanitizeURL(normalized)))
	return normalized
}

func newRealClientFactory(trackingURL string, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) mlflowpkg.MLflowClientFactory {
	return mlflowpkg.NewRealClientFactory(mlflowpkg.RealClientFactoryConfig{
		TrackingURL:        trackingURL,
		RootCAs:            rootCAs,
		InsecureSkipVerify: insecureSkipVerify,
		Logger:             logger,
	})
}

// --- thread-safe accessors -------------------------------------------------

func (app *App) isMLflowConfigured() bool {
	app.mlflowMu.RLock()
	defer app.mlflowMu.RUnlock()
	return app.mlflowConfigured
}

func (app *App) getMLflowClientFactory() mlflowpkg.MLflowClientFactory {
	app.mlflowMu.RLock()
	defer app.mlflowMu.RUnlock()
	return app.mlflowClientFactory
}

// --- runtime re-resolution -------------------------------------------------

func (app *App) shouldWatchMLflow() bool {
	return !app.config.MockHTTPClient &&
		app.config.MLflowURL == "" &&
		app.config.AuthMethod != config.AuthMethodDisabled
}

func (app *App) refreshMLflowState() {
	newURL := resolveMLflowURL(app.config, app.logger)

	app.mlflowMu.Lock()
	defer app.mlflowMu.Unlock()

	if newURL == app.mlflowTrackingURL {
		return
	}

	oldURL := app.mlflowTrackingURL
	app.mlflowTrackingURL = newURL

	if newURL == "" {
		app.setMLflowUnavailable(oldURL)
	} else {
		app.setMLflowAvailable(newURL, oldURL)
	}
}

// setMLflowUnavailable marks MLflow as unconfigured. Must be called under mlflowMu write lock.
func (app *App) setMLflowUnavailable(previousURL string) {
	app.mlflowConfigured = false
	app.mlflowClientFactory = mlflowpkg.NewUnavailableClientFactory()
	app.logger.Info("MLflow CR no longer available, endpoints will return 503",
		slog.String("previousURL", sanitizeURL(previousURL)))
}

// setMLflowAvailable marks MLflow as configured with a new URL. Must be called under mlflowMu write lock.
func (app *App) setMLflowAvailable(newURL, previousURL string) {
	app.mlflowConfigured = true
	app.mlflowClientFactory = newRealClientFactory(newURL, app.rootCAs, app.config.InsecureSkipVerify, app.logger)
	if previousURL == "" {
		app.logger.Info("MLflow CR discovered at runtime", slog.String("url", sanitizeURL(newURL)))
	} else {
		app.logger.Info("MLflow CR URL changed",
			slog.String("url", sanitizeURL(newURL)),
			slog.String("previousURL", sanitizeURL(previousURL)))
	}
}

func (app *App) startMLflowWatcher() {
	app.mlflowWatcherDone = make(chan struct{})
	app.mlflowWatcherWg.Add(1)
	ticker := time.NewTicker(mlflowDiscoveryInterval)
	go func() {
		defer app.mlflowWatcherWg.Done()
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				app.safeRefreshMLflowState()
			case <-app.mlflowWatcherDone:
				return
			}
		}
	}()
	app.logger.Info("Started MLflow CR discovery watcher", slog.Duration("interval", mlflowDiscoveryInterval))
}

func (app *App) safeRefreshMLflowState() {
	defer func() {
		if r := recover(); r != nil {
			app.logger.Error("panic during MLflow CR discovery", slog.Any("recover", r))
		}
	}()
	app.refreshMLflowState()
}
