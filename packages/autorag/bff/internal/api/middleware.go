package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"runtime/debug"
	"strings"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	helper "github.com/opendatahub-io/autorag-library/bff/internal/helpers"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	ls "github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/rs/cors"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
)

// ErrNoDSPAFound is returned when no DSPipelineApplication resources exist in the namespace
var ErrNoDSPAFound = errors.New("no DSPipelineApplication found in namespace")

// dns1123LabelRegex matches valid DNS-1123 labels
// Rules: lowercase alphanumeric or '-', must start/end with alphanumeric, max 63 chars
var dns1123LabelRegex = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)

// isValidDNS1123Label validates a string against DNS-1123 label rules
// Returns true if the label is valid, false otherwise
func isValidDNS1123Label(label string) bool {
	if len(label) == 0 || len(label) > 63 {
		return false
	}
	return dns1123LabelRegex.MatchString(label)
}

// getSecretDataCaseInsensitive performs a case-insensitive lookup in secret data.
// Returns the value and true if found, empty string and false if not found.
func getSecretDataCaseInsensitive(data map[string][]byte, key string) (string, bool, error) {
	// Prefer exact key when present.
	if v, ok := data[key]; ok {
		return string(v), true, nil
	}

	var matched string
	found := false
	for k, v := range data {
		if strings.EqualFold(k, key) {
			if found {
				return "", false, fmt.Errorf("ambiguous secret data: multiple keys match %q case-insensitively", key)
			}
			matched = string(v)
			found = true
		}
	}
	return matched, found, nil
}

// isValidDNS1123Subdomain validates a string against DNS-1123 subdomain rules
// using the Kubernetes apimachinery validation package.
func isValidDNS1123Subdomain(name string) bool {
	return len(k8svalidation.IsDNS1123Subdomain(name)) == 0
}

// validateIP checks an IP address against the SSRF blocklist.
// Loopback (127.x, ::1), link-local (169.254.x — cloud metadata), and unspecified (0.0.0.0) are blocked.
// Private ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed for cluster-internal services.
func validateIP(ip net.IP) error {
	if ip.IsLoopback() {
		return fmt.Errorf("loopback addresses are not allowed")
	}
	if ip.IsLinkLocalUnicast() {
		return fmt.Errorf("link-local addresses are not allowed")
	}
	if ip.IsUnspecified() {
		return fmt.Errorf("unspecified addresses are not allowed")
	}
	return nil
}

// isValidLlamaStackURL validates a URL extracted from a Kubernetes secret to prevent SSRF attacks.
// Only http and https schemes are allowed. For IP literals, the IP is checked directly.
// For DNS hostnames, all resolved A/AAAA records are validated against the same blocklist.
// Private IP ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed because LlamaStack
// services typically run as cluster-internal services with private IPs.
func isValidLlamaStackURL(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("invalid URL scheme %q: only http and https are allowed", parsedURL.Scheme)
	}

	host := parsedURL.Hostname()
	if host == "" {
		return fmt.Errorf("URL must contain a host")
	}

	// Check IP literals directly
	if ip := net.ParseIP(host); ip != nil {
		return validateIP(ip)
	}

	// Resolve DNS hostnames and validate all resulting IPs.
	// If DNS resolution fails, allow it through — the hostname may only be resolvable
	// inside the cluster (e.g., svc.cluster.local). The HTTP client will fail with a
	// connection error later, which is handled as a 502 Bad Gateway.
	ips, err := net.LookupIP(host)
	if err == nil {
		for _, ip := range ips {
			if err := validateIP(ip); err != nil {
				return fmt.Errorf("hostname %q resolves to blocked address: %w", host, err)
			}
		}
	}

	return nil
}

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

		var identity *k8s.RequestIdentity
		// If authentication is disabled, use a default identity for testing/development
		if app.config.AuthMethod == config.AuthMethodDisabled {
			identity = &k8s.RequestIdentity{
				UserID: "user@example.com",
				Groups: []string{"system:masters"},
			}
		} else {
			var err error
			identity, err = app.kubernetesClientFactory.ExtractRequestIdentity(r.Header)
			if err != nil {
				app.badRequestResponse(w, r, err)
				return
			}
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

		// Validate namespace against DNS-1123 label rules
		if !isValidDNS1123Label(namespace) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid namespace: must be a valid DNS-1123 label (lowercase alphanumeric or '-', start/end with alphanumeric, max 63 chars)"))
			return
		}

		ctx := context.WithValue(r.Context(), constants.NamespaceHeaderParameterKey, namespace)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// This middleware enforces RBAC-based authorization for service access in the namespace.
