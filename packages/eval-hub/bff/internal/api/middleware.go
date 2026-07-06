package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"runtime/debug"
	"strings"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/rs/cors"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
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

// evalHubServiceURL resolves the EvalHub service URL and the caller's auth token for the
// current request. It is shared between AttachEvalHubClient and EvalHubServiceHealthHandler.
//
// Return values:
//   - serviceURL  — the URL to use for the EvalHub REST client.
//   - authToken   — the caller's bearer token (empty when using an env-override URL and no
//     identity is present, e.g. in dev mode).
//   - crNotFound  — true when no EvalHub CR exists in either namespace (not an error;
//     callers should surface this as a distinct state rather than 500).
//   - err         — a real unexpected error (K8s API failure, missing identity, etc.).
//
// Priority (evaluated per-request):
//  1. EVAL_HUB_URL env override — used directly; no K8s call needed.
//  2. EvalHubDiscovery ConfigMap in the user's tenant namespace (preferred for multi-tenant).
//  3. CR discovery in the user-selected namespace (from context, if present).
//  4. Fallback CR discovery in app.dashboardNamespace (covers the health endpoint and cases
//     where the CR lives in the platform namespace).
//
// Mock mode is NOT handled here; callers must short-circuit before calling this function.
func (app *App) evalHubServiceURL(ctx context.Context) (serviceURL, authToken string, crNotFound bool, err error) {
	// Check the env override first so auth-disabled dev mode works without an identity in context.
	if app.config.EvalHubURL != "" {
		identity, _ := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
		if identity != nil {
			authToken = identity.Token
		}
		return app.config.EvalHubURL, authToken, false, nil
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		return "", "", false, fmt.Errorf("missing RequestIdentity in context")
	}
	authToken = identity.Token

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return "", "", false, fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	// Try the EvalHubDiscovery ConfigMap in the user's tenant namespace first.
	// The operator injects this ConfigMap into each tenant namespace so the BFF can resolve
	// the service URL without needing access to the EvalHub CR in the operator namespace.
	if userNS, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string); ok && userNS != "" {
		discoveryURL, err := k8sClient.GetEvalHubDiscoveryURL(ctx, identity, userNS)
		if err != nil {
			return "", "", false, fmt.Errorf("EvalHubDiscovery ConfigMap lookup failed in namespace %q: %w", userNS, err)
		}
		if discoveryURL != "" {
			return discoveryURL, authToken, false, nil
		}
	}

	// Fallback: Try CR discovery in the user-selected namespace.
	// Permission errors (Forbidden/NotFound) are non-fatal — fall through to the dashboard
	// namespace where the CR typically lives.  Operational failures (API unavailable, network
	// errors, etc.) are surfaced immediately so they are not silently masked.
	if userNS, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string); ok && userNS != "" {
		crStatus, err := k8sClient.GetEvalHubCRStatus(ctx, identity, userNS)
		if err != nil {
			var statusErr *k8serrors.StatusError
			if errors.As(err, &statusErr) && (k8serrors.IsForbidden(statusErr) || k8serrors.IsNotFound(statusErr)) {
				if logger := helper.GetContextLogger(ctx); logger != nil {
					logger.Debug("EvalHub CR lookup not permitted in user namespace, falling through to dashboard namespace",
						"namespace", userNS, "reason", statusErr.Status().Reason)
				}
			} else {
				return "", "", false, fmt.Errorf("EvalHub CR lookup failed in namespace %q: %w", userNS, err)
			}
		} else if crStatus != nil && strings.TrimSpace(crStatus.URL) != "" {
			return crStatus.URL, authToken, false, nil
		}
	}

	// Fallback to the dashboard (platform) namespace for the health endpoint and clusters
	// where the CR still lives in the operator-managed namespace.
	crStatus, err := k8sClient.GetEvalHubCRStatus(ctx, identity, app.dashboardNamespace)
	if err != nil {
		return "", "", false, fmt.Errorf("EvalHub CR lookup failed in namespace %q: %w", app.dashboardNamespace, err)
	}
	if crStatus == nil || strings.TrimSpace(crStatus.URL) == "" {
		return "", authToken, true, nil
	}
	return crStatus.URL, authToken, false, nil
}

// AttachEvalHubClient middleware creates an EvalHub client and attaches it to context.
//
// The EvalHub service URL is resolved on every request (per-request discovery) using the
// caller's bearer token. This ensures the BFF always reflects the current cluster state
// without requiring a pod restart.
//
// Priority for resolving the URL (evaluated per-request):
//  1. MOCK_EVAL_HUB_CLIENT=true  → mock client (test/dev mode, no URL needed)
//  2. EVAL_HUB_URL env var set   → developer override, used directly (no K8s call)
//  3. CR discovery in user-selected namespace (from ?namespace= query param)
//  4. Fallback CR discovery in app.dashboardNamespace
func (app *App) AttachEvalHubClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) func(http.ResponseWriter, *http.Request, httprouter.Params) {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		logger := helper.GetContextLoggerFromReq(r)

		var client evalhub.EvalHubClientInterface

		if app.config.MockEvalHubClient {
			logger.Debug("MOCK MODE: creating mock EvalHub client")
			client = app.evalHubClientFactory.CreateClient("", "", app.config.InsecureSkipVerify, app.rootCAs, "/api/v1")
		} else {
			serviceURL, authToken, crNotFound, err := app.evalHubServiceURL(ctx)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
			if crNotFound {
				app.serviceUnavailableResponse(w, r, fmt.Errorf("EvalHub CR not found in user namespace or dashboard namespace %q — operator not configured", app.dashboardNamespace))
				return
			}
			logger.Debug("Resolved EvalHub service URL", "serviceURL", serviceURL)
			client = app.evalHubClientFactory.CreateClient(serviceURL, authToken, app.config.InsecureSkipVerify, app.rootCAs, "/api/v1")
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

// validNamespaceRE matches a valid Kubernetes namespace name (RFC 1123 DNS label).
var validNamespaceRE = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)

func (app *App) AttachNamespace(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		namespace := r.URL.Query().Get(string(constants.NamespaceHeaderParameterKey))
		if namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: %s", constants.NamespaceHeaderParameterKey))
			return
		}
		if !validNamespaceRE.MatchString(namespace) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace %q: must be a valid RFC 1123 DNS label", namespace))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}
