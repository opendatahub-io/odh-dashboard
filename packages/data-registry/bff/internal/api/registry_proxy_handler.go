package api

import (
	"fmt"
	"net/http"

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
	// app.dataRegistryAPIURL may be empty (ConfigMap not deployed yet) or, in principle,
	// malformed. targetErr covers both cases uniformly; the handler below guards on it and
	// returns 503 before ever using target/reverseProxy, so target may be nil here.
	target, targetErr := helper.ValidateUpstreamURL(app.dataRegistryAPIURL)

	reverseProxy := proxy.NewDataRegistryReverseProxy(proxy.DataRegistryProxyConfig{
		TargetURL:   target,
		StripPrefix: dataRegistryUpstreamStripPrefix,
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
		if targetErr != nil {
			app.serviceUnavailableResponse(w, r, fmt.Errorf("data registry API URL is not configured or invalid: %w", targetErr))
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
