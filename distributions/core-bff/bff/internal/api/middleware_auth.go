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
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
)

func requiresAuth(path string) bool {
	return strings.HasPrefix(path, APIPathPrefix) ||
		strings.HasPrefix(path, PathPrefix+APIPathPrefix) ||
		strings.HasPrefix(path, proxy.K8sProxyPrefix) ||
		strings.HasPrefix(path, PathPrefix+proxy.K8sProxyPrefix) ||
		strings.HasPrefix(path, proxy.WssProxyPrefix) ||
		strings.HasPrefix(path, PathPrefix+proxy.WssProxyPrefix)
}

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !requiresAuth(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

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
func auditUser(identity *k8s.RequestIdentity) string {
	if identity != nil && identity.UserID != "" {
		return identity.UserID
	}
	return "unknown"
}

// secureRoute wraps a handler with token validation and audit logging.
// Returns 401 if no valid identity is present in the context.
// Namespace validation is handled separately by isAllowedNamespace.
func (app *App) secureRoute(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.emitAuditLog("unknown", r, false, false)
			app.unauthorizedResponse(w, r, fmt.Errorf("missing identity"))
			return
		}

		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.emitAuditLog(auditUser(identity), r, false, false)
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		username, err := client.GetUser(ctx, nil)
		if err != nil {
			app.emitAuditLog(auditUser(identity), r, false, false)
			app.unauthorizedResponse(w, r, fmt.Errorf("invalid or expired token: %w", err))
			return
		}

		app.emitAuditLogAsync(ctx, client, username, identity, r, false)
		next(w, r, ps)
	}
}

// secureAdminRoute wraps a handler with token validation, admin check, and audit logging.
// Returns 401 for unauthenticated or non-admin users.
// Audit logging is synchronous here (unlike secureRoute) because admin status is already
// known from the SSAR guard check - no background resolution needed.
func (app *App) secureAdminRoute(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.emitAuditLog("unknown", r, true, false)
			app.unauthorizedResponse(w, r, fmt.Errorf("missing identity"))
			return
		}

		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.emitAuditLog(auditUser(identity), r, true, false)
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		username, err := client.GetUser(ctx, nil)
		if err != nil {
			app.emitAuditLog(auditUser(identity), r, true, false)
			app.unauthorizedResponse(w, r, fmt.Errorf("invalid or expired token: %w", err))
			return
		}

		isAdmin, err := client.IsUserAdmin(ctx, identity)
		if err != nil {
			app.logger.Warn("admin SAR check failed, denying by default", slog.Any("error", err))
			app.emitAuditLog(username, r, true, false)
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
