package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/config"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/proxy"
	"github.com/rs/cors"
)

func (app *App) RecoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				w.Header().Set("Connection", "close")
				app.serverErrorResponse(w, r, fmt.Errorf("%s", err))
				app.logger.Error("Recovered from panic", slog.String("stack_trace", string(debug.Stack())))
			}
		}()

		next.ServeHTTP(w, r)
	})
}

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
			app.unauthorizedResponse(w, r, err)
			return
		}

		ctx := context.WithValue(r.Context(), constants.RequestIdentityKey, identity)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// requireAdmin wraps a handler and rejects non-admin users with 401.
// Uses the SSAR check: patch on auths/default-auth.
// TODO(task3): replace with secureAdminRoute once the full auth chain is implemented.
func (app *App) requireAdmin(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		client, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.unauthorizedResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.unauthorizedResponse(w, r, fmt.Errorf("missing identity"))
			return
		}

		isAdmin, err := client.IsUserAdmin(ctx, identity)
		if err != nil {
			app.logger.Warn("admin SAR check failed, denying by default", slog.Any("error", err))
		}
		if err != nil || !isAdmin {
			app.unauthorizedResponse(w, r, fmt.Errorf("you lack the sufficient permissions to make this request"))
			return
		}

		next(w, r, ps)
	}
}

// validateCallerToken verifies the caller's token is valid by performing a SelfSubjectReview.
// Required for handlers that serve SA-backed data and would otherwise accept garbage tokens.
func (app *App) validateCallerToken(ctx context.Context) error {
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Kubernetes client: %w", err)
	}
	_, err = client.GetUser(ctx, nil)
	if err != nil {
		return fmt.Errorf("invalid or expired token: %w", err)
	}
	return nil
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

func (app *App) EnableCORS(next http.Handler) http.Handler {
	if len(app.config.AllowedOrigins) == 0 {
		return next
	}

	allowedHeaders := []string{"Content-Type", "Authorization", "X-Forwarded-Access-Token", "x-odh-feature-flags"}
	if h := app.config.AuthTokenHeader; h != "" && h != "Authorization" && h != "X-Forwarded-Access-Token" {
		allowedHeaders = append(allowedHeaders, h)
	}

	c := cors.New(cors.Options{
		AllowedOrigins:     app.config.AllowedOrigins,
		AllowCredentials:   true,
		AllowedMethods:     []string{"GET", "PUT", "POST", "PATCH", "DELETE"},
		AllowedHeaders:     allowedHeaders,
		Debug:              app.config.LogLevel == slog.LevelDebug,
		OptionsPassthrough: false,
	})

	return c.Handler(next)
}

func (app *App) EnableTelemetry(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Adds a unique id to the context to allow tracing of requests
		traceID := uuid.NewString()
		ctx := context.WithValue(r.Context(), constants.TraceIDKey, traceID)

		// logger will only be nil in tests.
		if app.logger != nil {
			traceLogger := app.logger.With(slog.String("trace_id", traceID))
			ctx = context.WithValue(ctx, constants.TraceLoggerKey, traceLogger)

			traceLogger.Debug("Incoming HTTP request", slog.Any("request", helpers.RequestLogValuer{Request: r}))
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := strings.TrimSpace(r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey)))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
