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
	"github.com/opendatahub-io/mod-arch-library/bff/internal/config"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/constants"
	helper "github.com/opendatahub-io/mod-arch-library/bff/internal/helpers"
	k8s "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/kubernetes"
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

		// If authentication is disabled, skip identity extraction.
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next.ServeHTTP(w, r)
			return
		}

		identity, error := app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)
		if error != nil {
			app.unauthorizedResponse(w, r, error)
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

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}
		if !isValidDNS1123Label(namespace) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace %q", namespace))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// AttachNamespaceFromParam reads a namespace from an httprouter path parameter and injects it
// into the request context under NamespaceHeaderParameterKey.
// This middleware must be placed before RequireAccessToService for path-scoped routes.
func (app *App) AttachNamespaceFromParam(paramName string, next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := ps.ByName(paramName)
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required path parameter: %s", paramName))
			return
		}
		if !isValidDNS1123Label(namespace) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace %q", namespace))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// authenticateAgentRequest validates caller identity for agent routes when auth is enabled.
func (app *App) authenticateAgentRequest(w http.ResponseWriter, r *http.Request) (*k8s.RequestIdentity, bool) {
	if app.config.AuthMethod == config.AuthMethodDisabled {
		return nil, true
	}

	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return nil, false
	}

	if app.kubernetesClientFactory == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("kubernetes client factory is not configured"))
		return nil, false
	}

	if err := app.kubernetesClientFactory.ValidateRequestIdentity(identity); err != nil {
		app.unauthorizedResponse(w, r, err)
		return nil, false
	}

	return identity, true
}

// RequireAuthenticatedForAgents ensures agent API routes receive a valid identity when auth is enabled.
// Namespace-scoped SSAR filtering for list results is performed in the Kubernetes agent client.
func (app *App) RequireAuthenticatedForAgents(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if _, ok := app.authenticateAgentRequest(w, r); !ok {
			return
		}
		next(w, r, ps)
	}
}

// RequireAccessToService validates identity and checks whether the user can list services in the
// namespace injected by AttachNamespace or AttachNamespaceFromParam.
// This middleware must be placed after InjectRequestIdentity and a namespace-attachment middleware.
func (app *App) RequireAccessToService(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()

		identity, ok := app.authenticateAgentRequest(w, r)
		if !ok {
			return
		}

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
			return
		}

		k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		allowed, err := k8sClient.CanListServicesInNamespace(ctx, identity, namespace)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to check namespace access: %w", err))
			return
		}

		if !allowed {
			app.forbiddenResponse(w, r, "user does not have permission to access services in this namespace")
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("User authorized to access services in namespace", "namespace", namespace)

		next(w, r, ps)
	}
}

// RequireAccessToAgent validates identity and checks whether the user can read agent
// workloads and services in the namespace injected by AttachNamespace or AttachNamespaceFromParam.
func (app *App) RequireAccessToAgent(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()

		identity, ok := app.authenticateAgentRequest(w, r)
		if !ok {
			return
		}

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
			return
		}

		agentName := ps.ByName("name")
		if agentName == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required path parameter: name"))
			return
		}
		if !isValidDNS1123Label(agentName) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid agent name %q", agentName))
			return
		}

		k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}

		allowed, err := k8sClient.CanGetAgentInNamespace(ctx, identity, namespace, agentName)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to check agent access: %w", err))
			return
		}

		if !allowed {
			app.forbiddenResponse(w, r, "user does not have permission to access agents in this namespace")
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("User authorized to access agents in namespace", "namespace", namespace)

		next(w, r, ps)
	}
}