func (app *App) RequireAccessToService(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		// If authentication is disabled skip these steps.
		if app.config.AuthMethod == config.AuthMethodDisabled {
			next(w, r, ps)
			return
		}

		ctx := r.Context()
		identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)

		if !ok || identity == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
			return
		}

		if err := app.kubernetesClientFactory.ValidateRequestIdentity(identity); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}

		// Apply DSPA authorization check to all endpoints that require namespace access
		// This ensures consistent security across all services
		// Namespace must be present in context (set by AttachNamespace middleware).
		if namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string); ok && namespace != "" {
			// Get Kubernetes client to perform SAR
			k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
			if err != nil {
				app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
				return
			}

			// Perform SubjectAccessReview to check if user can list DSPipelineApplications
			// This ensures users have proper permissions to access any service in the namespace
			allowed, err := k8sClient.CanListDSPipelineApplications(ctx, identity, namespace)
			if err != nil {
				app.handleK8sClientError(w, r, err)
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

// AttachLlamaStackClientFromSecret creates a LlamaStack client using credentials from a Kubernetes secret
// and attaches it to context. The secret must contain llama_stack_client_base_url and llama_stack_client_api_key.
// This middleware must be used after AttachNamespace middleware.
//
// Precedence for determining the LlamaStack connection:
//  1. Mock mode (MockLSClient): uses a mock client, ignores all other config.
//  2. Auth disabled: LLAMA_STACK_URL must be configured (no K8s identity available for secret lookup).
//  3. LLAMA_STACK_URL env var set: developer override, skips secret lookup.
//  4. Secret-based: reads URL and API key from the named Kubernetes secret.
func (app *App) AttachLlamaStackClientFromSecret(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Read and validate secretName query parameter
		secretName := r.URL.Query().Get("secretName")
		if secretName == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: secretName"))
			return
		}
		if !isValidDNS1123Subdomain(secretName) {
			app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
			return
		}

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
			return
		}

		logger := helper.GetContextLoggerFromReq(r)

		var llamaStackClient ls.LlamaStackClientInterface

		if app.config.MockLSClient {
			// Mock mode: skip secret lookup entirely
			logger.Debug("MOCK MODE: creating mock LlamaStack client (secret-based)", "namespace", namespace, "secretName", secretName)
			llamaStackClient = app.llamaStackClientFactory.CreateClient("", "", false, app.rootCAs)
		} else {
			// Production: read credentials from Kubernetes secret
			identity, identityOk := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !identityOk || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}

			k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
			if err != nil {
				app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
				return
			}

			// Get the specific secret by name
			foundSecret, err := k8sClient.GetSecret(ctx, namespace, secretName, identity)
			if err != nil {
				// Check if the underlying error is a Kubernetes "not found" error
				if k8serrors.IsNotFound(err) {
					app.notFoundResponseWithMessage(w, r, fmt.Sprintf("secret %q not found in namespace %q", secretName, namespace))
				} else {
					app.handleK8sClientError(w, r, err)
				}
				return
			}

			if foundSecret == nil {
				app.notFoundResponseWithMessage(w, r, fmt.Sprintf("secret %q not found in namespace %q", secretName, namespace))
				return
			}

			// Extract LlamaStack credentials from secret data using case-insensitive key lookups.
			baseURL, foundBaseURL, err := getSecretDataCaseInsensitive(foundSecret.Data, "llama_stack_client_base_url")
			if err != nil {
				app.badRequestResponse(w, r, fmt.Errorf("invalid secret %q: %w", secretName, err))
				return
			}
			apiKey, foundAPIKey, err := getSecretDataCaseInsensitive(foundSecret.Data, "llama_stack_client_api_key")
			if err != nil {
				app.badRequestResponse(w, r, fmt.Errorf("invalid secret %q: %w", secretName, err))
				return
			}

			if !foundBaseURL || baseURL == "" {
				app.badRequestResponse(w, r, fmt.Errorf("secret %q is missing or has empty value for required key: llama_stack_client_base_url", secretName))
				return
			}
			if !foundAPIKey {
				app.badRequestResponse(w, r, fmt.Errorf("secret %q is missing for required key: llama_stack_client_api_key", secretName))
				return
			}
			if err := isValidLlamaStackURL(baseURL); err != nil {
				app.badRequestResponse(w, r, fmt.Errorf("invalid llama_stack_client_base_url in secret %q: %w", secretName, err))
				return
			}

			// Dev-only: rewrite LlamaStack URL to localhost via dynamic port-forward.
			// portForwardManager is nil in production (requires DevMode=true).
			if app.portForwardManager != nil {
				if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, baseURL); pfErr != nil {
					logger.Warn("dynamic port-forward failed for LlamaStack endpoint, using original URL",
						"error", pfErr, "url", baseURL)
				} else {
					baseURL = rewritten
				}
			}

			logger.Debug("Creating LlamaStack client from secret",
				"namespace", namespace,
				"secretName", secretName,
				"serviceURL", baseURL)

			llamaStackClient = app.llamaStackClientFactory.CreateClient(baseURL, apiKey, app.config.InsecureSkipVerify, app.rootCAs)
		}

		// Attach ready-to-use client to context
		ctx = context.WithValue(ctx, constants.LlamaStackClientKey, llamaStackClient)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// AttachPipelineServerClient middleware creates a Pipeline Server client and attaches it to context.
