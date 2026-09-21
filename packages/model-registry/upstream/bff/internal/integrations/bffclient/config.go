package bffclient

import (
	"fmt"
	"os"
)

// BFFTarget represents a target BFF service.
//
// Only the MLflow target is defined today because the model-registry BFF only
// needs inter-BFF communication to resolve MCP Registry server details (see
// docs/inter-bff-communication.md). Add new BFFTarget* consts here following
// the same pattern if additional targets are needed later.
type BFFTarget string

const (
	BFFTargetMLflow BFFTarget = "mlflow"
)

// Supported values for BFFServiceConfig.AuthMethod.
const (
	// AuthMethodInternal forwards the kubeflow-userid header instead of a bearer token.
	AuthMethodInternal = "internal"
	// AuthMethodUserToken forwards a bearer token via AuthTokenHeader/AuthTokenPrefix (default).
	AuthMethodUserToken = "user_token"
)

// BFFServiceConfig holds configuration for connecting to a BFF service
type BFFServiceConfig struct {
	// Target BFF identifier
	Target BFFTarget

	// ServiceName is the Kubernetes service name
	ServiceName string

	// Namespace is the Kubernetes namespace (empty = same namespace as caller)
	Namespace string

	// Port is the service port
	Port int

	// PathPrefix is the API path prefix (e.g., "/api/v1")
	PathPrefix string

	// TLSEnabled enables HTTPS communication
	TLSEnabled bool

	// DevOverrideURL allows local development override
	DevOverrideURL string

	// ─── AUTH CONFIGURATION ─────────────────────────────────
	// AuthMethod specifies the auth method the target BFF uses
	// Supported values: "internal" (kubeflow-userid), "user_token" (token in header)
	AuthMethod string

	// AuthTokenHeader is the header the target BFF expects for user_token auth
	// e.g., "x-forwarded-access-token" or "Authorization"
	AuthTokenHeader string

	// AuthTokenPrefix is the prefix the target BFF expects in the token header
	// e.g., "" (empty) or "Bearer "
	AuthTokenPrefix string
}

// BFFClientConfig holds configuration for the BFF client system
type BFFClientConfig struct {
	// MockBFFClients enables mock mode for all BFF clients
	MockBFFClients bool

	// ServiceConfigs maps target BFFs to their configurations
	ServiceConfigs map[BFFTarget]*BFFServiceConfig

	// PodNamespace is the namespace where this pod is running
	PodNamespace string

	// InsecureSkipVerify skips TLS certificate verification (for development)
	InsecureSkipVerify bool
}

// NewDefaultBFFClientConfig creates a default BFF client configuration
// with the MLflow BFF configured for the standalone (per-module) deployment mode.
func NewDefaultBFFClientConfig() *BFFClientConfig {
	return &BFFClientConfig{
		MockBFFClients: false,
		ServiceConfigs: map[BFFTarget]*BFFServiceConfig{
			BFFTargetMLflow: {
				Target:          BFFTargetMLflow,
				ServiceName:     "odh-dashboard-mlflow-ui",
				Port:            8343,
				PathPrefix:      "/api/v1",
				TLSEnabled:      true,
				AuthMethod:      "user_token",
				AuthTokenHeader: "x-forwarded-access-token",
				AuthTokenPrefix: "",
			},
		},
		PodNamespace:       "",
		InsecureSkipVerify: false,
	}
}

// GetURL returns the fully qualified URL for the target BFF service
func (c *BFFServiceConfig) GetURL(podNamespace string) string {
	// Priority 1: Dev override URL (for local development)
	if c.DevOverrideURL != "" {
		return c.DevOverrideURL
	}

	// Priority 2: Kubernetes service discovery
	scheme := "http"
	if c.TLSEnabled {
		scheme = "https"
	}

	namespace := c.Namespace
	if namespace == "" {
		namespace = podNamespace
		if namespace == "" {
			// Try to get from environment (downward API)
			namespace = os.Getenv("POD_NAMESPACE")
		}
	}

	// If still no namespace, use a reasonable default
	if namespace == "" {
		namespace = "opendatahub"
	}

	// Full DNS: <service>.<namespace>.svc.cluster.local:<port>
	return fmt.Sprintf("%s://%s.%s.svc.cluster.local:%d%s",
		scheme, c.ServiceName, namespace, c.Port, c.PathPrefix)
}

// GetServiceConfig returns the configuration for a specific target BFF
func (c *BFFClientConfig) GetServiceConfig(target BFFTarget) *BFFServiceConfig {
	if config, ok := c.ServiceConfigs[target]; ok {
		return config
	}
	return nil
}
