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

	// Llama Stack Configuration
	LlamaStackURL string

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
	// Default is "/rag/api/v1" and can be overridden via CLI/env for different deployment scenarios.
	APIPathPrefix string
}