// This middleware must be used after AttachNamespace middleware.
//
// Automatically discovers the first ready DSPipelineApplication in the namespace.
func (app *App) AttachPipelineServerClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context"))
			return
		}

		logger := helper.GetContextLoggerFromReq(r)

		// Create pipeline server client (mock or real based on configuration)
		if app.config.MockPipelineServerClient {
			logger.Debug("MOCK MODE: creating mock Pipeline Server client", "namespace", namespace)
			// Pass namespace via mock:// URL so the mock client can return namespace-specific data
			mockBaseURL := "mock://" + namespace
			pipelineServerClient := app.pipelineServerClientFactory.CreateClient(mockBaseURL, "", false, app.rootCAs)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
			ctx = context.WithValue(ctx, constants.PipelineServerBaseURLKey, mockBaseURL)
		} else {
			// Get Kubernetes client
			client, err := app.kubernetesClientFactory.GetClient(ctx)
			if err != nil {
				logger.Error("Failed to create Kubernetes client", "error", err)
				app.serverErrorResponse(w, r, err)
				return
			}

			// Discover ready DSPA in the namespace
			dspa, err := app.discoverReadyDSPA(ctx, client, namespace, logger)
			if err != nil {
				logger.Error("Failed to discover ready DSPipelineApplication",
					"namespace", namespace,
					"error", err)

				// Map error type to appropriate HTTP response
				if errors.Is(err, ErrNoDSPAFound) {
					// No DSPA exists in namespace - return 404 with specific message
					app.notFoundResponseWithMessage(w, r, "no Pipeline Server (DSPipelineApplication) found in namespace")
					return
				}

				errMsg := err.Error()
				if strings.Contains(errMsg, "forbidden") {
					// Permission/authorization error
					app.forbiddenResponse(w, r, "insufficient permissions to access pipeline servers in this namespace")
				} else if strings.Contains(errMsg, "namespace not found") {
					// Namespace doesn't exist
					app.notFoundResponse(w, r)
				} else {
					// Server/transient errors (connection issues, API errors, etc.)
					app.serverErrorResponse(w, r, err)
				}
				return
			}

			if dspa == nil {
				// DSPA exists but is not ready - return 503 with specific message
				logger.Warn("DSPipelineApplication exists but is not ready", "namespace", namespace)
				app.serviceUnavailableResponseWithMessage(w, r,
					fmt.Errorf("pipeline server exists but is not ready"),
					"Pipeline Server exists but is not ready - check that the APIServer component is running")
				return
			}

			logger.Debug("Discovered ready Pipeline Server",
				"namespace", namespace,
				"pipelineServerId", dspa.Metadata.Name,
				"ready", dspa.Status != nil && dspa.Status.Ready)

			// Get the API URL from the DSPA status (same as dashboard: resource.status.components.apiServer.url)
			var baseURL string
			if dspa.Status != nil &&
				dspa.Status.Components != nil &&
				dspa.Status.Components.APIServer != nil &&
				dspa.Status.Components.APIServer.URL != "" {
				// Read from status.components.apiServer.url (preferred, set by operator)
				baseURL = dspa.Status.Components.APIServer.URL
				logger.Debug("Using Pipeline Server URL from DSPA status")
			} else {
				// Fallback: construct URL (should be rare, operator normally sets this)
				baseURL = fmt.Sprintf("https://ds-pipeline-%s.%s.svc.cluster.local:8443", dspa.Metadata.Name, namespace)
				logger.Warn("DSPA status.components.apiServer.url not set, using fallback constructed URL",
					"namespace", namespace,
					"pipelineServerId", dspa.Metadata.Name)
			}

			// Dev-only: rewrite in-cluster URL to localhost via dynamic port-forward.
			// portForwardManager is nil in production (requires DevMode=true).
			if app.portForwardManager != nil {
				if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, baseURL); pfErr != nil {
					logger.Warn("dynamic port-forward failed for pipeline server, using original URL",
						"error", pfErr, "url", baseURL)
				} else {
					baseURL = rewritten
				}
			}

			// Extract the full object storage configuration from the DSPA spec and store in
			// context. This allows downstream handlers to connect to S3 (or compatible stores
			// like managed MinIO) without an additional Kubernetes API call.
			dspaObjectStorage, storageType := resolveDSPAObjectStorage(dspa, namespace, logger)
			if dspaObjectStorage != nil {
				// Dev-only: rewrite S3 endpoint to localhost via dynamic port-forward.
				// portForwardManager is nil in production (requires DevMode=true).
				if app.portForwardManager != nil && dspaObjectStorage.EndpointURL != "" {
					if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, dspaObjectStorage.EndpointURL); pfErr != nil {
						logger.Warn("dynamic port-forward failed for S3 endpoint, using original URL",
							"error", pfErr, "url", dspaObjectStorage.EndpointURL)
					} else {
						dspaObjectStorage.EndpointURL = rewritten
					}
				}

				ctx = context.WithValue(ctx, constants.DSPAObjectStorageKey, dspaObjectStorage)

				// Log appropriate message based on storage type
				switch storageType {
				case dspaStorageExternal:
					logger.Debug("Found DSPA external storage config",
						"secretName", dspaObjectStorage.SecretName,
						"namespace", namespace,
						"hasEndpoint", dspaObjectStorage.EndpointURL != "",
						"hasBucket", dspaObjectStorage.Bucket != "",
					)
				case dspaStorageMinIO:
					logger.Debug("Found managed MinIO storage config",
						"secretName", dspaObjectStorage.SecretName,
						"namespace", namespace,
						"bucket", dspaObjectStorage.Bucket,
						"endpoint", dspaObjectStorage.EndpointURL,
					)
				}
			} else {
				logger.Warn("DSPA found but has no storage config; S3 endpoints require explicit secretName",
					"dspa", dspa.Metadata.Name,
					"namespace", namespace,
				)
			}

			// Extract auth token from request identity to forward to Pipeline Server
			// This works for both internal auth (kubeflow-userid) and user_token auth (Authorization header)
			authToken := ""
			if identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); ok && identity != nil && identity.Token != "" {
				// Use token from request identity (set by InjectRequestIdentity middleware)
				authToken = identity.Token
				logger.Debug("Using auth token from request identity", "tokenLength", len(authToken))
			} else {
				// Fallback: try reading Authorization header directly (for local testing)
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
					authToken = strings.TrimPrefix(authHeader, "Bearer ")
					logger.Debug("Using auth token from Authorization header (fallback for local testing)", "tokenLength", len(authToken))
				} else {
					logger.Debug("No auth token available from identity or Authorization header")
				}
			}

			insecureSkipVerify := app.config.InsecureSkipVerify

			logger.Debug("Creating Pipeline Server client",
				"namespace", namespace,
				"pipelineServerId", dspa.Metadata.Name,
				"hasToken", authToken != "")

			pipelineServerClient := app.pipelineServerClientFactory.CreateClient(
				baseURL,
				authToken,
				insecureSkipVerify,
				app.rootCAs,
			)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
			ctx = context.WithValue(ctx, constants.PipelineServerBaseURLKey, baseURL)
		}

		r = r.WithContext(ctx)
		next(w, r, ps)
	}
}

