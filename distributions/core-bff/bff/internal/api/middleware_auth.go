package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/callerauth"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			// With auth disabled there is never a caller credential. In DEV_MODE
			// the request runs as the kubeconfig identity, exactly like the
			// no-credential fallback below, so the REST clients and the
			// Kubernetes proxies (which present the kubeconfig certificate only
			// for DevFallback) keep working against a real cluster. Without
			// DEV_MODE, disabled auth is for mock clients only.
			identity := &k8s.RequestIdentity{
				Token:       k8s.NewBearerToken(config.DefaultDisabledAuthToken),
				DevFallback: app.config.DevMode,
			}
			if app.config.DevMode {
				identity.UserID = app.config.DevUser
				identity.Groups = parseDevGroups(app.config.DevGroups)
			}
			ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		identity, err := app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)
		// A configured header that was sent, but blank, is the caller's
		// (invalid) credential: no other token and no fallback replaces it.
		if err != nil && app.config.DevMode && errors.Is(err, httpcontract.ErrCredentialsMissing) &&
			!app.configuredHeaderSent(r.Header) {
			// None of the configured headers is present. A caller token in the
			// other identity header (the host dashboard's module proxy sends
			// Authorization) or in a WebSocket bearer subprotocol is still the
			// caller's credential: use it, never the developer's identity. Any
			// other credential header that was sent, even blank (net/http
			// delivers a blank header as an empty value, so presence is checked
			// by key), is rejected. Only a request with no credential at all
			// falls back.
			if alt, ok := app.alternateCredential(r); ok {
				identity, err = app.kubernetesClientFactory.ExtractRequestIdentity(alt)
			} else if !app.credentialHeaderSent(r.Header) {
				// DevUser/DevGroups are used for audit log fallback labeling (see auditUser).
				// The resolved identity for k8s operations comes from the kubeconfig's native auth,
				// not from these values - GetUser() does a SelfSubjectReview against the kubeconfig client.
				identity, err = &k8s.RequestIdentity{
					UserID:      app.config.DevUser,
					Groups:      parseDevGroups(app.config.DevGroups),
					Token:       k8s.NewBearerToken(config.DefaultDisabledAuthToken),
					DevFallback: true,
				}, nil
				app.logger.Warn("dev-mode identity fallback activated", slog.String("user", identity.UserID))
			}
		}
		if err != nil {
			// A credential that was sent but is malformed is the caller's and
			// fails; it is never swapped for a stronger one.
			app.unauthorizedResponse(w, r, err)
			return
		}

		ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// credentialHeaders returns every header that may carry the caller credential:
// the configured ordered list (or the single AUTH_TOKEN_HEADER) plus
// AUTH_TOKEN_HEADER itself, which module proxies use as their outbound header.
// Every inbound copy is stripped before proxying, redacted in logs, allowed by
// CORS and listed in Vary.
func (app *App) credentialHeaders() []string {
	headers := callerauth.New(app.config).Headers()
	if h := http.CanonicalHeaderKey(strings.TrimSpace(app.config.AuthTokenHeader)); h != "" && !slices.Contains(headers, h) {
		headers = append(headers, h)
	}
	return slices.DeleteFunc(headers, func(h string) bool { return h == "" })
}

// credentialHeaderSent reports whether the request carries any credential
// header the BFF treats as one (credentialHeaders, which includes the legacy
// AUTH_TOKEN_HEADER in list mode), even with an empty value. A token sent in
// any of them is never swapped for the DEV_MODE kubeconfig identity.
func (app *App) credentialHeaderSent(h http.Header) bool {
	for _, name := range app.credentialHeaders() {
		if _, ok := h[name]; ok {
			return true
		}
	}
	return false
}

// configuredHeaderSent reports whether any of the configured credential
// headers is present, even with an empty value.
func (app *App) configuredHeaderSent(h http.Header) bool {
	for _, name := range callerauth.New(app.config).Headers() {
		if _, ok := h[name]; ok && name != "" {
			return true
		}
	}
	return false
}

// alternateCredential looks, under DEV_MODE, for a caller credential the
// configured headers did not carry: a WebSocket bearer subprotocol (a browser
// can only send its token that way) or the other standard identity header
// (Authorization or X-Forwarded-Access-Token) when it is not one of the
// configured ones, read with the ordered-list rules. It re-expresses the token in the first configured header,
// in that header's format, so the factory parses it exactly like a normal
// request. A malformed or empty one is passed on as an empty credential, which
// the factory rejects as invalid.
func (app *App) alternateCredential(r *http.Request) (http.Header, bool) {
	configured := callerauth.New(app.config).Headers()
	if len(configured) == 0 || configured[0] == "" {
		return nil, false
	}
	if token, ok := proxy.BearerSubprotocolToken(r); ok {
		return app.credentialIn(configured[0], token), true
	}
	var others []string
	for _, name := range []string{constants.HeaderAuthorization, constants.HeaderForwardedToken} {
		if !slices.ContainsFunc(configured, func(c string) bool { return strings.EqualFold(c, name) }) {
			others = append(others, name)
		}
	}
	if len(others) == 0 {
		return nil, false
	}
	// The other identity headers follow the list rules: Authorization must be
	// Bearer, a repeated header or two different tokens fail closed.
	cred, err := callerauth.Ordered(others...).Extract(r.Header)
	switch {
	case errors.Is(err, httpcontract.ErrCredentialsMissing):
		// Sent but blank is still the caller's credential, an invalid one.
		for _, name := range others {
			if _, sent := r.Header[http.CanonicalHeaderKey(name)]; sent {
				return app.credentialIn(configured[0], ""), true
			}
		}
		return nil, false
	case err != nil:
		return app.credentialIn(configured[0], ""), true
	default:
		return app.credentialIn(configured[0], cred.Token), true
	}
}

