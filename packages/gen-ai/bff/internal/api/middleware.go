package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/config"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations"

	"github.com/google/uuid"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/rs/cors"
)

func (app *App) RecoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				w.Header().Set("Connection", "close")
				app.serverErrorResponse(w, r, fmt.Errorf("%s", err))
				logger := helper.GetContextLoggerFromReq(r)
				logger.Error("Recovered from panic", slog.String("stack_trace", string(debug.Stack())))
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
		AllowedHeaders:     []string{},
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

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//skip use headers check if we are not on the configured API path prefix (i.e. we are on /healthcheck and / (static fe files) )
		// Check for both direct API path and prefixed API path
		isAPIPath := strings.HasPrefix(r.URL.Path, app.config.APIPathPrefix) ||
			strings.HasPrefix(r.URL.Path, constants.PathPrefix+app.config.APIPathPrefix)

		if !isAPIPath {
			next.ServeHTTP(w, r)
			return
		}

		// If authentication is disabled, skip identity extraction
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

func (app *App) RequireAccessToService(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		// If authentication is disabled skip these steps.
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()
		identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)

		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		if err := app.kubernetesClientFactory.ValidateRequestIdentity(identity); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		// Apply LlamaStack authorization check to all endpoints that require namespace access
		// This ensures consistent security across all services (LlamaStack, MCP, etc.)
		// Check if namespace is present in context (set by AttachNamespace middleware)
		if namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok && namespace != "" {
			// Get Kubernetes client to perform SAR
			k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
			if err != nil {
				app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
				return
			}

			// Perform SubjectAccessReview to check if user can list LlamaStackDistribution resources
			// This ensures users have proper permissions to access any service in the namespace
			allowed, err := k8sClient.CanListLlamaStackDistributions(ctx, identity, namespace)
			if err != nil {
				app.serverErrorResponse(w, r, fmt.Errorf("failed to check LlamaStackDistribution permissions: %w", err))
				return
			}

			if !allowed {
				app.forbiddenResponse(w, r, "user does not have permission to access services in this namespace")
				return
			}

			logger := helper.GetContextLoggerFromReq(r)
			logger.Debug("User authorized to access services in namespace", "namespace", namespace)
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("Request authorized")

		next(w, r, ps)
	}
}

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := r.URL.Query().Get(string(constants.NamespaceQueryParameterKey))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceQueryParameterKey))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceQueryParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// AttachLlamaStackClient middleware creates a LlamaStack client for the namespace and attaches it to context.
// This middleware must be used after AttachNamespace middleware.
//
// Gets the LlamaStack URL from the namespace-specific LlamaStackDistribution resource's status.serviceURL field.
func (app *App) AttachLlamaStackClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
			return
		}

		// Use request-scoped logger to avoid nil-panic in tests/environments where app.logger is not set
		logger := helper.GetContextLoggerFromReq(r)

		var llamaStackClient llamastack.LlamaStackClientInterface

		// Check if running in mock mode
		if app.config.MockLSClient {
			logger.Debug("MOCK MODE: creating mock LlamaStack client for namespace", "namespace", namespace)
			// In mock mode, use empty URL since mock factory ignores it
			llamaStackClient = app.llamaStackClientFactory.CreateClient("", "", app.config.InsecureSkipVerify, app.rootCAs)
		} else {
			var serviceURL string
			// Use environment variable if explicitly set (developer override)
			if app.config.LlamaStackURL != "" {
				serviceURL = app.config.LlamaStackURL
				logger.Debug("Using LLAMA_STACK_URL environment variable (developer override)",
					"namespace", namespace,
					"serviceURL", serviceURL)
			} else {
				identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
				if !ok || identity == nil {
					app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
					return
				}

				k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
				if err != nil {
					app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
					return
				}

				// Get LlamaStackDistribution list using existing client method
				lsdList, err := k8sClient.GetLlamaStackDistributions(ctx, identity, namespace)
				if err != nil {
					app.serverErrorResponse(w, r, fmt.Errorf("failed to get LlamaStackDistributions: %w", err))
					return
				}

				if len(lsdList.Items) == 0 {
					app.serverErrorResponse(w, r, fmt.Errorf("no LlamaStackDistribution found in namespace %q", namespace))
					return
				}
				if len(lsdList.Items) > 1 {
					app.logger.Warn(fmt.Sprintf("warning: %d LlamaStackDistributions found in namespace %q, using the first", len(lsdList.Items), namespace))
				}

				lsd := lsdList.Items[0]
				serviceURL = lsd.Status.ServiceURL

				if serviceURL == "" {
					app.serverErrorResponse(w, r, fmt.Errorf("LlamaStackDistribution %s has no service url", lsd.Name))
					return
				}

				logger.Debug("Using ServiceURL from LlamaStackDistribution",
					"namespace", namespace,
					"lsdName", lsd.Name,
					"serviceURL", serviceURL)
			}

			logger.Debug("Creating LlamaStack client for namespace",
				"namespace", namespace,
				"serviceURL", serviceURL)

			// Create LlamaStack client per-request using app factory (consistent with K8s pattern)
			// Get identity from context for auth token
			identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
			if !ok || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}

			// Create LlamaStack client with auth token from identity
			llamaStackClient = app.llamaStackClientFactory.CreateClient(serviceURL, identity.Token, app.config.InsecureSkipVerify, app.rootCAs)
		}

		// Attach ready-to-use client to context
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// AttachMaaSClient middleware creates a MaaS client and attaches it to context.
// This middleware can be used independently and doesn't require namespace.
//
// In mock mode, creates a mock client. In real mode, uses autodiscovery or configured MaaS URL.
// Uses RequestIdentity from context for authentication, consistent with other clients.
func (app *App) AttachMaaSClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Use request-scoped logger to avoid nil-panic in tests/environments where app.logger is not set
		logger := helper.GetContextLoggerFromReq(r)

		var maasClient maas.MaaSClient

		// Check if running in mock mode
		if app.config.MockMaaSClient {
			logger.Debug("MOCK MODE: creating mock MaaS client")
			// In mock mode, use empty URL since mock factory ignores it
			maasClient = app.maasClientFactory.CreateClient("", "", app.config.InsecureSkipVerify, app.rootCAs)
		} else {
			var serviceURL string

			// Configuration Priority:
			// 1. MAAS_URL env var (if set for local dev)
			// 2. Autodiscovered endpoint (production default)

			if app.config.MaaSURL != "" {
				// Priority 1: Use environment variable if explicitly set
				serviceURL = app.config.MaaSURL
				logger.Debug("Using MAAS_URL environment variable (developer override)",
					"serviceURL", serviceURL)
			} else {
				// Priority 2: Autodiscovery using cluster domain
				if app.kubernetesClientFactory == nil {
					app.handleMaaSClientError(w, r, maas.NewServerUnavailableError(""))
					return
				}

				k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
				if err != nil {
					logger.Error("failed to get Kubernetes client for MaaS autodiscovery", "error", err)
					app.handleMaaSClientError(w, r, maas.NewServerUnavailableError(""))
					return
				}

				clusterDomain, err := k8sClient.GetClusterDomain(ctx)
				if err != nil {
					logger.Error("failed to get cluster domain for MaaS autodiscovery", "error", err)
					app.handleMaaSClientError(w, r, maas.NewServerUnavailableError(""))
					return
				}

				serviceURL = fmt.Sprintf("https://maas.%s/maas-api", clusterDomain)
				logger.Debug("Using autodiscovered MaaS endpoint",
					"clusterDomain", clusterDomain,
					"serviceURL", serviceURL)
			}

			// Get RequestIdentity from context (set by InjectRequestIdentity middleware)
			identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
			if !ok || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}

			logger.Debug("Creating MaaS client",
				"serviceURL", serviceURL,
				"hasAuthToken", identity.Token != "")

			// Create MaaS client per-request using app factory with auth token from RequestIdentity
			maasClient = app.maasClientFactory.CreateClient(serviceURL, identity.Token, app.config.InsecureSkipVerify, app.rootCAs)
		}

		// Attach ready-to-use client to context
		ctx = context.WithValue(ctx, constants.MaaSClientKey, maasClient)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
