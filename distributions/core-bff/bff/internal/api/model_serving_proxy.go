package api

import (
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
	if app.config.MockK8Client {
		app.modelServingProxy = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
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
		return fmt.Errorf("failed to parse model-serving host URL: %w", err)
	}

	allowHTTP := app.config.DevMode || app.config.MockK8Client
	insecureSkipVerify := app.config.InsecureSkipVerify && (app.config.DevMode || app.config.MockK8Client)

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
			return "Bearer " + identity.ResolveToken(app.devFallbackToken)
		},
		StripHeaders:       proxy.SensitiveIngressHeaders(app.config.AuthTokenHeader),
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
