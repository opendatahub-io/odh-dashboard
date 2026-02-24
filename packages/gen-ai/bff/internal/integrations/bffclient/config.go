package bffclient

import (
	"fmt"
	"os"
)

// BFFTarget represents a target BFF service
type BFFTarget string

const (
	BFFTargetMaaS          BFFTarget = "maas"
	BFFTargetGenAI         BFFTarget = "gen-ai"
	BFFTargetModelRegistry BFFTarget = "model-registry"
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
}

// BFFClientConfig holds configuration for the BFF client system
type BFFClientConfig struct {
	// MockBFFClients enables mock mode for all BFF clients
	MockBFFClients bool

	// ServiceConfigs maps target BFFs to their configurations
	ServiceConfigs map[BFFTarget]*BFFServiceConfig

	// PodNamespace is the namespace where this pod is running (from downward API)
	PodNamespace string

	// InsecureSkipVerify skips TLS certificate verification (for development)
	InsecureSkipVerify bool
}

// NewDefaultBFFClientConfig creates a default BFF client configuration
// with MaaS BFF configured for the current single-pod deployment
func NewDefaultBFFClientConfig() *BFFClientConfig {
	return &BFFClientConfig{
		MockBFFClients: false,
		ServiceConfigs: map[BFFTarget]*BFFServiceConfig{
			BFFTargetMaaS: {
				Target:      BFFTargetMaaS,
				ServiceName: "odh-dashboard",
				Port:        8243,
				PathPrefix:  "/api/v1",
				TLSEnabled:  false,
			},
			BFFTargetGenAI: {
				Target:      BFFTargetGenAI,
				ServiceName: "odh-dashboard",
				Port:        8143,
				PathPrefix:  "/api/v1",
				TLSEnabled:  false,
			},
			BFFTargetModelRegistry: {
				Target:      BFFTargetModelRegistry,
				ServiceName: "odh-dashboard",
				Port:        8043,
				PathPrefix:  "/api/v1",
				TLSEnabled:  false,
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
