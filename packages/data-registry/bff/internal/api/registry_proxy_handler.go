package api

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/data-registry/bff/internal/constants"
	helper "github.com/opendatahub-io/data-registry/bff/internal/helpers"
	"github.com/opendatahub-io/data-registry/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/data-registry/bff/internal/proxy"
)

// dataRegistryUpstreamStripPrefix is removed from the incoming request path before it is
// forwarded to the upstream Data Registry API — see DataRegistryPathPrefix in app.go.
const dataRegistryUpstreamStripPrefix = "/api"

// DataRegistryReverseProxy returns an http.Handler that forwards every request under
// DataRegistryPathPrefix straight through to the upstream Data Registry API via
// httputil.ReverseProxy (internal/proxy.NewDataRegistryReverseProxy), with no per-operation
// transformation logic.
//
// This is a deliberate single catchall handler rather than one explicit route/handler per
// operation: the BFF is confirmed to be a pure "dumb proxy" for this backend (RHAI-366/RHAI-415;
// "does not perform authorization, data persistence, or business logic"), so new upstream
// endpoints are automatically reachable without any BFF change. Authorization/SAR is enforced by
// the Data Registry server's own kube-rbac-proxy sidecar against the RHOAI project in the path —
// the BFF only needs to forward the caller's bearer token, rebuilt from the verified
// RequestIdentity rather than copied from the incoming request.
func (app *App) DataRegistryReverseProxy() http.Handler {
	reverseProxy := proxy.NewDataRegistryReverseProxy(proxy.DataRegistryProxyConfig{
		// app.dataRegistryAPIURL is re-read (and re-validated) on every call, not just once here
		// at construction time: a background discovery retry loop (data_registry_discovery.go)
		// may set it after this handler is built, once a ConfigMap that was missing at startup
		// appears, and that must take effect without restarting the process. A nil result means
		// "not configured or invalid"; the wrapping handler below already turns that into a 503
		// before ever calling reverseProxy.ServeHTTP, so Rewrite treats nil as defense-in-depth.
		TargetURL: func() *url.URL {
			target, err := helper.ValidateUpstreamURL(app.dataRegistryAPIURL.Get())
			if err != nil {
				return nil
			}
			return target
		},
		StripPrefix:             dataRegistryUpstreamStripPrefix,
		IncomingAuthTokenHeader: app.config.AuthTokenHeader,
		AuthHeaderFn: func(r *http.Request) string {
			identity, ok := r.Context().Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
			if !ok || identity == nil || identity.Token == "" {
				return ""
			}
			return "Bearer " + identity.Token
		},
		InsecureSkipVerify: app.config.InsecureSkipVerify,
		Logger:             app.logger,
	})

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := helper.ValidateUpstreamURL(app.dataRegistryAPIURL.Get()); err != nil {
			app.serviceUnavailableResponse(w, r, fmt.Errorf("data registry API URL is not configured or invalid: %w", err))
			return
		}

		identity, ok := r.Context().Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
		if !ok || identity == nil || identity.Token == "" {
			app.unauthorizedResponse(w, r, fmt.Errorf("missing bearer token in request identity"))
			return
		}

		reverseProxy.ServeHTTP(w, r)
	})
}
