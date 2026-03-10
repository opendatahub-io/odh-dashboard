package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
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
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/rs/cors"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

// AttachLlamaStackClient middleware creates a LlamaStack client for the namespace and attaches it to context.
// This middleware must be used after AttachNamespace middleware.
//
// Gets the LlamaStack URL from the namespace-specific LlamaStackDistribution resource's status.serviceURL field.
func (app *App) AttachLlamaStackClient(next func(http.ResponseWriter, *http.Request, httprouter.Params)) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		// Get namespace from context (set by AttachNamespace middleware)
		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
			return
		}

		// Use request-scoped logger to avoid nil-panic in tests/environments where app.logger is not set
		logger := helper.GetContextLoggerFromReq(r)

		var llamaStackClient ls.LlamaStackClientInterface

		// Check if running in mock mode
		if app.config.MockLSClient {
			logger.Debug("MOCK MODE: creating mock LlamaStack client for namespace", "namespace", namespace)
			// In mock mode, use empty URL since mock factory ignores it
			llamaStackClient = app.llamaStackClientFactory.CreateClient("", "", false, app.rootCAs, "/v1")
		} else if app.config.AuthMethod == config.AuthMethodDisabled {
			// When auth is disabled, no RequestIdentity is injected into the context.
			// Service discovery (GetLlamaStackDistributions) requires a k8s client which in turn
			// requires identity, so it is not available in this mode.
			// LLAMA_STACK_URL must be explicitly configured as the service endpoint.
			if app.config.LlamaStackURL == "" {
				app.serverErrorResponse(w, r, fmt.Errorf("LLAMA_STACK_URL must be configured when authentication is disabled"))
				return
			}
			logger.Debug("AUTH DISABLED: using LLAMA_STACK_URL with empty token",
				"namespace", namespace,
				"serviceURL", app.config.LlamaStackURL)
			llamaStackClient = app.llamaStackClientFactory.CreateClient(app.config.LlamaStackURL, "", app.config.InsecureSkipVerify, app.rootCAs, "/v1")
		} else {
			// Read identity once here — needed by both the env-var and service-discovery paths
			// for passing the user token to the LlamaStack client.
			identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
			if !ok || identity == nil {
				app.serverErrorResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
				return
			}

			var serviceURL string
			// Use environment variable if explicitly set (developer override)
			if app.config.LlamaStackURL != "" {
				serviceURL = app.config.LlamaStackURL
				logger.Debug("Using LLAMA_STACK_URL environment variable (developer override)",
					"namespace", namespace,
					"serviceURL", serviceURL)
			} else {
				k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
				if err != nil {
					app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
					return
				}

				lsdList, err := k8sClient.GetLlamaStackDistributions(ctx, identity, namespace)
				if err != nil {
					app.handleK8sClientError(w, r, err)
					return
				}

				if len(lsdList.Items) == 0 {
					app.notFoundResponse(w, r)
					return
				}
				if len(lsdList.Items) > 1 {
					logger.Warn(fmt.Sprintf("warning: %d LlamaStackDistributions found in namespace %q, using the first", len(lsdList.Items), namespace))
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

			llamaStackClient = app.llamaStackClientFactory.CreateClient(serviceURL, identity.Token, app.config.InsecureSkipVerify, app.rootCAs, "/v1")
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
			pipelineServerClient := app.pipelineServerClientFactory.CreateClient("mock://"+namespace, "", false, app.rootCAs)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
		} else if app.config.PipelineServerURL != "" {
			// Override URL is set - skip Kubernetes client and DSPA discovery for local/dev mode
			baseURL := app.config.PipelineServerURL
			logger.Debug("Using override Pipeline Server URL from config - skipping DSPA discovery",
				"namespace", namespace)

			// Extract auth token from request identity to forward to Pipeline Server
			authToken := ""
			if identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); ok && identity != nil && identity.Token != "" {
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

			logger.Debug("Creating Pipeline Server client with override URL",
				"namespace", namespace,
				"hasToken", authToken != "")

			pipelineServerClient := app.pipelineServerClientFactory.CreateClient(
				baseURL,
				authToken,
				insecureSkipVerify,
				app.rootCAs,
			)
			ctx = context.WithValue(ctx, constants.PipelineServerClientKey, pipelineServerClient)
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
		}

		r = r.WithContext(ctx)
		next(w, r, ps)
	}
}

const (
	dsPipelineGroup    = "datasciencepipelinesapplications.opendatahub.io"
	dsPipelineResource = "datasciencepipelinesapplications"
)

// isAPIServerReady checks if the Pipeline Server API is ready
// This matches the dashboard's check: conditions.find(c => c.type === 'APIServerReady' && c.status === 'True')
func isAPIServerReady(dspa *models.DSPipelineApplication) bool {
	if dspa == nil || dspa.Status == nil || dspa.Status.Conditions == nil {
		return false
	}

	for _, condition := range dspa.Status.Conditions {
		if condition.Type == "APIServerReady" && condition.Status == "True" {
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

// discoverReadyDSPA discovers the first ready DSPipelineApplication in a namespace
// Returns the first DSPA with APIServerReady == True, or nil if none are ready
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
		if isAPIServerReady(&dspa) {
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