// injectDSPAObjectStorageIfAvailable performs a best-effort DSPA discovery and, if a ready
// DSPA with external storage config is found, injects DSPAObjectStorageKey into ctx.
// Returns the (possibly updated) context. Never fails the request — callers proceed without
// S3 storage context if the DSPA cannot be discovered.
func (app *App) injectDSPAObjectStorageIfAvailable(ctx context.Context, namespace string, logger *slog.Logger) context.Context {
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		logger.Warn("K8s client unavailable; DSPA S3 config not injected (S3 will require explicit secretName)",
			"error", err)
		return ctx
	}

	// List all DSPAs regardless of readiness — storage config lives in the spec, not status.
	dspaItems, err := listDSPipelineApplications(ctx, client, namespace, app.config.MockK8Client, logger)
	if err != nil {
		logger.Warn("DSPA listing failed; S3 will require explicit secretName",
			"error", err, "namespace", namespace)
		return ctx
	}
	if len(dspaItems) == 0 {
		logger.Warn("No DSPA found in namespace; S3 will require explicit secretName",
			"namespace", namespace)
		return ctx
	}

	// Prefer external storage globally, then fall back to managed MinIO.
	var externalDSPA *models.DSPipelineApplication
	var minioDSPA *models.DSPipelineApplication
	for i := range dspaItems {
		d := &dspaItems[i]
		if d.Spec == nil || d.Spec.ObjectStorage == nil {
			continue
		}
		if externalDSPA == nil &&
			d.Spec.ObjectStorage.ExternalStorage != nil &&
			d.Spec.ObjectStorage.ExternalStorage.S3CredentialsSecret != nil &&
			d.Spec.ObjectStorage.ExternalStorage.S3CredentialsSecret.SecretName != "" {
			externalDSPA = d
		}
		if minioDSPA == nil &&
			d.Spec.ObjectStorage.Minio != nil &&
			d.Spec.ObjectStorage.Minio.Deploy {
			minioDSPA = d
		}
		// Break early if we've found both types
		if externalDSPA != nil && minioDSPA != nil {
			break
		}
	}
	dspa := externalDSPA
	if dspa == nil {
		dspa = minioDSPA
	}
	if dspa == nil {
		logger.Warn("DSPA found but has no storage config; S3 requires explicit secretName",
			"namespace", namespace)
		return ctx
	}

	// Resolve and inject DSPA object storage config
	dspaObjectStorage, storageType := resolveDSPAObjectStorage(dspa, namespace, logger)
	if dspaObjectStorage != nil {
		// Rewrite S3 endpoint URL if dynamic port-forwarding is enabled
		if app.portForwardManager != nil && dspaObjectStorage.EndpointURL != "" {
			if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, dspaObjectStorage.EndpointURL); pfErr != nil {
				logger.Warn("dynamic port-forward failed for S3 endpoint, using original URL",
					"error", pfErr, "url", dspaObjectStorage.EndpointURL)
			} else {
				dspaObjectStorage.EndpointURL = rewritten
			}
		}

		ctx = context.WithValue(ctx, constants.DSPAObjectStorageKey, dspaObjectStorage)

		// Log appropriate message based on storage type
		switch storageType {
		case dspaStorageExternal:
			logger.Debug("Injected DSPA external storage config (override-URL mode)",
				"secretName", dspaObjectStorage.SecretName,
				"namespace", namespace,
				"hasEndpoint", dspaObjectStorage.EndpointURL != "",
				"hasBucket", dspaObjectStorage.Bucket != "",
			)
		case dspaStorageMinIO:
			logger.Debug("Injected managed MinIO storage config (override-URL mode)",
				"secretName", dspaObjectStorage.SecretName,
				"namespace", namespace,
				"bucket", dspaObjectStorage.Bucket,
				"endpoint", dspaObjectStorage.EndpointURL,
			)
		}
		return ctx
	}

	logger.Warn("DSPA found but has no storage config; S3 requires explicit secretName",
		"dspa", dspa.Metadata.Name,
		"namespace", namespace,
	)
	return ctx
}

const (
	dsPipelineGroup    = "datasciencepipelinesapplications.opendatahub.io"
	dsPipelineResource = "datasciencepipelinesapplications"
)

// dspaStorageType indicates the type of object storage configured in a DSPA.
type dspaStorageType string

const (
	dspaStorageExternal dspaStorageType = "external"
	dspaStorageMinIO    dspaStorageType = "minio"
	dspaStorageNone     dspaStorageType = "none"
)

// buildMinIOObjectStorage constructs DSPAObjectStorage for managed MinIO deployments.
// It follows the DSPA operator conventions:
//   - Secret name: "ds-pipeline-s3-{dspaName}"
//   - Endpoint: http://minio-{dspaName}.{namespace}.svc.cluster.local:9000
//   - Lowercase credential key names: "accesskey", "secretkey"
//   - Default region: "us-east-1"
func buildMinIOObjectStorage(dspaName, namespace, bucket string) *models.DSPAObjectStorage {
	return &models.DSPAObjectStorage{
		SecretName:     fmt.Sprintf("ds-pipeline-s3-%s", dspaName),
		AccessKeyField: "accesskey",
		SecretKeyField: "secretkey",
		EndpointURL:    fmt.Sprintf("http://minio-%s.%s.svc.cluster.local:9000", dspaName, namespace),
		Bucket:         bucket,
		Region:         "us-east-1",
	}
}

