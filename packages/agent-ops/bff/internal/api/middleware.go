package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/google/uuid"
	"github.com/rs/cors"
)

type contextKey string

const (
	traceIDKey contextKey = "traceID"
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
		ctx := context.WithValue(r.Context(), traceIDKey, traceID)

		if app.logger != nil {
			traceLogger := app.logger.With(slog.String("trace_id", traceID))
			traceLogger.Debug("Incoming HTTP request",
				slog.String("method", r.Method),
				slog.String("uri", r.URL.RequestURI()),
			)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
