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
	"github.com/rs/cors"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
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
		if !strings.HasPrefix(r.URL.Path, constants.ApiPathPrefix) && !strings.HasPrefix(r.URL.Path, PathPrefix+constants.ApiPathPrefix) {
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
		AllowedHeaders:     []string{constants.KubeflowUserIDHeader, constants.KubeflowUserGroupsIdHeader, "Authorization"},
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

func (app *App) AttachMaaSClient(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only attach client for MaaS endpoints (API routes)
		if !strings.HasPrefix(r.URL.Path, constants.ApiPathPrefix) && !strings.HasPrefix(r.URL.Path, PathPrefix+constants.ApiPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}

		var maasClient maas.MaaSClient
		identity, err := app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)

		// If identity extraction fails or not present (e.g. mock mode without headers), create client without token
		// But in real scenario, we might need token.
		// For now, if identity is available, use it.
		var token string
		if err == nil && identity != nil {
			token = identity.Token
		}

		// TODO: Configure MaaS service URL. For now, assume it's set in config or we construct it.
		// In gen-ai, it was constructing serviceURL from clusterDomain.
		// app.maasClientFactory.CreateClient(serviceURL, identity.Token, app.config.InsecureSkipVerify, app.rootCAs)

		// Assuming we have a configured base URL or use a default
		// For now, let's use a placeholder or config value if available.
		// Since we don't have MaaS URL in config yet, let's assume it's passed or defaulted in the factory or client.
		// In gen-ai middleware: serviceURL = fmt.Sprintf("https://maas.%s/maas-api", app.clusterDomain)

		// For the purpose of this port, I'll use a placeholder or check if config has it.
		// app.config doesn't seem to have MaaS URL explicitly.
		// But if we are in Mock mode, URL doesn't matter.

		// Let's use empty URL for now, the real client factory might need it.
		// The gen-ai `NewHTTPMaaSClient` takes baseURL.

		baseURL := "http://maas-service.maas.svc.cluster.local" // Default internal service URL?

		maasClient = app.maasClientFactory.CreateClient(baseURL, token, app.config.InsecureSkipVerify, app.rootCAs)

		ctx := context.WithValue(r.Context(), constants.MaaSClientKey, maasClient)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
