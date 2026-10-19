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
		s.logger.Error("error shutting down server", "error", err)
	}
}

// NeedLeaderElection returns false because this app does not need leader election from the manager
func (s *Server) NeedLeaderElection() bool {
	return false
}
