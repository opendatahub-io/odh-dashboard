package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"

	"github.com/google/uuid"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	helper "github.com/opendatahub-io/llama-stack-modular-ui/internal/helpers"
	"github.com/rs/cors"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/auth"
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

func (app *App) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !app.config.OAuthEnabled {
			next.ServeHTTP(w, r)
			return
		}

		token, err := auth.ExtractToken(r)
		if err != nil {
			app.forbiddenResponse(w, r, "authentication required")
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		oauthHandler := auth.NewOAuthHandler(app.config, logger)
		if err := oauthHandler.ValidateToken(r.Context(), token); err != nil {
			app.forbiddenResponse(w, r, err.Error())
			return
		}

		// Store token in context for downstream use
		ctx := context.WithValue(r.Context(), constants.AuthTokenKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *App) RequireAuthRoute(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if !app.config.OAuthEnabled {
			next(w, r, ps)
			return
		}
		token, err := auth.ExtractToken(r)
		if err != nil {
			app.forbiddenResponse(w, r, "authentication required")
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		oauthHandler := auth.NewOAuthHandler(app.config, logger)
		if err := oauthHandler.ValidateToken(r.Context(), token); err != nil {
			app.forbiddenResponse(w, r, err.Error())
			return
		}

		// Store token in context for downstream use
		ctx := context.WithValue(r.Context(), constants.AuthTokenKey, token)
		next(w, r.WithContext(ctx), ps)
	}
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