// resolveDSPAObjectStorage extracts S3-compatible object storage configuration from a DSPA spec.
// It handles both external storage (e.g., AWS S3) and managed MinIO, with external storage
// preferred when both are configured.
//
// Returns the DSPAObjectStorage config and its type. Returns (nil, dspaStorageNone) if the DSPA
// has no valid object storage configuration.
//
// For external storage:
//   - Validates scheme (must be "http" or "https")
//   - Constructs endpoint URL from scheme://host[:port]
//   - Defaults accessKeyField to "AWS_ACCESS_KEY_ID" if empty
//   - Defaults secretKeyField to "AWS_SECRET_ACCESS_KEY" if empty
//   - Uses bucket and region from DSPA spec
//
// For managed MinIO:
//   - Secret name follows convention: "ds-pipeline-s3-{dspa-name}"
//   - Endpoint URL: http://minio-{dspa-name}.{namespace}.svc.cluster.local:9000
//   - Uses lowercase key names: "accesskey", "secretkey"
//   - Defaults region to "us-east-1"
func resolveDSPAObjectStorage(
	dspa *models.DSPipelineApplication,
	namespace string,
	logger *slog.Logger,
) (*models.DSPAObjectStorage, dspaStorageType) {
	if dspa == nil || dspa.Spec == nil || dspa.Spec.ObjectStorage == nil {
		return nil, dspaStorageNone
	}

	// Handle external storage (preferred)
	if dspa.Spec.ObjectStorage.ExternalStorage != nil &&
		dspa.Spec.ObjectStorage.ExternalStorage.S3CredentialsSecret != nil &&
		dspa.Spec.ObjectStorage.ExternalStorage.S3CredentialsSecret.SecretName != "" {

		ext := dspa.Spec.ObjectStorage.ExternalStorage
		cred := ext.S3CredentialsSecret

		// Construct the endpoint URL from scheme, host, and optional port.
		// Only "http" and "https" schemes are accepted; any other value is
		// logged as a warning and the endpoint URL is left empty so that
		// GetS3CredentialsFromDSPA surfaces a clear error to the caller.
		endpointURL := ""
		scheme := strings.ToLower(ext.Scheme)
		if ext.Host != "" && (scheme == "http" || scheme == "https") {
			if ext.Port != "" {
				endpointURL = fmt.Sprintf("%s://%s:%s", scheme, ext.Host, ext.Port)
			} else {
				endpointURL = fmt.Sprintf("%s://%s", scheme, ext.Host)
			}
		} else if ext.Scheme != "" && ext.Host != "" {
			logger.Warn("DSPA external storage has unrecognised scheme; endpoint URL will be omitted",
				"scheme", ext.Scheme,
				"namespace", namespace,
			)
		}

		accessKeyField := cred.AccessKey
		if accessKeyField == "" {
			accessKeyField = "AWS_ACCESS_KEY_ID"
		}
		secretKeyField := cred.SecretKey
		if secretKeyField == "" {
			secretKeyField = "AWS_SECRET_ACCESS_KEY"
		}

		return &models.DSPAObjectStorage{
			SecretName:     cred.SecretName,
			AccessKeyField: accessKeyField,
			SecretKeyField: secretKeyField,
			EndpointURL:    endpointURL,
			Bucket:         ext.Bucket,
			Region:         ext.Region,
		}, dspaStorageExternal
	}

	// Handle managed MinIO (fallback)
	if dspa.Spec.ObjectStorage.Minio != nil && dspa.Spec.ObjectStorage.Minio.Deploy {
		return buildMinIOObjectStorage(
			dspa.Metadata.Name,
			namespace,
			dspa.Spec.ObjectStorage.Minio.Bucket,
		), dspaStorageMinIO
	}

	// No valid storage configuration
	return nil, dspaStorageNone
}

// isDSPAReady checks if the Pipeline Server is fully ready by looking for
// the Ready condition. Ready is the aggregate condition set by the DSPA
// controller — it is True only when all sub-conditions (APIServerReady,
// DatabaseReady, PersistenceAgentReady, etc.) are also True.
func isDSPAReady(dspa *models.DSPipelineApplication) bool {
	if dspa == nil || dspa.Status == nil || dspa.Status.Conditions == nil {
		return false
	}

	for _, condition := range dspa.Status.Conditions {
		if condition.Type == "Ready" && condition.Status == "True" {
			return true
		}
	}

	return false
}

// listDSPipelineApplications lists all DSPipelineApplication CRs in a namespace
func listDSPipelineApplications(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	mockK8Client bool,
	logger *slog.Logger,
) ([]models.DSPipelineApplication, error) {
	// Check if we're running in mock K8s mode
	if mockK8Client {
		// Running with mock K8s client - return mock data
		return getMockDSPipelineApplications(namespace), nil
	}

	// Get rest.Config from the injected client (proper dependency injection)
	config := client.GetRestConfig()
	if config == nil {
		return nil, fmt.Errorf("failed to get rest.Config from kubernetes client")
	}

	// Create dynamic client using the injected config
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// Discover the preferred API version for DSPipelineApplication
	gvr, err := discoverDSPipelineApplicationGVR(ctx, config, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to discover DSPipelineApplication API version: %w", err)
	}

	// List DSPipelineApplication CRs
	unstructuredList, err := dynamicClient.Resource(gvr).
		Namespace(namespace).
		List(ctx, metav1.ListOptions{})
	if err != nil {
		// Check for specific Kubernetes error types
		if k8serrors.IsNotFound(err) {
			// Namespace doesn't exist or resource type not found
			return nil, fmt.Errorf("namespace not found: %s", namespace)
		}
		if k8serrors.IsForbidden(err) {
			// No permission to list resources in this namespace
			return nil, fmt.Errorf("forbidden: cannot list DSPipelineApplications in namespace %s", namespace)
		}
		// Other unexpected errors
		return nil, fmt.Errorf("failed to list DSPipelineApplications in namespace %s: %w", namespace, err)
	}

	// Convert to our models
	dspas := make([]models.DSPipelineApplication, 0, len(unstructuredList.Items))
	for _, item := range unstructuredList.Items {
		dspa, err := unstructuredToDSPipelineApplication(&item)
		if err != nil {
			// Log warning with context and continue with other items
			logger.Warn("Failed to convert DSPipelineApplication",
				"namespace", item.GetNamespace(),
				"name", item.GetName(),
				"uid", item.GetUID(),
				"error", err)
			continue
		}
		dspas = append(dspas, *dspa)
	}

	return dspas, nil
}

