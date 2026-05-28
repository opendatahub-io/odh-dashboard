package api

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"

	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

func initRootCAs(bundlePaths []string, logger *slog.Logger) *x509.CertPool {
	if len(bundlePaths) == 0 {
		return nil
	}

	var rootCAs *x509.CertPool
	if pool, err := x509.SystemCertPool(); err == nil {
		rootCAs = pool
	} else {
		rootCAs = x509.NewCertPool()
	}

	var loadedAny bool
	for _, p := range bundlePaths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		pemBytes, readErr := os.ReadFile(p)
		if readErr != nil {
			logger.Debug("CA bundle not readable, skipping", slog.String("path", p), slog.Any("error", readErr))
			continue
		}
		if ok := rootCAs.AppendCertsFromPEM(pemBytes); !ok {
			logger.Debug("No certs appended from PEM bundle", slog.String("path", p))
			continue
		}
		loadedAny = true
		logger.Info("Added CA bundle", slog.String("path", p))
	}

	if !loadedAny {
		logger.Warn("No CA certificates loaded from bundle-paths; falling back to system defaults")
		return nil
	}
	return rootCAs
}

func (app *App) ensureRootCAs() {
	if app.rootCAs != nil {
		return
	}
	if pool, err := x509.SystemCertPool(); err == nil {
		app.rootCAs = pool
	} else {
		app.rootCAs = x509.NewCertPool()
	}
}

func (app *App) appendCACerts(pem []byte, source string) {
	if len(pem) == 0 {
		return
	}
	app.ensureRootCAs()
	if !app.rootCAs.AppendCertsFromPEM(pem) {
		app.logger.Warn("No certs appended", slog.String("source", source))
		return
	}
	app.logger.Debug("Loaded CA certs", slog.String("source", source))
}

func (app *App) appendCAFromTLSConfig(tlsCfg rest.TLSClientConfig, source string) {
	if len(tlsCfg.CAData) > 0 {
		app.appendCACerts(tlsCfg.CAData, source+" inline CA")
		return
	}
	if tlsCfg.CAFile != "" {
		pemBytes, err := os.ReadFile(tlsCfg.CAFile)
		if err != nil {
			app.logger.Debug("CA file not readable, skipping",
				slog.String("path", tlsCfg.CAFile), slog.Any("error", err))
			return
		}
		app.appendCACerts(pemBytes, source+" CA file")
	}
}

func (app *App) loadClientCert(tlsCfg rest.TLSClientConfig, source string) ([]tls.Certificate, error) {
	if len(tlsCfg.CertData) > 0 && len(tlsCfg.KeyData) > 0 {
		cert, err := tls.X509KeyPair(tlsCfg.CertData, tlsCfg.KeyData)
		if err != nil {
			return nil, fmt.Errorf("failed to load %s inline client certificate: %w", source, err)
		}
		app.logger.Debug("Loaded inline client certificate for proxy mTLS", slog.String("source", source))
		return []tls.Certificate{cert}, nil
	}

	if tlsCfg.CertFile != "" && tlsCfg.KeyFile != "" {
		cert, err := tls.LoadX509KeyPair(tlsCfg.CertFile, tlsCfg.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load %s client certificate files: %w", source, err)
		}
		app.logger.Debug("Loaded client certificate files for proxy mTLS",
			slog.String("source", source), slog.String("cert", tlsCfg.CertFile), slog.String("key", tlsCfg.KeyFile))
		return []tls.Certificate{cert}, nil
	}

	return nil, nil
}

func (app *App) loadEnvtestTLS(testEnv *envtest.Environment) ([]tls.Certificate, error) {
	tlsCfg := testEnv.Config.TLSClientConfig
	app.appendCACerts(tlsCfg.CAData, "envtest")
	return app.loadClientCert(tlsCfg, "envtest")
}

func (app *App) loadKubeconfigTLS() ([]tls.Certificate, error) {
	kubeconfig, err := helpers.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig for TLS: %w", err)
	}
	app.appendCAFromTLSConfig(kubeconfig.TLSClientConfig, "kubeconfig")
	return app.loadClientCert(kubeconfig.TLSClientConfig, "kubeconfig")
}
