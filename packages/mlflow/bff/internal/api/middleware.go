package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
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

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip header check for non-API paths (healthcheck, static files).
		if !strings.HasPrefix(r.URL.Path, APIPathPrefix) && !strings.HasPrefix(r.URL.Path, PathPrefix+APIPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}

		if app.config.AuthMethod == config.AuthMethodDisabled {
			next.ServeHTTP(w, r)
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

func (app *App) EnableCORS(next http.Handler) http.Handler {
	if len(app.config.AllowedOrigins) == 0 {
		// CORS is disabled, this middleware becomes a noop.
		return next
	}

	allowedHeaders := []string{"Content-Type", "Authorization", "X-Forwarded-Access-Token"}
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
		traceID := uuid.NewString()
		ctx := context.WithValue(r.Context(), constants.TraceIDKey, traceID)

		if app.logger != nil {
			traceLogger := app.logger.With(slog.String("trace_id", traceID))
			ctx = context.WithValue(ctx, constants.TraceLoggerKey, traceLogger)

			traceLogger.Debug("Incoming HTTP request", slog.Any("request", helper.RequestLogValuer{Request: r}))
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AttachWorkspace reads the workspace query parameter and stores it in context.
// Returns 400 if the parameter is missing.
func (app *App) AttachWorkspace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		workspace := strings.TrimSpace(r.URL.Query().Get("workspace"))
		if workspace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: workspace"))
			return
		}
		ctx := context.WithValue(r.Context(), constants.WorkspaceQueryParameterKey, workspace)
		r = r.WithContext(ctx)
		next(w, r, ps)
	}
}

// RequireValidIdentity validates that a RequestIdentity is present in the context
// and that it passes validation checks via the Kubernetes client factory.
func (app *App) RequireValidIdentity(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()
		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}
		if err := app.kubernetesClientFactory.ValidateRequestIdentity(identity); err != nil {
			app.unauthorizedResponse(w, r, err)
			return
		}
		next(w, r, ps)
	}
}

// AttachMLflowClient creates a per-request MLflow client with auth and workspace headers
// and attaches it to the context. Reads auth token from RequestIdentity (set by
// InjectRequestIdentity) and workspace from context (set by AttachWorkspace).
// RequireValidIdentity must run before this middleware in the chain.
func (app *App) AttachMLflowClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		var token string
		if app.config.AuthMethod != config.AuthMethodDisabled {
			identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}
			token = identity.Token.Raw()
		}

		workspace, _ := ctx.Value(constants.WorkspaceQueryParameterKey).(string)

		mlflowClient, err := app.mlflowClientFactory.GetClient(ctx, token, workspace)
		if err != nil {
			if errors.Is(err, mlflowpkg.ErrMLflowNotConfigured) {
				app.logger.Warn("MLflow endpoint called but MLflow is not configured",
					"method", r.Method, "uri", r.URL.RequestURI())
				httpErr := &HTTPError{
					StatusCode: http.StatusServiceUnavailable,
					Error:      ErrorPayload{Code: "service_unavailable", Message: "MLflow is not configured"},
				}
				app.errorResponse(w, r, httpErr)
				return
			}
			if errors.Is(err, mlflowpkg.ErrTokenRequired) {
				app.errorResponse(w, r, &HTTPError{
					StatusCode: http.StatusUnauthorized,
					Error:      ErrorPayload{Code: "authentication_required", Message: "authentication token is required"},
				})
				return
			}
			if errors.Is(err, mlflowpkg.ErrNamespaceRequired) {
				app.badRequestResponse(w, r, fmt.Errorf("workspace namespace is required"))
				return
			}
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get MLflow client: %w", err))
			return
		}

		ctx = context.WithValue(ctx, constants.MLflowClientKey, mlflowClient)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