// unstructuredToDSPipelineApplication converts an unstructured object to DSPipelineApplication model
func unstructuredToDSPipelineApplication(obj *unstructured.Unstructured) (*models.DSPipelineApplication, error) {
	// Marshal to JSON then unmarshal to our struct
	jsonBytes, err := obj.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("failed to marshal unstructured object: %w", err)
	}

	var dspa models.DSPipelineApplication
	if err := json.Unmarshal(jsonBytes, &dspa); err != nil {
		return nil, fmt.Errorf("failed to unmarshal to DSPipelineApplication: %w", err)
	}

	return &dspa, nil
}

// discoverDSPipelineApplicationGVR discovers the preferred API version for DSPipelineApplication
// This function uses namespace-scoped queries to avoid requiring cluster-admin permissions
func discoverDSPipelineApplicationGVR(ctx context.Context, config *rest.Config, namespace string) (schema.GroupVersionResource, error) {
	// Create dynamic client once before the loop
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return schema.GroupVersionResource{}, fmt.Errorf("failed to create dynamic client: %w", err)
	}

	// Try known versions in order of preference (newer to older)
	knownVersions := []string{"v1", "v1beta1", "v1alpha1"}

	for _, version := range knownVersions {
		gvr := schema.GroupVersionResource{
			Group:    dsPipelineGroup,
			Version:  version,
			Resource: dsPipelineResource,
		}

		// Test if we can access the resource with this version
		// IMPORTANT: Use namespace-scoped query to respect RBAC and avoid cluster-admin requirement
		_, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{Limit: 1})
		if err == nil {
			// Successfully accessed the resource
			return gvr, nil
		}
		// Continue trying other versions if NotFound or Forbidden
		if k8serrors.IsNotFound(err) || k8serrors.IsForbidden(err) {
			continue
		}
		// Return unexpected errors
		return schema.GroupVersionResource{}, fmt.Errorf("unexpected error discovering DSPipelineApplication GVR: %w", err)
	}

	// If none of the known versions work, return an error instead of defaulting
	return schema.GroupVersionResource{}, fmt.Errorf("no available version of DSPipelineApplication found in namespace %s (tried: %v)", namespace, knownVersions)
}

