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
	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
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

func (app *App) EnableCORS(next http.Handler) http.Handler {
	if len(app.config.AllowedOrigins) == 0 {
		// CORS is disabled, this middleware becomes a noop.
		return next
	}

	c := cors.New(cors.Options{
		AllowedOrigins:     app.config.AllowedOrigins,
		AllowCredentials:   true,
		AllowedMethods:     []string{"GET", "PUT", "POST", "PATCH", "DELETE"},
		AllowedHeaders:     []string{constants.KubeflowUserIDHeader, constants.KubeflowUserGroupsIdHeader},
		Debug:              app.config.LogLevel == slog.LevelDebug,
		OptionsPassthrough: false,
	})

	return c.Handler(next)
}

func (app *App) EnableTelemetry(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Adds a unique id to the context to allow tracing of requests
		traceId := uuid.NewString()
		ctx := context.WithValue(r.Context(), constants.TraceIdKey, traceId)

		// logger will only be nil in tests.
		if app.logger != nil {
			traceLogger := app.logger.With(slog.String("trace_id", traceId))
			ctx = context.WithValue(ctx, constants.TraceLoggerKey, traceLogger)

			traceLogger.Debug("Incoming HTTP request", slog.Any("request", helper.RequestLogValuer{Request: r}))
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}

		// Validate namespace against DNS-1123 label rules
		if err := kubernetes.ValidateNamespaceName(namespace); err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace: %w", err))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// RequireAccessToService enforces RBAC-based authorization for Pipeline Server access in the namespace.
// Performs a SSAR to check if the user can list DSPipelineApplications before proceeding.
func (app *App) RequireAccessToService(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()
		logger := helper.GetContextLoggerFromReq(r)

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
			return
		}

		allowed, err := app.k8sService.CanAccessResource(ctx, namespace, "list",
			"datasciencepipelinesapplications.opendatahub.io", "datasciencepipelinesapplications", "")
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to check permissions: %w", err))
			return
		}

		if !allowed {
			app.forbiddenResponse(w, r, "user does not have permission to access pipeline servers in this namespace")
			return
		}

		logger.Debug("User authorized to access pipeline servers in namespace", "namespace", namespace)

		next(w, r, ps)
	}
}

func preserveRawPath(next http.Handler) http.Handler {
	s3FilesPrefix := ApiPathPrefix + "/s3/files/"

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if escaped := r.URL.EscapedPath(); strings.HasPrefix(escaped, s3FilesPrefix) {
			r.URL.Path = escaped
		}
		next.ServeHTTP(w, r)
	})
}
