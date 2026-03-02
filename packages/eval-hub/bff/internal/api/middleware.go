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
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
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
		//skip use headers check if we are not on /api/v1 (i.e. we are on /healthcheck and / (static fe files) )
		if !strings.HasPrefix(r.URL.Path, ApiPathPrefix) && !strings.HasPrefix(r.URL.Path, PathPrefix+ApiPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}

		identity, error := app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)
		if error != nil {
			app.badRequestResponse(w, r, error)
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

// AttachEvalHubClient middleware creates an EvalHub client and attaches it to context.
//
// Priority for resolving the EvalHub service URL:
//  1. MOCK_EVAL_HUB_CLIENT=true  → mock client (test/dev mode, no URL needed)
//  2. EVAL_HUB_URL env var set   → developer override, use the explicit URL
//  3. Namespace in context       → auto-discover URL from EvalHub CR (status.serviceURL)
//
// Auto-discovery requires AttachNamespace middleware to have run first (namespace in context).
func (app *App) AttachEvalHubClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) func(http.ResponseWriter, *http.Request, httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		logger := helper.GetContextLoggerFromReq(r)

		var client evalhub.EvalHubClientInterface

		if app.config.MockEvalHubClient {
			logger.Debug("MOCK MODE: creating mock EvalHub client")
			client = app.evalHubClientFactory.CreateClient("", "", app.config.InsecureSkipVerify, app.rootCAs, "/api/v1")
		} else {
			identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
			if !ok || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}

			var serviceURL string

			if app.config.EvalHubURL != "" {
				// Priority 2: explicit developer override
				serviceURL = app.config.EvalHubURL
				logger.Debug("Using EVAL_HUB_URL environment variable (developer override)",
					"serviceURL", serviceURL)
			} else {
				// Priority 3: auto-discover from EvalHub CR in the namespace
				namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
				if !ok || namespace == "" {
					app.badRequestResponse(w, r, fmt.Errorf(
						"namespace query parameter is required for EvalHub CR auto-discovery when EVAL_HUB_URL is not set"))
					return
				}

				k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
				if err != nil {
					app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
					return
				}

				discoveredURL, err := k8sClient.GetEvalHubServiceURL(ctx, identity, namespace)
				if err != nil {
					app.serverErrorResponse(w, r, fmt.Errorf("failed to discover EvalHub service URL from CR: %w", err))
					return
				}

				serviceURL = discoveredURL
				logger.Debug("Using auto-discovered EvalHub service URL from CR",
					"namespace", namespace,
					"serviceURL", serviceURL)
			}

			client = app.evalHubClientFactory.CreateClient(
				serviceURL,
				identity.Token,
				app.config.InsecureSkipVerify,
				app.rootCAs,
				"/api/v1",
			)
		}

		ctx = context.WithValue(ctx, constants.EvalHubClientKey, client)
		next(w, r.WithContext(ctx), ps)
	}
}

// RequireAccessToService validates that the user has permission to list EvalHub CRs in the
// namespace that was injected by the AttachNamespace middleware.
// This middleware must be placed after both InjectRequestIdentity and AttachNamespace.
func (app *App) RequireAccessToService(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			// No namespace in context — skip the access check (namespace-less endpoints).
			next(w, r, ps)
			return
		}

		k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		allowed, err := k8sClient.CanListEvalHubInstances(ctx, identity, namespace)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to check EvalHub access: %w", err))
			return
		}

		if !allowed {
			app.forbiddenResponse(w, r, "user does not have permission to access EvalHub in this namespace")
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("User authorized to access EvalHub in namespace", "namespace", namespace)

		next(w, r, ps)
	}
}

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
