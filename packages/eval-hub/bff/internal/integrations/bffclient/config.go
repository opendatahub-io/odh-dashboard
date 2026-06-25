package bffclient

import (
	"fmt"
	"os"
)

// BFFTarget represents a target BFF service
type BFFTarget string

const (
	BFFTargetModelCatalog BFFTarget = "model-catalog"
)

// BFFServiceConfig holds configuration for connecting to a target BFF service
type BFFServiceConfig struct {
	Target          BFFTarget
	ServiceName     string
	Namespace       string
	Port            int
	PathPrefix      string
	TLSEnabled      bool
	DevOverrideURL  string
	AuthMethod      string
	AuthTokenHeader string
	AuthTokenPrefix string

	// AllowedPaths restricts which endpoint paths this client can call.
	// If non-empty, Call() rejects any path not containing at least one of these substrings.
	// If empty/nil, all paths are allowed.
	AllowedPaths []string
}

// BFFClientConfig holds configuration for the BFF client system
type BFFClientConfig struct {
	MockBFFClients     bool
	ServiceConfigs     map[BFFTarget]*BFFServiceConfig
	PodNamespace       string
	InsecureSkipVerify bool
}

// NewDefaultBFFClientConfig returns configuration targeting only the
// model-catalog BFF (model-registry package, port 8043) and restricts
// the client to the catalog artifacts endpoint.
func NewDefaultBFFClientConfig() *BFFClientConfig {
	return &BFFClientConfig{
		ServiceConfigs: map[BFFTarget]*BFFServiceConfig{
			BFFTargetModelCatalog: {
				Target:          BFFTargetModelCatalog,
				ServiceName:     "odh-dashboard",
				Port:            8043,
				PathPrefix:      "/api/v1",
				TLSEnabled:      false,
				AuthMethod:      "user_token",
				AuthTokenHeader: "x-forwarded-access-token",
				AuthTokenPrefix: "",
				AllowedPaths: []string{
					"/security_artifacts/",
				},
			},
		},
	}
}

// GetURL returns the fully qualified URL for the target BFF service.
func (c *BFFServiceConfig) GetURL(podNamespace string) string {
	if c.DevOverrideURL != "" {
		return c.DevOverrideURL
	}

	scheme := "http"
	if c.TLSEnabled {
		scheme = "https"
	}

	namespace := c.Namespace
	if namespace == "" {
		namespace = podNamespace
		if namespace == "" {
			namespace = os.Getenv("POD_NAMESPACE")
		}
	}
	if namespace == "" {
		namespace = "opendatahub"
	}

	return fmt.Sprintf("%s://%s.%s.svc.cluster.local:%d%s",
		scheme, c.ServiceName, namespace, c.Port, c.PathPrefix)
}

// GetServiceConfig returns the configuration for a specific target BFF.
func (c *BFFClientConfig) GetServiceConfig(target BFFTarget) *BFFServiceConfig {
	if config, ok := c.ServiceConfigs[target]; ok {
		return config
	}
	return nil
}
