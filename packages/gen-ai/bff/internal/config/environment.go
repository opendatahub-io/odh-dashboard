package config

import "log/slog"

const (

	// AuthMethodDisabled authentication is disabled, useful for testing.
	AuthMethodDisabled = "disabled"

	// AuthMethodUser uses a user-provided Bearer token for authentication.
	AuthMethodUser = "user_token"

	// DefaultAuthTokenHeader is the default header for token extraction.
	// For ODH/RHOAI deployments, this is 'x-forwarded-access-token'.
	// For standard Bearer token auth, use 'Authorization'.
	DefaultAuthTokenHeader = "x-forwarded-access-token"

	// DefaultAuthTokenPrefix is the prefix to strip from the token header value.
	// For ODH/RHOAI ('x-forwarded-access-token'), this is empty.
	// For standard Bearer token auth ('Authorization'), use "Bearer ".
	DefaultAuthTokenPrefix = ""
)

type EnvConfig struct {
	// General BFF configuration
	Port             int
	StaticAssetsDir  string
	LogLevel         slog.Level
	AllowedOrigins   []string
	MockLSClient     bool
	MockK8sClient    bool
	MockMCPClient    bool
	MockMaaSClient   bool
	MockMLflowClient bool

	// Llama Stack Configuration
	LlamaStackURL string

	// MaaS (Model as a Service) Configuration
	MaaSURL string

	// MLflow Configuration
	MLflowURL string

	// Filter models configuration
	FilteredModelKeywords []string

	// ─── TLS ────────────────────────────────────────────────────
	// BundlePaths is a list of filesystem paths to PEM-encoded CA bundle files.
	// If provided, the application will attempt to load these files and add the
	// certificates to the HTTP client's Root CAs for outbound TLS connections.
	// Missing or unreadable files are ignored.
	BundlePaths []string

	// TLS verification settings for HTTP client connections
	// InsecureSkipVerify when true, skips TLS certificate verification (useful for development/local setups)
	InsecureSkipVerify bool
	// Custom distribution name
	DistributionName string

	// ─── AUTH ───────────────────────────────────────────────────
	// Specifies the authentication method used by the server.
	// Valid values: "disabled" or "user_token"
	AuthMethod string

	// Header used to extract the authentication token.
	// Default is "Authorization" and can be overridden via CLI/env for proxy integration scenarios.
	AuthTokenHeader string

	// Optional prefix to strip from the token header value.
	// Default is "Bearer ", can be set to empty if the token is sent without a prefix.
	AuthTokenPrefix string

	// API path prefix for the BFF endpoints.
	// Default is "/api/v1" and can be overridden via CLI/env for different deployment scenarios.
	APIPathPrefix string

	// Path prefix for the BFF endpoints.
	PathPrefix string

	// ─── RBAC ──────────────────────────────────────────────────
	// EnableLlamaStackRBAC enables RBAC endpoint filtering on generated LlamaStack configurations.
	// When true, the Kubernetes auth provider and access policies are added to the server config.
	// Default is false to avoid breaking existing deployments.
	EnableLlamaStackRBAC bool

	// ─── BFF INTER-COMMUNICATION ─────────────────────────────────
	// MockBFFClients enables mock mode for BFF inter-communication clients.
	// When true, BFF clients return mock responses instead of making real HTTP calls.
	MockBFFClients bool

	// BFFMaaSServiceName is the Kubernetes service name for the MaaS BFF.
	// Default: "odh-dashboard" (shared service in single-pod deployment)
	BFFMaaSServiceName string

	// BFFMaaSServicePort is the port for the MaaS BFF service.
	// Default: 8243
	BFFMaaSServicePort int

	// BFFMaaSTLSEnabled enables HTTPS for MaaS BFF communication.
	// Default: false (same pod, TLS not required)
	BFFMaaSTLSEnabled bool

	// BFFMaaSDevURL is a developer override URL for MaaS BFF (local development).
	// When set, overrides service discovery. Example: "http://localhost:4000/api/v1"
	BFFMaaSDevURL string

	// BFFMaaSAuthMethod specifies the auth method used by the target MaaS BFF.
	// Supported values: "internal" (kubeflow-userid header), "user_token" (token in header)
	// Default: "user_token" (recommended for ODH/RHOAI)
	BFFMaaSAuthMethod string

	// BFFMaaSAuthTokenHeader specifies the header MaaS BFF expects for user_token auth.
	// Default: "x-forwarded-access-token" (ODH standard)
	BFFMaaSAuthTokenHeader string

	// BFFMaaSAuthTokenPrefix specifies the prefix MaaS BFF expects in the token header.
	// Default: "" (empty for ODH's x-forwarded-access-token)
	BFFMaaSAuthTokenPrefix string
}