// getMockDSPipelineApplications returns mock DSPipelineApplication data for development
// Only returns DSPAs that match the requested namespace to simulate realistic K8s behavior
func getMockDSPipelineApplications(namespace string) []models.DSPipelineApplication {
	// All mock DSPAs across all namespaces
	allMockDSPAs := []models.DSPipelineApplication{
		// Ready DSPA in test-namespace
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa",
				Namespace: "test-namespace",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
				ObjectStorage: &models.ObjectStorage{
					ExternalStorage: &models.ExternalStorage{
						Host:   "minio.test-namespace.svc.cluster.local",
						Port:   "9000",
						Scheme: "http",
						Region: "us-east-1",
						Bucket: "pipeline-artifacts",
						S3CredentialsSecret: &models.S3CredentialsSecret{
							SecretName: "dspa-secret",
							AccessKey:  "AWS_ACCESS_KEY_ID",
							SecretKey:  "AWS_SECRET_ACCESS_KEY",
						},
					},
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: true,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "True",
						Reason:  "MinimumReplicasAvailable",
						Message: "Deployment has minimum availability",
					},
					{
						Type:    "APIServerReady",
						Status:  "True",
						Reason:  "Deployed",
						Message: "API Server is ready",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-dspa.test-namespace.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-dspa-test-namespace.apps.cluster.local",
					},
				},
			},
		},
		// Not ready DSPA in test-namespace
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa-test",
				Namespace: "test-namespace",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: false,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "False",
						Reason:  "PodNotReady",
						Message: "Waiting for pods to become ready",
					},
					{
						Type:    "APIServerReady",
						Status:  "False",
						Reason:  "Deploying",
						Message: "API Server is deploying",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-dspa-test.test-namespace.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-dspa-test-test-namespace.apps.cluster.local",
					},
				},
			},
		},
		// Not ready DSPA in not-ready-namespace (for testing 503 errors)
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa-not-ready",
				Namespace: "not-ready-namespace",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: false,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "False",
						Reason:  "APIServerNotReady",
						Message: "Waiting for API Server to become ready",
					},
					{
						Type:    "APIServerReady",
						Status:  "False",
						Reason:  "PodCrashLoopBackOff",
						Message: "API Server pod is in CrashLoopBackOff",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-dspa-not-ready.not-ready-namespace.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-dspa-not-ready-not-ready-namespace.apps.cluster.local",
					},
				},
			},
		},
		// Ready DSPA with managed MinIO in minio-test namespace
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "pipelines",
				Namespace: "minio-test",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
				ObjectStorage: &models.ObjectStorage{
					Minio: &models.MinioStorage{
						Deploy:  true,
						Bucket:  "mlpipeline",
						Image:   "quay.io/opendatahub/minio:RELEASE.2019-08-14T20-37-41Z-license-compliance",
						PvcSize: "10Gi",
					},
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: true,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "True",
						Reason:  "MinimumReplicasAvailable",
						Message: "All components are ready",
					},
					{
						Type:    "APIServerReady",
						Status:  "True",
						Reason:  "Deployed",
						Message: "API Server is ready",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-pipelines.minio-test.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-pipelines-minio-test.apps.cluster.local",
					},
				},
			},
		},
		// Ready DSPA with external storage in external-storage-test namespace
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa-external",
				Namespace: "external-storage-test",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
				ObjectStorage: &models.ObjectStorage{
					ExternalStorage: &models.ExternalStorage{
						Host:   "s3.amazonaws.com",
						Port:   "",
						Scheme: "https",
						Region: "us-west-2",
						Bucket: "my-external-bucket",
						S3CredentialsSecret: &models.S3CredentialsSecret{
							SecretName: "aws-s3-credentials",
							AccessKey:  "", // Empty means use default AWS_ACCESS_KEY_ID
							SecretKey:  "", // Empty means use default AWS_SECRET_ACCESS_KEY
						},
					},
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: true,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "True",
						Reason:  "MinimumReplicasAvailable",
						Message: "All components are ready",
					},
					{
						Type:    "APIServerReady",
						Status:  "True",
						Reason:  "Deployed",
						Message: "API Server is ready",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-dspa-external.external-storage-test.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-dspa-external-external-storage-test.apps.cluster.local",
					},
				},
			},
		},
		// Ready DSPA with BOTH external storage AND managed MinIO in both-storage-test namespace
		// This tests that external storage is preferred when both are configured
		{
			APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
			Kind:       "DSPipelineApplication",
			Metadata: models.DSPipelineApplicationMetadata{
				Name:      "dspa-both",
				Namespace: "both-storage-test",
			},
			Spec: &models.DSPipelineApplicationSpec{
				APIServer: &models.APIServer{
					Deploy: true,
				},
				ObjectStorage: &models.ObjectStorage{
					ExternalStorage: &models.ExternalStorage{
						Host:   "s3.amazonaws.com",
						Port:   "",
						Scheme: "https",
						Region: "us-west-2",
						Bucket: "my-external-bucket",
						S3CredentialsSecret: &models.S3CredentialsSecret{
							SecretName: "aws-s3-credentials",
							AccessKey:  "", // Empty means use default AWS_ACCESS_KEY_ID
							SecretKey:  "", // Empty means use default AWS_SECRET_ACCESS_KEY
						},
					},
					Minio: &models.MinioStorage{
						Deploy:  true,
						Bucket:  "mlpipeline-minio",
						Image:   "quay.io/opendatahub/minio:RELEASE.2019-08-14T20-37-41Z-license-compliance",
						PvcSize: "10Gi",
					},
				},
			},
			Status: &models.DSPipelineApplicationStatus{
				Ready: true,
				Conditions: []models.DSPipelineApplicationCondition{
					{
						Type:    "Ready",
						Status:  "True",
						Reason:  "MinimumReplicasAvailable",
						Message: "All components are ready",
					},
					{
						Type:    "APIServerReady",
						Status:  "True",
						Reason:  "Deployed",
						Message: "API Server is ready",
					},
				},
				Components: &models.DSPipelineApplicationComponents{
					APIServer: &models.DSPipelineApplicationAPIServerStatus{
						URL:         "https://ds-pipeline-dspa-both.both-storage-test.svc.cluster.local:8443",
						ExternalURL: "https://ds-pipeline-ui-dspa-both-both-storage-test.apps.cluster.local",
					},
				},
			},
		},
	}

	// Filter DSPAs to only return those in the requested namespace
	var result []models.DSPipelineApplication
	for _, dspa := range allMockDSPAs {
		if dspa.Metadata.Namespace == namespace {
			result = append(result, dspa)
		}
	}

	// If no namespace-specific DSPA exists, return a synthetic ready DSPA for the requested namespace.
	// This allows development with any namespace (e.g. "aistor") when using mock mode.
	// Exclude "no-dspas-namespace" to allow testing the case where no DSPAs exist.
	if len(result) == 0 && namespace != "" && namespace != "no-dspas-namespace" {
		result = []models.DSPipelineApplication{
			{
				APIVersion: "datasciencepipelinesapplications.opendatahub.io/v1",
				Kind:       "DSPipelineApplication",
				Metadata: models.DSPipelineApplicationMetadata{
					Name:      "dspa",
					Namespace: namespace,
				},
				Spec: &models.DSPipelineApplicationSpec{
					APIServer: &models.APIServer{
						Deploy: true,
					},
					ObjectStorage: &models.ObjectStorage{
						ExternalStorage: &models.ExternalStorage{
							Host:   fmt.Sprintf("minio.%s.svc.cluster.local", namespace),
							Port:   "9000",
							Scheme: "http",
							Region: "us-east-1",
							Bucket: "pipeline-artifacts",
							S3CredentialsSecret: &models.S3CredentialsSecret{
								SecretName: "dspa-secret",
								AccessKey:  "AWS_ACCESS_KEY_ID",
								SecretKey:  "AWS_SECRET_ACCESS_KEY",
							},
						},
					},
				},
				Status: &models.DSPipelineApplicationStatus{
					Ready: true,
					Conditions: []models.DSPipelineApplicationCondition{
						{
							Type:    "Ready",
							Status:  "True",
							Reason:  "MinimumReplicasAvailable",
							Message: "Deployment has minimum availability",
						},
						{
							Type:    "APIServerReady",
							Status:  "True",
							Reason:  "Deployed",
							Message: "API Server is ready",
						},
					},
					Components: &models.DSPipelineApplicationComponents{
						APIServer: &models.DSPipelineApplicationAPIServerStatus{
							URL:         fmt.Sprintf("https://ds-pipeline-dspa.%s.svc.cluster.local:8443", namespace),
							ExternalURL: fmt.Sprintf("https://ds-pipeline-ui-dspa-%s.apps.cluster.local", namespace),
						},
					},
				},
			},
		}
	}

	return result
}

