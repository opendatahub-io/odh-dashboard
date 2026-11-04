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

// shutdownTimeout bounds the graceful drain of a listener generation before it is
// restarted with a new configuration (a brief, rare reload event).
const shutdownTimeout = 10 * time.Second

// terminationShutdownTimeout bounds the graceful drain on process shutdown
// (context cancellation, e.g. SIGTERM). It matches the 30s budget the BFF entry
// points use for plain HTTP so TLS and plain modes drain equally on termination.
const terminationShutdownTimeout = 30 * time.Second

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
// shutdown-triggered close (returns that error).
//
// The initial read is lenient (ServerTLSConfig): a transient API error at startup
// falls back to Intermediate defaults rather than crash-looping the pod during an
// API-server brownout. Reload polling is strict (ServerTLSConfigStrict): a
// transient error there retains the running configuration instead of downgrading
// an already-resolved Modern/Custom listener to Intermediate.
func ServeTLSWithReload(ctx context.Context, logger *slog.Logger, factory ServerFactory, certFile, keyFile string) error {
	initial := func(c context.Context) (*tls.Config, error) { return ServerTLSConfig(c, logger) }
	poll := func(c context.Context) (*tls.Config, error) { return ServerTLSConfigStrict(c, logger) }
	return serveTLSWithReload(ctx, logger, factory, certFile, keyFile, DefaultReloadInterval, initial, poll)
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
	initial configResolver,
	poll configResolver,
) error {
	tlsCfg, err := initial(ctx)
	if err != nil {
		return fmt.Errorf("initial TLS profile resolution failed: %w", err)
	}

	for {
		srv := factory(tlsCfg)
		// Hand each generation its own clone; http.Server mutates TLSConfig
		// (e.g. appends ALPN protos and the loaded certificate), which would
		// otherwise corrupt the config we compare future reads against.
		srv.TLSConfig = tlsCfg.Clone()
		// A cluster cipher profile may legitimately pin a TLS 1.2 cipher list that
		// omits every suite HTTP/2 requires; in that case serve HTTP/1.1 only rather
		// than letting http.Server.ServeTLS fail to configure HTTP/2 and refuse to
		// serve the listener at all.
		disableHTTP2IfIncompatible(logger, srv)

		serveErrCh := make(chan error, 1)
		go func() {
			if e := srv.ListenAndServeTLS(certFile, keyFile); e != nil && !errors.Is(e, http.ErrServerClosed) {
				serveErrCh <- e
				return
			}
			serveErrCh <- nil
		}()

		ticker := time.NewTicker(interval)
		nextCfg, outcome, serveErr := watchForReload(ctx, logger, ticker.C, tlsCfg, poll, serveErrCh)
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
			// Process shutdown: use the full termination drain budget.
			gracefulShutdown(logger, srv, terminationShutdownTimeout)
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
// new config with reloadRequested.
//
// Policy on a poll resolver error (any kind — transient, denied, or
// malformed/unknown): the error is logged and the current (last-known-good)
// configuration is retained; the running listener keeps serving and is never torn
// down. This is deliberate — a reload poll failing is not a reason to stop serving
// a policy that was already validated at the previous successful read. Startup is
// where resolution is fail-closed; reload prefers availability of the
// last-known-good policy, then re-applies automatically on the next clean read.
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
			// A serve error that arrived in the same window must win over a reload:
			// select picks a ready case at random, so without this a genuine listener
			// failure could be masked as a reload (the reloadRequested path drains
			// serveErrCh and discards the error). Check it first, non-blocking.
			select {
			case err := <-serveErrCh:
				return nil, serverStopped, err
			default:
			}
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

// disableHTTP2IfIncompatible forces an http.Server to HTTP/1.1 only when its
// resolved TLS cipher list cannot satisfy HTTP/2's required-cipher rule.
//
// RFC 7540 §9.2.2 requires an HTTP/2 server negotiating TLS <=1.2 to support an
// ECDHE AES-128-GCM suite. golang.org/x/net/http2's ConfigureServer enforces this:
// when TLSConfig.CipherSuites is non-empty and contains none of those suites it
// returns "TLSConfig.CipherSuites is missing an HTTP/2-required AES_128_GCM_SHA256
// cipher", which http.Server.ServeTLS surfaces as a fatal serve error — the whole
// listener never starts. A cluster TLS profile may legitimately pin a TLS 1.2
// cipher list (for example AES-256 only) that omits those suites, so we detect that
// and serve HTTP/1.1 only instead of refusing to serve.
//
// Suppressing the automatic HTTP/2 wiring requires a non-nil TLSNextProto (clearing
// "h2" from NextProtos alone does not: http.Server re-adds it while configuring
// HTTP/2). We also drop "h2" from the advertised ALPN protocols so a client cannot
// negotiate a protocol the server will not serve.
func disableHTTP2IfIncompatible(logger *slog.Logger, srv *http.Server) {
	if srv.TLSConfig == nil || tlsConfigPermitsHTTP2(srv.TLSConfig) {
		return
	}
	logger.Warn("resolved cluster TLS cipher suites omit every HTTP/2-required cipher (ECDHE AES-128-GCM); serving HTTP/1.1 only on this listener")
	srv.TLSConfig.NextProtos = slices.DeleteFunc(slices.Clone(srv.TLSConfig.NextProtos),
		func(p string) bool { return p == "h2" })
	if len(srv.TLSConfig.NextProtos) == 0 {
		srv.TLSConfig.NextProtos = []string{"http/1.1"}
	}
	// A non-nil (even empty) TLSNextProto makes http.Server skip its automatic
	// HTTP/2 setup, so ConfigureServer never runs and cannot reject the cipher list.
	srv.TLSNextProto = map[string]func(*http.Server, *tls.Conn, http.Handler){}
}

// tlsConfigPermitsHTTP2 reports whether cfg's cipher list is compatible with
// HTTP/2. An empty CipherSuites means Go's defaults apply (which include a required
// suite), so HTTP/2 is fine; a non-empty list must contain one of the two ECDHE
// AES-128-GCM suites http2.ConfigureServer demands. This mirrors Go's own check,
// which inspects CipherSuites regardless of MinVersion.
func tlsConfigPermitsHTTP2(cfg *tls.Config) bool {
	if cfg == nil || len(cfg.CipherSuites) == 0 {
		return true
	}
	for _, id := range cfg.CipherSuites {
		if id == tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 ||
			id == tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 {
			return true
		}
	}
	return false
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
