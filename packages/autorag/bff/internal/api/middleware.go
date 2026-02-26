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
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
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

// AttachPipelineServerClient middleware creates a Pipeline Server client and attaches it to context.
// This middleware must be used after AttachNamespace middleware.
//
// The pipelineServerId is extracted from query parameters and used to discover
// the Pipeline Server's URL from the DSPipelineApplication CR in the namespace.
func (app *App) AttachPipelineServerClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
			return
		}

		// Get pipeline server ID from query params
		pipelineServerId := r.URL.Query().Get("pipelineServerId")
		if pipelineServerId == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required parameter: pipelineServerId"))
			return
		}

		logger := helper.GetContextLoggerFromReq(r)

		// Create pipeline server client (mock or real based on configuration)
		if app.config.MockPipelineServerClient {
			logger.Debug("MOCK MODE: creating mock Pipeline Server client",
				"namespace", namespace,
				"pipelineServerId", pipelineServerId)
			pipelineServerClient := app.pipelineServerClientFactory.CreateClient("", "", false, app.rootCAs)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
		} else {
			// Construct the Pipeline Server API URL
			// Check for override URL (for local development/testing)
			var baseURL string
			if app.config.PipelineServerURL != "" {
				baseURL = app.config.PipelineServerURL
				logger.Debug("Using override Pipeline Server URL from config", "baseURL", baseURL)
			} else {
				// Service discovery and validation is available via the /api/v1/pipeline-servers endpoint
				// Here we construct the URL based on Kubernetes service DNS naming convention
				baseURL = fmt.Sprintf("https://ds-pipeline-%s.%s.svc.cluster.local:8443", pipelineServerId, namespace)
			}

			// Extract auth token from request to forward to Pipeline Server
			authToken := ""
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				authToken = strings.TrimPrefix(authHeader, "Bearer ")
				logger.Debug("Extracted auth token from Authorization header", "tokenLength", len(authToken))
			} else {
				logger.Debug("No Authorization header found or invalid format", "authHeader", authHeader)
			}

			insecureSkipVerify := app.config.InsecureSkipVerify

			logger.Debug("Creating Pipeline Server client",
				"namespace", namespace,
				"pipelineServerId", pipelineServerId,
				"baseURL", baseURL,
				"hasToken", authToken != "")

			pipelineServerClient := app.pipelineServerClientFactory.CreateClient(
				baseURL,
				authToken,
				insecureSkipVerify,
				app.rootCAs,
			)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
		}

		r = r.WithContext(ctx)
		next(w, r, ps)
	}
}
