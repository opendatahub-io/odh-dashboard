package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
)

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			identity := &k8s.RequestIdentity{
				Token: k8s.NewBearerToken(config.DefaultDisabledAuthToken),
			}
			ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		identity, err := app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)
		if err != nil {
			if app.config.DevMode {
				// DevUser/DevGroups are used for audit log fallback labeling (see auditUser).
				// The resolved identity for k8s operations comes from the kubeconfig's native auth,
				// not from these values - GetUser() does a SelfSubjectReview against the kubeconfig client.
				identity = &k8s.RequestIdentity{
					UserID:      app.config.DevUser,
					Groups:      parseDevGroups(app.config.DevGroups),
					Token:       k8s.NewBearerToken(config.DefaultDisabledAuthToken),
					DevFallback: true,
				}
				app.logger.Warn("dev-mode identity fallback activated", slog.String("user", identity.UserID))
			} else {
				app.unauthorizedResponse(w, r, err)
				return
			}
		}

		ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
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
		app.unauthorizedResponse(w, r, fmt.Errorf("invalid or expired token: %w", err))
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
// Returns 401 for unauthenticated or non-admin users.
func (app *App) secureAdminRoute(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		username, client, identity, ok := app.resolveRequestAuth(w, r, true)
		if !ok {
			return
		}

		isAdmin, err := client.IsUserAdmin(r.Context(), identity)
		if err != nil {
			app.logger.Warn("admin SAR check failed, denying by default", slog.Any("error", err))
			app.emitAuditLogWithAdminCheckError(username, r, err)
			app.unauthorizedResponse(w, r, fmt.Errorf("insufficient permissions to make this request"))
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
	return app.RecoverPanic(app.EnableTelemetry(app.EnableCORS(next)))
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
