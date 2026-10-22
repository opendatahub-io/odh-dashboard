package tls

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"time"
)

// DefaultReloadInterval is how often ServeTLSWithReload re-reads the cluster TLS
// profile to detect changes. The cluster TLS profile changes rarely, so a
// coarse poll keeps the implementation dependency-light (no watch/informer)
// while still picking up policy changes without a pod restart.
const DefaultReloadInterval = time.Minute

// shutdownTimeout bounds the graceful shutdown of a listener generation before
// it is restarted with a new configuration.
const shutdownTimeout = 10 * time.Second

// ServerFactory builds a fresh *http.Server for a resolved TLS configuration. It
// is called once at startup and again after each detected profile change — a new
// server is required because an http.Server cannot be reused after Shutdown. The
// factory should set the server's Addr, Handler and timeouts; ServeTLSWithReload
// assigns TLSConfig itself.
type ServerFactory func(tlsConfig *tls.Config) *http.Server

// configResolver resolves the current server TLS configuration from the cluster
// profile. It is a seam for testing.
type configResolver func(ctx context.Context) (*tls.Config, error)

// ServeTLSWithReload resolves the cluster-wide TLS profile, starts the HTTPS
// server produced by factory, and periodically re-reads the profile. When the
// resolved configuration changes it gracefully shuts the running server down and
// starts a replacement built from the new configuration, so cluster TLS policy
// changes are applied without a pod restart.
//
// It blocks until ctx is cancelled (returns nil after the running server is shut
// down) or the server stops serving for a reason other than a reload- or
// shutdown-triggered close (returns that error). The initial profile read is
// fail-closed: if it errors, no server is started and the error is returned.
func ServeTLSWithReload(ctx context.Context, logger *slog.Logger, factory ServerFactory, certFile, keyFile string) error {
	return serveTLSWithReload(ctx, logger, factory, certFile, keyFile, DefaultReloadInterval,
		func(c context.Context) (*tls.Config, error) {
			// Strict resolution: a transient read error retains the running
			// configuration (watchForReload keeps current on resolver error)
			// rather than downgrading the listener to Intermediate defaults.
			return ServerTLSConfigStrict(c, logger)
		})
}

// ListenAndServeTLSWithReload is a drop-in replacement for
// (*http.Server).ListenAndServeTLS that adds cluster-TLS-profile tracking. It
// serves template.Handler over HTTPS and, when the cluster TLS profile changes,
// gracefully restarts the listener. Each listener generation is a fresh
// *http.Server copying the connection-shaping fields from template; TLSConfig is
// managed internally and must not be preset on template.
//
// It blocks with the same semantics as ServeTLSWithReload: nil on graceful
// shutdown via ctx cancellation, otherwise the serve error.
func ListenAndServeTLSWithReload(ctx context.Context, logger *slog.Logger, template *http.Server, certFile, keyFile string) error {
	factory := func(_ *tls.Config) *http.Server {
		return &http.Server{
			Addr:              template.Addr,
			Handler:           template.Handler,
			ReadTimeout:       template.ReadTimeout,
			ReadHeaderTimeout: template.ReadHeaderTimeout,
			WriteTimeout:      template.WriteTimeout,
			IdleTimeout:       template.IdleTimeout,
			MaxHeaderBytes:    template.MaxHeaderBytes,
			ErrorLog:          template.ErrorLog,
			BaseContext:       template.BaseContext,
		}
	}
	return ServeTLSWithReload(ctx, logger, factory, certFile, keyFile)
}

// serveTLSWithReload is the testable implementation behind ServeTLSWithReload. It
// accepts the poll interval and config resolver so tests can drive reloads
// deterministically without an API server.
func serveTLSWithReload(
	ctx context.Context,
	logger *slog.Logger,
	factory ServerFactory,
	certFile, keyFile string,
	interval time.Duration,
	resolve configResolver,
) error {
	tlsCfg, err := resolve(ctx)
	if err != nil {
		return fmt.Errorf("initial TLS profile resolution failed: %w", err)
	}

	for {
		srv := factory(tlsCfg)
		// Hand each generation its own clone; http.Server mutates TLSConfig
		// (e.g. appends ALPN protos and the loaded certificate), which would
		// otherwise corrupt the config we compare future reads against.
		srv.TLSConfig = tlsCfg.Clone()

		serveErrCh := make(chan error, 1)
		go func() {
			if e := srv.ListenAndServeTLS(certFile, keyFile); e != nil && !errors.Is(e, http.ErrServerClosed) {
				serveErrCh <- e
				return
			}
			serveErrCh <- nil
		}()

		ticker := time.NewTicker(interval)
		nextCfg, outcome, serveErr := watchForReload(ctx, logger, ticker.C, tlsCfg, resolve, serveErrCh)
		ticker.Stop()

		switch outcome {
		case reloadRequested:
			logger.Info("cluster TLS profile changed; restarting HTTPS listener",
				"oldMinVersion", tlsCfg.MinVersion, "newMinVersion", nextCfg.MinVersion)
			gracefulShutdown(logger, srv, shutdownTimeout)
			<-serveErrCh // wait for the serve goroutine to unwind
			tlsCfg = nextCfg
			continue
		case contextCancelled:
			gracefulShutdown(logger, srv, shutdownTimeout)
			<-serveErrCh
			return nil
		default: // serverStopped
			if serveErr != nil {
				return fmt.Errorf("TLS server failed: %w", serveErr)
			}
			return nil
		}
	}
}

type reloadOutcome int

const (
	serverStopped reloadOutcome = iota
	contextCancelled
	reloadRequested
)

// watchForReload blocks until the context is cancelled, the server stops, or the
// resolved TLS configuration changes. When a change is detected it returns the
// new config with reloadRequested. Transient resolver errors are logged and the
// current configuration is kept (a working listener is never torn down because
// of a flaky read).
func watchForReload(
	ctx context.Context,
	logger *slog.Logger,
	tick <-chan time.Time,
	current *tls.Config,
	resolve configResolver,
	serveErrCh <-chan error,
) (*tls.Config, reloadOutcome, error) {
	for {
		select {
		case <-ctx.Done():
			return nil, contextCancelled, nil
		case err := <-serveErrCh:
			return nil, serverStopped, err
		case <-tick:
			candidate, err := resolve(ctx)
			if err != nil {
				logger.Warn("failed to re-read cluster TLS profile; keeping current configuration", "error", err)
				continue
			}
			if !tlsConfigEqual(current, candidate) {
				return candidate, reloadRequested, nil
			}
		}
	}
}

// gracefulShutdown shuts a listener generation down within timeout. If the
// graceful drain does not complete in time, the server is force-closed so its
// connections and handlers do not leak across reload generations (Shutdown with a
// deadline does not itself close still-active connections).
func gracefulShutdown(logger *slog.Logger, srv *http.Server, timeout time.Duration) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown of HTTPS listener timed out; forcing close", "error", err)
		if closeErr := srv.Close(); closeErr != nil {
			logger.Error("force close of HTTPS listener failed", "error", closeErr)
		}
	}
}

// tlsConfigEqual reports whether two resolved TLS configs would serve the same
// policy. Only the policy-bearing fields are compared (NextProtos is a constant
// in this package).
func tlsConfigEqual(a, b *tls.Config) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.MinVersion == b.MinVersion &&
		slices.Equal(a.CipherSuites, b.CipherSuites) &&
		slices.Equal(a.CurvePreferences, b.CurvePreferences)
}