// discoverReadyDSPA discovers the first ready DSPipelineApplication in a namespace.
// Returns the first DSPA for which isDSPAReady reports the aggregate Ready condition is True,
// or nil if none are ready.
func (app *App) discoverReadyDSPA(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	logger *slog.Logger,
) (*models.DSPipelineApplication, error) {
	// List all DSPAs in the namespace
	dspas, err := listDSPipelineApplications(ctx, client, namespace, app.config.MockK8Client, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to list DSPipelineApplications: %w", err)
	}

	// Find the first ready DSPA
	for _, dspa := range dspas {
		if isDSPAReady(&dspa) {
			logger.Info("Found ready Pipeline Server",
				"namespace", namespace,
				"name", dspa.Metadata.Name)
			return &dspa, nil
		}
	}

	// No ready DSPA found - distinguish between "no DSPAs exist" and "DSPAs exist but not ready"
	if len(dspas) == 0 {
		logger.Warn("No DSPipelineApplications found in namespace",
			"namespace", namespace)
		return nil, ErrNoDSPAFound
	}

	// DSPAs exist but none are ready
	logger.Warn("DSPipelineApplications exist but none are ready",
		"namespace", namespace,
		"total_dspas", len(dspas))
	return nil, nil
}

// AttachDiscoveredPipeline middleware discovers managed pipelines and attaches them to context.
//
// Middleware Chain Requirements:
//   - Must be used AFTER: AttachNamespace, AttachPipelineServerClient
//   - Returns 400 if prerequisites are missing
//
// Behavior:
//   - Builds a definitions map from config (pipeline type → name prefix)
//   - Calls DiscoverNamedPipelines to find all configured pipelines
//   - Stores the result map in context at constants.DiscoveredPipelinesKey
//   - Partial maps are allowed — handlers decide if their specific type is required
//   - Returns 500 only if discovery fails with a hard API error
//   - Logs discovery results for debugging
//
// Handlers using this middleware can retrieve discovered pipelines from context:
//
//	pipelines, _ := ctx.Value(constants.DiscoveredPipelinesKey).(map[string]*repositories.DiscoveredPipeline)
//	discovered := pipelines["autorag"]
func (app *App) AttachDiscoveredPipeline(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
			return
		}

		// Get pipeline server client from context (set by AttachPipelineServerClient middleware)
		pipelineClient, ok := ctx.Value(constants.PipelineServerClientKey).(pipelineserver.PipelineServerClientInterface)
		if !ok || pipelineClient == nil {
			app.badRequestResponse(w, r, fmt.Errorf("missing pipeline server client in context - ensure AttachPipelineServerClient middleware is used first"))
			return
		}

		logger := helper.GetContextLoggerFromReq(r)

		// Get pipeline server base URL from context (used as part of cache key)
		pipelineServerBaseURL, _ := ctx.Value(constants.PipelineServerBaseURLKey).(string)

		// Build definitions map: pipeline type key → name prefix
		definitions := map[string]string{
			"autorag": app.config.AutoRAGPipelineNamePrefix,
		}

		// Discover named pipelines in the namespace
		pipelines, err := app.repositories.Pipeline.DiscoverNamedPipelines(pipelineClient, ctx, namespace, pipelineServerBaseURL, definitions)
		if err != nil {
			logger.Error("Failed to discover AutoRAG pipelines",
				"namespace", namespace,
				"error", err)
			app.serverErrorResponseWithMessage(w, r,
				fmt.Errorf("failed to discover AutoRAG pipeline: %w", err),
				fmt.Sprintf("failed to discover AutoRAG pipeline in namespace %s - check that the pipeline server is accessible", namespace))
			return
		}

		if autoragPipeline, found := pipelines["autorag"]; found {
			logger.Debug("Discovered AutoRAG pipeline",
				"namespace", namespace,
				"pipelineId", autoragPipeline.PipelineID,
				"pipelineVersionId", autoragPipeline.PipelineVersionID)
		} else {
			logger.Debug("No AutoRAG pipeline discovered in namespace", "namespace", namespace)
		}

		// Attach discovered pipelines map to context (may be empty)
		ctx = context.WithValue(ctx, constants.DiscoveredPipelinesKey, pipelines)
		r = r.WithContext(ctx)

		next(w, r, ps)
	}
}

// preserveRawPath wraps an http.Handler so that percent-encoded path segments
// (e.g. %2F inside an S3 key) survive exactly one level of decoding in the
// handler. For S3 file endpoints it replaces Path with EscapedPath(), which
// re-encodes any percent-literal characters that Go's url.Parse already
// decoded (e.g. %252F → Path has %2F → EscapedPath re-encodes to %252F).
// The handler then calls url.PathUnescape once to recover the real key.
func preserveRawPath(next http.Handler) http.Handler {
	s3FilesPrefix := ApiPathPrefix + "/s3/files/"

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if escaped := r.URL.EscapedPath(); strings.HasPrefix(escaped, s3FilesPrefix) {
			r.URL.Path = escaped
		}
		next.ServeHTTP(w, r)
	})
}
