package api

import (
	"context"
	"fmt"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"

	"github.com/google/uuid"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
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

func (app *App) AttachRESTClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		// Set up a child logger for the rest client that automatically adds the request id to all statements for
		// tracing.
		restClientLogger := app.logger
		if app.logger != nil {
			traceId, ok := r.Context().Value(constants.TraceIdKey).(string)
			if ok {
				restClientLogger = app.logger.With(slog.String("trace_id", traceId))
			} else {
				app.logger.Warn("Failed to set trace_id for tracing")
			}
		}

		baseUrl := app.config.LlamaStackURL

		restHttpClient, err := integrations.NewHTTPClient(restClientLogger, baseUrl)

		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to create http client: %v", err))
			return
		}
		ctx := context.WithValue(r.Context(), constants.LlamaStackHttpClientKey, restHttpClient)
		next(w, r.WithContext(ctx), ps)
	}
}

func (app *App) InjectRequestIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//skip use headers check if we are not on /api/v1 (i.e. we are on /healthcheck and / (static fe files) )
		if !strings.HasPrefix(r.URL.Path, ApiPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}

		//TODO: store somewhere e.g. app so it doesn't have to be recreated each time.
		tokenFactory := integrations.NewTokenClientFactory(app.logger, app.config)

		identity, error := tokenFactory.ExtractRequestIdentity(r.Header)
		if error != nil {
			app.badRequestResponse(w, r, error)
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

		//TODO: store somewhere e.g. app so it doesn't have to be recreated each time.
		tokenFactory := integrations.NewTokenClientFactory(app.logger, app.config)

		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		if err := tokenFactory.ValidateRequestIdentity(identity); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		//TODO Insert logic to verify user is authorized to make a call to llamastack service once decided how
		// this could be with an SSAR or possibly just attaching the token to all upstream requests and allowing
		// llamastack to validate this.

		logger := helper.GetContextLoggerFromReq(r)

		// Simply used to validate basic functionality, remove when implemented as identity is redacted in logs anyhow.
		logger.Info("User is authorized as: ", slog.Any("RequestIdentity", identity))

		next(w, r, ps)
	}
}
