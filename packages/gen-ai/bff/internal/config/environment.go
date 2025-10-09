package config

import "log/slog"

const (

	// AuthMethodDisabled authentication is disabled, useful for testing.
	AuthMethodDisabled = "disabled"

	// AuthMethodUser uses a user-provided Bearer token for authentication.
	AuthMethodUser = "user_token"

	// DefaultAuthTokenHeader is the standard header for Bearer token auth.
	DefaultAuthTokenHeader = "Authorization"

	// DefaultAuthTokenPrefix is the prefix used in the Authorization header.
	// note: the space here is intentional, as the prefix is "Bearer " (with a space).
	DefaultAuthTokenPrefix = "Bearer "
)

type EnvConfig struct {
	// General BFF configuration
	Port            int
	StaticAssetsDir string
	LogLevel        slog.Level
	AllowedOrigins  []string
	MockLSClient    bool
	MockK8sClient   bool
	MockMCPClient   bool
	MockMaaSClient  bool

	// Llama Stack Configuration
	LlamaStackURL string

	// MaaS (Model as a Service) Configuration
	MaaSURL string

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
}
