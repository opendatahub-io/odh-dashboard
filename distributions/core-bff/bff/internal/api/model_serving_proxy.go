package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/ssrf"
)

const (
	modelServingPathPrefix     = "/api/service/model-serving"
	defaultModelServingHostFmt = "https://model-serving-api.%s.svc.cluster.local:443"
)

func (app *App) initModelServingProxy() error {
	// xKS deploys no model-serving-api. Its gateway discovery is a native route
	// (registerModelServingRoutes) and the rest of the prefix is not served, so
	// no request can be forwarded to a host that does not exist.
	if app.config.PlatformType.IsXKS() {
		if app.config.ModelServingServiceHost != "" {
			app.logger.Warn("MODEL_SERVING_HOST is ignored on xKS: model-serving routes are served natively")
		}
		app.modelServingProxy = nil
		return nil
	}
	if app.config.MockK8Client {
		app.modelServingProxy = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"mock":true}`)) //nolint:errcheck // mock-only handler
		})
		return nil
	}

	host := app.config.ModelServingServiceHost
	if host == "" {
		host = fmt.Sprintf(defaultModelServingHostFmt, app.config.Namespace)
	}

	targetURL, err := url.Parse(host)
	if err != nil {
		// Not wrapped: a url.Error quotes the raw URL, which may carry userinfo.
		return errors.New("MODEL_SERVING_HOST/--model-serving-host is not a valid URL (value omitted)")
	}

	// MOCK_K8S_CLIENT returned the mock handler above; a real target needs DEV_MODE for plaintext.
	allowHTTP := app.config.DevMode
	insecureSkipVerify := app.config.SkipsTLSVerification()

	rp, err := proxy.NewReverseProxy(proxy.ProxyConfig{
		TargetURL:          targetURL,
		RootCAs:            app.rootCAs,
		InsecureSkipVerify: insecureSkipVerify,
		AllowHTTP:          allowHTTP,
		PathRewriteFn: func(r *http.Request) string {
			return strings.TrimPrefix(r.URL.Path, modelServingPathPrefix)
		},
		AuthHeaderFn: func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				// Unreachable: InjectRequestIdentity middleware on serviceMux returns 401
				// before requests reach this handler. Defensive fallback omits the header.
				return ""
			}
			return k8s.BearerHeader(identity.ResolveToken(app.devFallbackToken))
		},
		StripHeaders:       proxy.SensitiveIngressHeaders(app.credentialHeaders()...),
		ModifyResponse:     ssrf.NewRedirectValidator(app.logger),
		SSRFValidateTarget: true,
		SSRFAllowedHosts:   []string{targetURL.Hostname()},
		Logger:             app.logger,
	})
	if err != nil {
		return fmt.Errorf("failed to create model-serving proxy: %w", err)
	}

	app.modelServingProxy = rp
	return nil
}
