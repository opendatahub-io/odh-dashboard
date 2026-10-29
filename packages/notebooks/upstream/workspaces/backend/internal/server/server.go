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

package server

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"slices"
	"sync/atomic"
	"time"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/kubeflow/notebooks/workspaces/backend/api"
)

const (
	maxHeaderBytes = 1 << 17 // 128 KiB - default is 1MiB
	maxBodyBytes   = 1 << 22 // 4 MiB - default is unlimited

	// shutdownTimeout bounds the graceful shutdown of a listener generation
	// before it is restarted with a refreshed TLS configuration.
	shutdownTimeout = 10 * time.Second
)

type Server struct {
	logger   *slog.Logger
	app      *api.App
	addr     string
	certFile string
	keyFile  string

	// tlsConfig holds the TLS configuration applied to the next listener
	// generation. nil means plaintext. Swapped atomically by ReloadTLSConfig.
	tlsConfig atomic.Pointer[tls.Config]
	// reloadCh is signalled (non-blocking) when the TLS configuration changes so
	// Start tears the current listener down and restarts with the new config.
	reloadCh chan struct{}
}

// NewServer creates the backend server. tlsConfig is the resolved cluster TLS
// configuration for the HTTPS listener (nil for plaintext). It is derived from
// the OpenShift cluster TLS profile by the caller rather than hardcoded, and can
// be refreshed at runtime via ReloadTLSConfig.
func NewServer(app *api.App, logger *slog.Logger, certFile, keyFile string, tlsConfig *tls.Config) (*Server, error) {
	if (certFile == "") != (keyFile == "") {
		return nil, fmt.Errorf("cert-file and key-file must be provided together")
	}

	svr := &Server{
		logger:   logger,
		app:      app,
		addr:     fmt.Sprintf(":%d", app.Config.Port),
		certFile: certFile,
		keyFile:  keyFile,
		reloadCh: make(chan struct{}, 1),
	}
	svr.tlsConfig.Store(tlsConfig)

	return svr, nil
}

// SetupWithManager sets up the app with a controller-runtime manager
func (s *Server) SetupWithManager(mgr ctrl.Manager) error {
	err := mgr.Add(s)
	if err != nil {
		return err
	}
	return nil
}

// ReloadTLSConfig swaps the TLS configuration used by future listener
// generations and triggers a graceful restart. Safe for concurrent use; a
// no-op-coalescing channel ensures overlapping changes collapse into one restart.
func (s *Server) ReloadTLSConfig(cfg *tls.Config) {
	s.tlsConfig.Store(cfg)
	select {
	case s.reloadCh <- struct{}{}:
	default: // a reload is already pending
	}
}

// Start starts the server and blocks until the context is canceled. When the
// TLS configuration changes (via ReloadTLSConfig) it gracefully restarts the
// listener so cluster TLS policy changes apply without a pod restart.
func (s *Server) Start(ctx context.Context) error {
	for {
		restart, err := s.serveGeneration(ctx, s.tlsConfig.Load())
		if err != nil {
			return err
		}
		if !restart {
			return nil
		}
		s.logger.Info("TLS configuration changed, restarting listener")
	}
}

// serveGeneration serves a single listener generation. It returns restart=true
// when a TLS reload was requested (caller should loop), or restart=false when
// the context was cancelled (graceful shutdown) or the server stopped.
func (s *Server) serveGeneration(ctx context.Context, tlsConfig *tls.Config) (restart bool, err error) {
	listener, err := net.Listen("tcp", s.addr)
	if err != nil {
		return false, fmt.Errorf("failed to create listener: %w", err)
	}

	svc := &http.Server{
		Addr:              s.addr,
		Handler:           http.MaxBytesHandler(s.app.Routes(), maxBodyBytes),
		IdleTimeout:       90 * time.Second, // matches http.DefaultTransport keep-alive timeout
		ReadTimeout:       32 * time.Second,
		ReadHeaderTimeout: 32 * time.Second,
		WriteTimeout:      32 * time.Second,
		MaxHeaderBytes:    maxHeaderBytes,
		ErrorLog:          slog.NewLogLogger(s.logger.Handler(), slog.LevelError),
	}

	serveErr := make(chan error, 1)
	go func() {
		var e error
		if tlsConfig != nil {
			svc.TLSConfig = tlsConfig.Clone()
			// A cluster cipher profile may legitimately pin a TLS 1.2 cipher list
			// that omits every suite HTTP/2 requires; serve HTTP/1.1 only in that
			// case rather than letting ServeTLS fail to configure HTTP/2 and refuse
			// to serve the listener at all.
			disableHTTP2IfIncompatible(s.logger, svc)
			e = svc.ServeTLS(listener, s.certFile, s.keyFile)
		} else {
			e = svc.Serve(listener)
		}
		if e != nil && !errors.Is(e, http.ErrServerClosed) {
			serveErr <- e
			return
		}
		serveErr <- nil
	}()

	s.logger.Info("starting server", "addr", s.addr, "tls", tlsConfig != nil)

	select {
	case <-ctx.Done():
		s.shutdown(svc)
		<-serveErr
		return false, nil
	case e := <-serveErr:
		return false, e
	case <-s.reloadCh:
		s.shutdown(svc)
		<-serveErr
		return true, nil
	}
}

func (s *Server) shutdown(svc *http.Server) {
	s.logger.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := svc.Shutdown(shutdownCtx); err != nil {
		// The graceful drain did not finish in time; force-close so the old
		// generation's connections do not leak across a reload restart.
		s.logger.Error("graceful shutdown timed out; forcing close", "error", err)
		if closeErr := svc.Close(); closeErr != nil {
			s.logger.Error("force close of server failed", "error", closeErr)
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
// cipher", which ServeTLS surfaces as a fatal serve error — the listener never
// starts. A cluster TLS profile may legitimately pin a TLS 1.2 cipher list (for
// example AES-256 only) that omits those suites, so we detect that and serve
// HTTP/1.1 only instead of refusing to serve.
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

// NeedLeaderElection returns false because this app does not need leader election from the manager
func (s *Server) NeedLeaderElection() bool {
	return false
}
