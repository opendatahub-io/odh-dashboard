package api

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"k8s.io/client-go/rest"
)

// impersonateFromIdentity sets the envtest impersonation headers for a mocked
// test user. A DevFallback identity is not impersonated: like the mocked REST
// clients, it runs as the envtest admin identity, so the default disabled-auth
// dev profile reaches the same resources through REST and the proxy.
func impersonateFromIdentity(in *http.Request, out http.Header) {
	identity, ok := in.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil || identity.UserID == "" || identity.DevFallback {
		return
	}
	out.Set(constants.HeaderImpersonateUser, identity.UserID)
	for _, g := range identity.Groups {
		out.Add(constants.HeaderImpersonateGroup, g)
	}
}

func resolveK8sHost(cfg config.EnvConfig, k8sResult k8sSetupResult) (string, error) {
	if cfg.MockK8Client && k8sResult.testEnv != nil {
		return k8sResult.testEnv.Config.Host, nil
	}
	kubeconfig, err := k8sResult.restConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for proxy: %w", err)
	}
	serverURL, err := kubeconfigServerURL(kubeconfig)
	if err != nil {
		return "", fmt.Errorf("failed to resolve the kubeconfig API server URL for proxy: %w", err)
	}
	return serverURL, nil
}

// kubeconfigServerURL returns the API server URL client-go resolves for the
// REST clients, not the raw Host: a scheme-less host:port becomes https://
// when TLS settings are present (http:// otherwise), and a base path in the
// server URL is kept. requireVerifiedKubeconfig checks the same URL.
func kubeconfigServerURL(kubeconfig *rest.Config) (string, error) {
	serverURL, _, err := rest.DefaultServerUrlFor(kubeconfig)
	if err != nil {
		return "", err
	}
	return serverURL.String(), nil
}

func (app *App) initK8sProxy(cfg config.EnvConfig, k8sResult k8sSetupResult) error {
	k8sHost, err := resolveK8sHost(cfg, k8sResult)
	if err != nil {
		return err
	}

	// The proxies get their own pool so the kubeconfig CA never reaches the
	// other outbound transports that share app.rootCAs.
	k8sRootCAs := app.kubernetesProxyRootCAs()
	// envtest: the client certificate is the BFF's own identity on every
	// request. Kubeconfig: it is the developer's identity and is presented only
	// on DEV_MODE fallback requests, never next to a token the caller sent.
	var clientCerts, fallbackCerts []tls.Certificate
	if cfg.MockK8Client && k8sResult.testEnv != nil {
		clientCerts, err = app.loadEnvtestTLS(k8sRootCAs, k8sResult.testEnv)
		if err != nil {
			return err
		}
	} else {
		kubeconfig, kcErr := k8sResult.restConfig()
		if kcErr != nil {
			return fmt.Errorf("failed to get kubeconfig for TLS: %w", kcErr)
		}
		fallbackCerts, err = app.loadKubeconfigTLS(k8sRootCAs, kubeconfig, cfg.DevMode)
		if err != nil {
			return err
		}
	}

	// Plaintext only for local development or the in-process envtest server;
	// MOCK_K8S_CLIENT alone never relaxes a real API server connection.
	allowHTTP := cfg.DevMode || (cfg.MockK8Client && k8sResult.testEnv != nil)
	insecureSkipVerify := cfg.SkipsTLSVerification()

	var outboundHeadersFn func(*http.Request, http.Header)
	if cfg.MockK8Client {
		outboundHeadersFn = impersonateFromIdentity
	}

	var devFallbackToken string
	if cfg.DevMode && !cfg.MockK8Client {
		kc, kcErr := k8sResult.restConfig()
		if kcErr != nil {
			app.logger.Warn("Failed to get kubeconfig for dev fallback token", slog.Any("error", kcErr))
		} else if kc != nil {
			devFallbackToken = kc.BearerToken
			if devFallbackToken == "" {
				app.logger.Warn("Kubeconfig has no bearer token; dev fallback will use request identity")
			}
		}
	}
	app.devFallbackToken = devFallbackToken

	k8sProxyHandler, err := proxy.NewK8sProxyHandler(proxy.K8sProxyConfig{
		K8sHost:              k8sHost,
		RootCAs:              k8sRootCAs,
		ClientCerts:          clientCerts,
		FallbackClientCerts:  fallbackCerts,
		InsecureSkipVerify:   insecureSkipVerify,
		AllowHTTP:            allowHTTP,
		AuthTokenHeader:      cfg.AuthTokenHeader,
		AuthTokenHeaders:     app.credentialHeaders(),
		SetOutboundHeadersFn: outboundHeadersFn,
		SSRFValidateTarget:   true,
		DevFallbackToken:     devFallbackToken,
		Logger:               app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create K8s proxy: %w", err)
	}
	app.k8sProxy = k8sProxyHandler

	app.wsTracker = proxy.NewConnectionTracker(app.logger)

	wsHandler, err := proxy.NewWsProxyHandler(proxy.WsProxyConfig{
		K8sHost:             k8sHost,
		RootCAs:             k8sRootCAs,
		ClientCerts:         clientCerts,
		FallbackClientCerts: fallbackCerts,
		InsecureSkipVerify:  insecureSkipVerify,
		AllowHTTP:           allowHTTP,
		AllowedOrigins:      cfg.AllowedOrigins,
		SSRFValidateTarget:  true,
		DevFallbackToken:    devFallbackToken,
		Tracker:             app.wsTracker,
		Logger:              app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create WebSocket proxy: %w", err)
	}
	app.wsProxy = wsHandler

	return nil
}
