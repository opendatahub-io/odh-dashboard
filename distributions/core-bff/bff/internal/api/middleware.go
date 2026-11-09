package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/rs/cors"
)

func (app *App) RecoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				if err == http.ErrAbortHandler {
					panic(err)
				}
				httpcontract.Log(app.logger, r).Error("panic recovered", "code", "INTERNAL_SERVER_ERROR", "stack_trace", panicStackFrames())
				if httpcontract.Committed(w) {
					panic(http.ErrAbortHandler)
				}
				w.Header().Set(constants.HeaderConnection, constants.ConnectionClose)
				httpcontract.WriteLocal(w, r, http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

const maxPanicStackFrames = 32

// Record bounded code locations without panic text, argument values, or locals.
func panicStackFrames() []string {
	pcs := make([]uintptr, maxPanicStackFrames)
	n := runtime.Callers(2, pcs)
	frames := runtime.CallersFrames(pcs[:n])
	stack := make([]string, 0, n)
	for {
		frame, more := frames.Next()
		stack = append(stack, fmt.Sprintf("%s %s:%d", frame.Function, frame.File, frame.Line))
		if !more || len(stack) == maxPanicStackFrames {
			return stack
		}
	}
}

func (app *App) EnableCORS(next http.Handler) http.Handler {
	if len(app.config.AllowedOrigins) == 0 {
		return next
	}

	allowedHeaders := []string{httpcontract.RequestIDHeader, constants.HeaderContentType, constants.HeaderAuthorization, constants.HeaderForwardedToken, constants.HeaderFeatureFlags}
	if h := app.config.AuthTokenHeader; h != "" && h != constants.HeaderAuthorization && h != constants.HeaderForwardedToken {
		allowedHeaders = append(allowedHeaders, h)
	}

	c := cors.New(cors.Options{
		AllowedOrigins:     app.config.AllowedOrigins,
		AllowCredentials:   true,
		AllowedMethods:     []string{"GET", "PUT", "POST", "PATCH", "DELETE"},
		AllowedHeaders:     allowedHeaders,
		ExposedHeaders:     []string{httpcontract.RequestIDHeader, httpcontract.AuditIDHeader},
		OptionsPassthrough: false,
	})

	return c.Handler(next)
}

func (app *App) EnableTelemetry(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpcontract.EnsureID(w, r)
		traceID := httpcontract.RequestID(r.Context())
		ctx := context.WithValue(r.Context(), constants.TraceIDKey, traceID)

		if app.logger != nil {
			traceLogger := httpcontract.Log(app.logger, r)
			ctx = context.WithValue(ctx, constants.TraceLoggerKey, traceLogger)

			traceLogger.Debug("Incoming HTTP request", slog.Any("request", helpers.RequestLogValuer{Request: r, SensitiveHeaders: []string{app.config.AuthTokenHeader}}))
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := strings.TrimSpace(r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey)))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
