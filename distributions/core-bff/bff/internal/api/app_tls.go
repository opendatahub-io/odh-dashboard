package api

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"

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
	// An entry that does not load is logged by position, never by value: it
	// may not be a path at all (a pasted PEM block, say).
	for i, p := range bundlePaths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		pemBytes, readErr := os.ReadFile(p)
		if readErr != nil {
			logger.Debug("CA bundle not readable, skipping", slog.Int("entry", i+1), slog.String("problem", config.FileProblem(readErr)))
			continue
		}
		if ok := rootCAs.AppendCertsFromPEM(pemBytes); !ok {
			logger.Debug("No certs appended from PEM bundle", slog.Int("entry", i+1))
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

// kubernetesProxyRootCAs returns the trust pool for the Kubernetes HTTP and
// WebSocket proxies: the shared outbound pool (system + BUNDLE_PATHS) plus,
// once the caller appends it, the kubeconfig or envtest CA. It is always a
// copy. The kubeconfig CA is trusted for the API server only, so appending it
// to app.rootCAs in place would also make the model-serving, module, inter-BFF
// and Prometheus transports trust it, which the runtime contract rules out.
func (app *App) kubernetesProxyRootCAs() *x509.CertPool {
	if app.rootCAs != nil {
		return app.rootCAs.Clone()
	}
	if pool, err := x509.SystemCertPool(); err == nil {
		return pool
	}
	return x509.NewCertPool()
}

func (app *App) appendCACerts(pool *x509.CertPool, pem []byte, source string) error {
	if len(pem) == 0 {
		return nil
	}
	if !pool.AppendCertsFromPEM(pem) {
		return fmt.Errorf("failed to append CA certs from %s: PEM data contains no valid certificates", source)
	}
	app.logger.Debug("Loaded CA certs", slog.String("source", source))
	return nil
}

func (app *App) appendCAFromTLSConfig(pool *x509.CertPool, tlsCfg rest.TLSClientConfig, source string) error {
	if len(tlsCfg.CAData) > 0 {
		return app.appendCACerts(pool, tlsCfg.CAData, source+" inline CA")
	}
	if tlsCfg.CAFile != "" {
		pemBytes, err := os.ReadFile(tlsCfg.CAFile)
		if err != nil {
			return fmt.Errorf("failed to read %s CA file %s: %w", source, tlsCfg.CAFile, err)
		}
		return app.appendCACerts(pool, pemBytes, source+" CA file")
	}
	return nil
}

func (app *App) loadClientCert(tlsCfg rest.TLSClientConfig, source string) ([]tls.Certificate, error) {
	hasCertData := len(tlsCfg.CertData) > 0
	hasKeyData := len(tlsCfg.KeyData) > 0
	hasCertFile := tlsCfg.CertFile != ""
	hasKeyFile := tlsCfg.KeyFile != ""

	if hasCertData && hasKeyData {
		cert, err := tls.X509KeyPair(tlsCfg.CertData, tlsCfg.KeyData)
		if err != nil {
			return nil, fmt.Errorf("failed to load %s inline client certificate: %w", source, err)
		}
		app.logger.Debug("Loaded inline client certificate for proxy mTLS", slog.String("source", source))
		return []tls.Certificate{cert}, nil
	}
	if hasCertData != hasKeyData {
		return nil, fmt.Errorf("incomplete %s inline client certificate: both CertData and KeyData are required", source)
	}

	if hasCertFile && hasKeyFile {
		cert, err := tls.LoadX509KeyPair(tlsCfg.CertFile, tlsCfg.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("failed to load %s client certificate files: %w", source, err)
		}
		app.logger.Debug("Loaded client certificate files for proxy mTLS",
			slog.String("source", source), slog.String("cert", tlsCfg.CertFile), slog.String("key", tlsCfg.KeyFile))
		return []tls.Certificate{cert}, nil
	}
	if hasCertFile != hasKeyFile {
		return nil, fmt.Errorf("incomplete %s client certificate files: both CertFile and KeyFile are required", source)
	}

	return nil, nil
}

func (app *App) loadEnvtestTLS(pool *x509.CertPool, testEnv *envtest.Environment) ([]tls.Certificate, error) {
	tlsCfg := testEnv.Config.TLSClientConfig
	if err := app.appendCACerts(pool, tlsCfg.CAData, "envtest"); err != nil {
		return nil, err
	}
	return app.loadClientCert(tlsCfg, "envtest")
}

// loadKubeconfigTLS adds the kubeconfig CA to pool and returns the client
// certificate the Kubernetes proxies present, if any.
//
// The proxies are caller-scoped: every request carries the caller's bearer
// token. A kubeconfig client certificate is the BFF's own identity, and the
// API server does not define which authenticator wins when a request carries
// both, so presenting it could authorize the call as the certificate owner.
// It is therefore returned only in DEV_MODE, where the developer's kubeconfig
// identity is the documented fallback for requests without a token.
func (app *App) loadKubeconfigTLS(pool *x509.CertPool, kubeconfig *rest.Config, devMode bool) ([]tls.Certificate, error) {
	if err := app.appendCAFromTLSConfig(pool, kubeconfig.TLSClientConfig, "kubeconfig"); err != nil {
		return nil, err
	}
	certs, err := app.loadClientCert(kubeconfig.TLSClientConfig, "kubeconfig")
	if err != nil {
		return nil, err
	}
	if len(certs) > 0 && !devMode {
		app.logger.Info("Kubeconfig client certificate is not presented on caller-scoped Kubernetes proxy requests; callers authenticate with their own token")
		return nil, nil
	}
	return certs, nil
}

// requireVerifiedKubeconfig rejects a kubeconfig that disables API server
// certificate verification (insecure-skip-tls-verify) outside DEV_MODE. Both
// the service-account clients and the per-caller clients are built from this
// configuration, and client-go honours its Insecure flag regardless of
// INSECURE_SKIP_VERIFY, so the production rule has to be applied here.
func requireVerifiedKubeconfig(cfg config.EnvConfig, kubeconfig *rest.Config) error {
	if kubeconfig != nil && kubeconfig.Insecure && cfg.IsProductionProfile() {
		return errors.New("the kubeconfig disables Kubernetes API certificate verification (insecure-skip-tls-verify), which is not supported in a production profile; supply the cluster CA instead, or set DEV_MODE=true for local development")
	}
	// A plaintext API server would receive the service-account token (and,
	// through the discovery probe, before any proxy refuses it) in the clear.
	// client-go resolves a scheme-less Host to http unless TLS settings are
	// present, so the scheme it would actually use is checked.
	if kubeconfig != nil && cfg.IsProductionProfile() {
		if u, _, err := rest.DefaultServerUrlFor(kubeconfig); err != nil || u.Scheme != "https" {
			return errors.New("the kubeconfig API server does not resolve to an https:// URL, which is not supported in a production profile; set DEV_MODE=true for a local plaintext API server")
		}
	}
	return nil
}
