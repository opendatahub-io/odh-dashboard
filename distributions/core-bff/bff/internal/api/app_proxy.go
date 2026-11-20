package api

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

func impersonateFromIdentity(in *http.Request, out http.Header) {
	identity, ok := in.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil || identity.UserID == "" {
		return
	}
	out.Set(constants.HeaderImpersonateUser, identity.UserID)
	for _, g := range identity.Groups {
		out.Add(constants.HeaderImpersonateGroup, g)
	}
}

// devFallbackClientCerts decides whether the kubeconfig client certificate may
// be presented by the Kubernetes HTTP and WebSocket proxies, and returns it only
// for the DEV_MODE kubeconfig-identity fallback.
//
// The API server authenticates a client certificate before it looks at a bearer
// token, so attaching the mounted kubeconfig certificate to a proxied request
// would authenticate it as the certificate's subject, not the caller. It is
// never attached to a request that carries a caller credential, in any mode:
// the proxies present it only for a DevFallback identity (DEV_MODE, no caller
// credential), which authenticates with the kubeconfig on purpose. Outside
// DEV_MODE it is not presented at all. The typed client-go clients are already
// safe: rest.AnonymousClientConfig drops the certificate before the caller
// token is installed.
func devFallbackClientCerts(cfg config.EnvConfig, certs []tls.Certificate, logger *slog.Logger) []tls.Certificate {
	if len(certs) == 0 {
		return nil
	}
	if cfg.DevMode {
		return certs
	}
	logger.Warn("kubeconfig carries a client certificate; not presenting it on the Kubernetes proxies so it cannot replace the caller credential")
	return nil
}

func resolveK8sHost(cfg config.EnvConfig, k8sResult k8sSetupResult) (string, error) {
	if cfg.MockK8Client && k8sResult.testEnv != nil {
		return k8sResult.testEnv.Config.Host, nil
	}
	kubeconfig, err := helpers.GetKubeconfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for proxy: %w", err)
	}
	return kubeconfig.Host, nil
}

func (app *App) initK8sProxy(cfg config.EnvConfig, k8sResult k8sSetupResult) error {
	k8sHost, err := resolveK8sHost(cfg, k8sResult)
	if err != nil {
		return err
	}

	// clientCerts go on every proxied request (envtest mock mode, identity via
	// impersonation); devCerts only on DevFallback requests.
	var clientCerts, devCerts []tls.Certificate
	if cfg.MockK8Client && k8sResult.testEnv != nil {
		clientCerts, err = app.loadEnvtestTLS(k8sResult.testEnv)
		if err != nil {
			return err
		}
	} else {
		kubeconfigCerts, loadErr := app.loadKubeconfigTLS()
		if loadErr != nil {
			return loadErr
		}
		devCerts = devFallbackClientCerts(cfg, kubeconfigCerts, app.logger)
	}

	allowHTTP := cfg.DevMode || cfg.MockK8Client
	insecureSkipVerify := cfg.InsecureSkipVerify && (cfg.DevMode || cfg.MockK8Client)

	var outboundHeadersFn func(*http.Request, http.Header)
	if cfg.MockK8Client {
		outboundHeadersFn = impersonateFromIdentity
	}

	var devFallbackToken string
	if cfg.DevMode && !cfg.MockK8Client {
		kc, kcErr := helpers.GetKubeconfig()
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
		K8sHost:                k8sHost,
		RootCAs:                app.rootCAs,
		ClientCerts:            clientCerts,
		DevFallbackClientCerts: devCerts,
		InsecureSkipVerify:     insecureSkipVerify,
		AllowHTTP:              allowHTTP,
		AuthTokenHeader:        cfg.AuthTokenHeader,
		AuthTokenHeaders:       app.credentialHeaders(),
		SetOutboundHeadersFn:   outboundHeadersFn,
		SSRFValidateTarget:     true,
		DevFallbackToken:       devFallbackToken,
		Logger:                 app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create K8s proxy: %w", err)
	}
	app.k8sProxy = k8sProxyHandler

	app.wsTracker = proxy.NewConnectionTracker(app.logger)

	wsHandler, err := proxy.NewWsProxyHandler(proxy.WsProxyConfig{
		K8sHost:                k8sHost,
		RootCAs:                app.rootCAs,
		ClientCerts:            clientCerts,
		DevFallbackClientCerts: devCerts,
		InsecureSkipVerify:     insecureSkipVerify,
		AllowHTTP:              allowHTTP,
		AllowedOrigins:         cfg.AllowedOrigins,
		SSRFValidateTarget:     true,
		DevFallbackToken:       devFallbackToken,
		Tracker:                app.wsTracker,
		Logger:                 app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create WebSocket proxy: %w", err)
	}
	app.wsProxy = wsHandler

	return nil
}