// credentialIn expresses token in header, in the format the extractor expects
// there: "Bearer <token>" for Authorization in list mode, the configured
// prefix in single-header mode, the bare token otherwise. An empty token is an
// empty value, which the factory rejects as invalid.
func (app *App) credentialIn(header, token string) http.Header {
	out := http.Header{}
	if token == "" {
		out[http.CanonicalHeaderKey(header)] = []string{""}
		return out
	}
	switch {
	case len(app.config.AuthTokenHeaders) == 0:
		out.Set(header, app.config.AuthTokenPrefix+token)
	case strings.EqualFold(header, constants.HeaderAuthorization):
		out.Set(header, "Bearer "+token)
	default:
		out.Set(header, token)
	}
	return out
}

// auditUser returns the best available user identifier for audit logging.
// Falls back to "unknown" when the identity has no resolved UserID.
func auditUser(identity *k8s.RequestIdentity, logger *slog.Logger) string {
	if identity != nil && identity.UserID != "" {
		return identity.UserID
	}
	logger.Warn("could not resolve user identity for audit log")
	return "unknown"
}

// resolveRequestAuth extracts the identity from context, obtains a k8s client, and
// resolves the username via SelfSubjectReview. On failure it writes the appropriate
// error response and returns false. needsAdmin is forwarded to the audit log.
func (app *App) resolveRequestAuth(w http.ResponseWriter, r *http.Request, needsAdmin bool) (string, k8s.KubernetesClientInterface, *k8s.RequestIdentity, bool) {
	ctx := r.Context()

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.emitAuditLog("unknown", r, needsAdmin, false)
		app.unauthorizedResponse(w, r, fmt.Errorf("missing identity"))
		return "", nil, nil, false
	}

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.emitAuditLog(auditUser(identity, app.logger), r, needsAdmin, false)
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return "", nil, nil, false
	}

	username, err := client.GetUser(ctx, nil)
	if err != nil {
		app.emitAuditLog(auditUser(identity, app.logger), r, needsAdmin, false)
		app.serverErrorResponse(w, r, err)
		return "", nil, nil, false
	}

	return username, client, identity, true
}

// secureRoute wraps a handler with token validation and audit logging.
// Returns 401 if no valid identity is present in the context.
// Namespace validation is handled separately by isAllowedNamespace.
func (app *App) secureRoute(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		username, _, _, ok := app.resolveRequestAuth(w, r, false)
		if !ok {
			return
		}

		app.emitAuditLog(username, r, false, false)
		next(w, r, ps)
	}
}

// secureAdminRoute wraps a handler with token validation, admin check, and audit logging.
// Returns 401 for unauthenticated users, 403 for non-admin users.
func (app *App) secureAdminRoute(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		username, client, identity, ok := app.resolveRequestAuth(w, r, true)
		if !ok {
			return
		}

		isAdmin, err := client.IsUserAdmin(r.Context(), identity)
		if err != nil {
			httpcontract.Log(app.logger, r).Warn("admin SAR check failed", "code", httpcontract.SafeErrorCode(err))
			app.emitAuditLogWithAdminCheckError(username, r, err)
			app.serverErrorResponse(w, r, fmt.Errorf("failed to evaluate admin status: %w", err))
			return
		}
		if !isAdmin {
			app.emitAuditLog(username, r, true, false)
			app.forbiddenResponse(w, r, fmt.Errorf("insufficient permissions to make this request"))
			return
		}

		app.emitAuditLog(username, r, true, true)
		next(w, r, ps)
	}
}

// requirePlatform returns 404 if the current platform does not match the required type.
// Composes with secureRoute/secureAdminRoute:
//
//	r.GET(path, app.secureRoute(app.requirePlatform(config.PlatformOpenShift, handler)))
func (app *App) requirePlatform(platform config.PlatformType, next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.config.PlatformType != platform {
			app.notFoundResponse(w, r)
			return
		}
		next(w, r, ps)
	}
}

// requirePlatformPublic returns 404 if the current platform does not match the required type.
// This is the http.Handler variant of requirePlatform, for use with public routes registered
// on the outer mux rather than the httprouter-based apiRouter.
func (app *App) requirePlatformPublic(platform config.PlatformType, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.config.PlatformType != platform {
			app.notFoundResponse(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// isAllowedNamespace checks if the namespace matches the dashboard or workbench namespace.
// When WorkbenchNamespace is not configured, it defaults to the dashboard namespace.
func (app *App) isAllowedNamespace(namespace string) bool {
	if namespace == app.config.Namespace {
		return true
	}
	wbNS := app.config.WorkbenchNamespace
	if wbNS == "" {
		wbNS = app.config.Namespace
	}
	return namespace == wbNS
}

// publicRoute wraps a handler to explicitly mark it as unauthenticated.
// No auth enforcement is applied. Use this on combinedMux registrations
// that intentionally skip authentication (healthcheck, OpenAPI, static files).
func (app *App) publicRoute(next http.Handler) http.Handler {
	return next
}

// publicRouteFunc is a convenience wrapper for publicRoute with a plain handler function.
func (app *App) publicRouteFunc(f func(http.ResponseWriter, *http.Request)) http.Handler {
	return app.publicRoute(http.HandlerFunc(f))
}

// parseDevGroups splits a comma-separated group string into a slice.
// Returns nil for empty input.
func parseDevGroups(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	groups := make([]string, 0, len(parts))
	for _, p := range parts {
		if g := strings.TrimSpace(p); g != "" {
			groups = append(groups, g)
		}
	}
	return groups
}
