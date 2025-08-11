package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"

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
		//skip use headers check if we are not on the configured API path prefix (i.e. we are on /healthcheck and / (static fe files) )
		if !strings.HasPrefix(r.URL.Path, app.config.APIPathPrefix) {
			next.ServeHTTP(w, r)
			return
		}

		// If authentication is disabled, skip identity extraction
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next.ServeHTTP(w, r)
			return
		}

		identity, error := app.tokenFactory.ExtractRequestIdentity(r.Header)
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

		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		if err := app.tokenFactory.ValidateRequestIdentity(identity); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		// Implement service-level authorization
		if err := app.authorizeServiceAccess(identity); err != nil {
			app.forbiddenResponse(w, r, err.Error())
			return
		}

		logger := helper.GetContextLoggerFromReq(r)
		logger.Debug("Request authorized", slog.String("user_id", identity.UserID))

		next(w, r, ps)
	}
}

// authorizeServiceAccess implements service-level authorization logic
// to verify the user/service has permission to access the llamastack service
func (app *App) authorizeServiceAccess(identity *integrations.RequestIdentity) error {
	// Basic authorization check - ensure user has a valid identity
	if identity == nil {
		return fmt.Errorf("missing user identity")
	}

	// Check if user has a valid token
	if identity.Token == "" {
		return fmt.Errorf("missing authentication token")
	}

	// Check if user has a valid user ID
	if identity.UserID == "" {
		return fmt.Errorf("missing user ID")
	}

	// TODO: Add more sophisticated authorization logic here as needed:
	// - Check user permissions/roles
	// - Validate against user groups
	// - Check rate limiting
	// - Verify service-specific permissions

	// For now, we'll allow access if the basic identity validation passes
	// This can be extended with more complex authorization rules as needed
	return nil
}
