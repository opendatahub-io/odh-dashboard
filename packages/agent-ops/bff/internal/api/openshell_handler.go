package api

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
)

// OpenShell is a separate service the dashboard authenticates into with a
// SECOND token (Token B), distinct from the RHOAI/OpenShift token (Token A)
// used for namespace-scoped agent CRs. This file implements the dashboard side
// of that "double auth":
//
//   - /openshell/auth/config  — advertises the (non-secret) Keycloak client the
//     browser uses for silent OIDC (prompt=none) to obtain Token B.
//   - /openshell/*            — reverse-proxies OpenShell API calls to the
//     OpenShell relay BFF, forwarding ONLY Token B (carried on a dedicated
//     header the RHOAI gateway leaves untouched) and stripping Token A
//     credentials at the trust boundary.
const (
	OpenShellPathPrefix     = "/openshell"
	OpenShellAuthConfigPath = OpenShellPathPrefix + "/auth/config"
	// OpenShellAuthHeader is the dedicated header the browser uses to carry
	// Token B. RHOAI's data-science-gateway ext-authz rewrites Authorization
	// and x-forwarded-access-token to the platform's OWN OpenShift token
	// (Token A), so Token B must ride a header the gateway leaves untouched.
	// Must match OPENSHELL_AUTH_HEADER in the frontend (openShellAuth.ts).
	OpenShellAuthHeader = "X-OpenShell-Authorization"
)

// openShellAuthConfig is the non-secret client config the browser needs to run
// the silent OIDC flow that mints Token B.
type openShellAuthConfig struct {
	// Configured is true only when both the proxy target and the OIDC issuer are
	// set — i.e. the double-auth data plane is wired.
	Configured bool `json:"configured"`
	// SharedSession is true when OpenShell shares the dashboard IdP (silent OIDC
	// possible). When false, the browser must perform an explicit OpenShell login.
	SharedSession bool   `json:"sharedSession"`
	Issuer        string `json:"issuer,omitempty"`
	ClientID      string `json:"clientId,omitempty"`
	Audience      string `json:"audience,omitempty"`
	Scope         string `json:"scope,omitempty"`
}

// OpenShellAuthConfigHandler serves the browser's OIDC client config. It never
// returns a token or any secret — the browser performs the OIDC flow itself.
func (app *App) OpenShellAuthConfigHandler(w http.ResponseWriter, r *http.Request) {
	cfg := openShellAuthConfig{
		Configured: strings.TrimSpace(app.config.OpenShellBFFURL) != "" &&
			strings.TrimSpace(app.config.OpenShellOIDCIssuer) != "",
		SharedSession: app.config.OpenShellOIDCSharedSession,
		Issuer:        app.config.OpenShellOIDCIssuer,
		ClientID:      app.config.OpenShellOIDCClientID,
		Audience:      app.config.OpenShellOIDCAudience,
		Scope:         app.config.OpenShellOIDCScope,
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(cfg); err != nil {
		helper.GetContextLoggerFromReq(r).Error("failed to encode OpenShell auth config", slog.Any("error", err))
	}
}

// OpenShellProxyHandler builds a reverse proxy to the OpenShell relay BFF. When
// OPENSHELL_BFF_URL is unset it returns a handler that reports the feature is
// disabled, so the routes can always be registered.
func (app *App) OpenShellProxyHandler() (http.Handler, error) {
	target := strings.TrimSpace(app.config.OpenShellBFFURL)
	if target == "" {
		app.logger.Info("OPENSHELL_BFF_URL not set; OpenShell reverse proxy disabled")
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			writeOpenShellError(w, http.StatusServiceUnavailable, "openshell_disabled",
				"OpenShell is not configured for this deployment")
		}), nil
	}

	targetURL, err := url.Parse(target)
	if err != nil {
		return nil, fmt.Errorf("invalid OPENSHELL_BFF_URL %q: %w", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Honor the app's trusted CA pool / insecure-skip-verify for the outbound
	// TLS connection to the relay BFF (serving-cert on-cluster).
	proxy.Transport = &http.Transport{
		TLSClientConfig: &tls.Config{
			RootCAs:            app.rootCAs,
			InsecureSkipVerify: app.config.InsecureSkipVerify, //nolint:gosec // config-gated (INSECURE_SKIP_VERIFY), dev/POC only
		},
	}

	origDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		origDirector(req) // rewrites scheme/host to the target
		// Strip the /openshell prefix so the relay BFF sees its own /api/v1/... paths.
		req.URL.Path = strings.TrimPrefix(req.URL.Path, OpenShellPathPrefix)
		if req.URL.Path == "" {
			req.URL.Path = "/"
		}
		req.Host = targetURL.Host

		// ── DOUBLE-AUTH TRUST BOUNDARY ──────────────────────────────────
		// The RHOAI/OpenShift credentials (Token A) must NOT cross into the
		// OpenShell service. Critically, RHOAI's fronting gateway (kube-auth-proxy)
		// OWNS both `Authorization` and `x-forwarded-access-token`, rewriting them
		// to the platform's OpenShift access token (Token A, an opaque token the
		// OpenShell gateway cannot validate). So Token B arrives on a dedicated
		// header (OpenShellAuthHeader) the gateway passes through untouched.
		//
		// Extract Token B, then clobber every Token A header + the RHOAI session
		// cookie, and re-project Token B onto BOTH the relay's primary header
		// (x-forwarded-access-token) and Authorization so no Token A value can
		// leak downstream regardless of the relay's precedence chain.
		tokenB := strings.TrimSpace(strings.TrimPrefix(req.Header.Get(OpenShellAuthHeader), "Bearer "))
		if tokenB == "" {
			// Standalone/dev fallback: no fronting gateway rewriting Authorization.
			tokenB = strings.TrimSpace(strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer "))
		}

		req.Header.Del(OpenShellAuthHeader)
		req.Header.Del("X-Forwarded-Access-Token")
		req.Header.Del("Authorization")
		req.Header.Del("X-Auth-Request-User")
		req.Header.Del("X-Auth-Request-Groups")
		req.Header.Del("X-Auth-Request-Email")
		req.Header.Del("X-Auth-Request-Preferred-Username")
		req.Header.Del("Cookie")

		if tokenB != "" {
			req.Header.Set("X-Forwarded-Access-Token", tokenB)
			req.Header.Set("Authorization", "Bearer "+tokenB)
		}
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, perr error) {
		helper.GetContextLoggerFromReq(r).Error("OpenShell reverse proxy error",
			slog.Any("error", perr), slog.String("path", r.URL.Path))
		writeOpenShellError(w, http.StatusBadGateway, "openshell_unreachable",
			"OpenShell service is unavailable")
	}

	return proxy, nil
}

func writeOpenShellError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"code": code, "message": message})
}
