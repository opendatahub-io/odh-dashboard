package mcp

import (
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPClientConfig contains configuration for the MCP client
type MCPClientConfig struct {
	// Health checking configuration
	EnableProtocolHealthCheck bool          `json:"enable_protocol_health_check"`
	HealthCheckTimeout        time.Duration `json:"health_check_timeout"`

	// Session management configuration
	SessionTimeout         time.Duration `json:"session_timeout"`
	SessionKeepAlive       time.Duration `json:"session_keep_alive"`
	MaxSessionsPerServer   int           `json:"max_sessions_per_server"`
	SessionCleanupInterval time.Duration `json:"session_cleanup_interval"`

	// Transport configuration
	TransportTimeout   time.Duration `json:"transport_timeout"`
	InsecureSkipVerify bool          `json:"insecure_skip_verify"`
	MaxIdleConns       int           `json:"max_idle_conns"`
	IdleConnTimeout    time.Duration `json:"idle_conn_timeout"`

	// Retry behavior configuration
	MaxRetries    int           `json:"max_retries"`
	RetryBackoff  time.Duration `json:"retry_backoff"`
	RetryMaxDelay time.Duration `json:"retry_max_delay"`

	// MCP client metadata
	ClientName    string `json:"client_name"`
	ClientVersion string `json:"client_version"`
}

// DefaultMCPClientConfig returns a configuration with sensible defaults
func DefaultMCPClientConfig() *MCPClientConfig {
	return &MCPClientConfig{
		// Health checking
		EnableProtocolHealthCheck: false, // Start with HTTP-only health checks
		HealthCheckTimeout:        10 * time.Second,

		// Session management
		SessionTimeout:         5 * time.Minute,
		SessionKeepAlive:       30 * time.Second,
		MaxSessionsPerServer:   3,
		SessionCleanupInterval: 1 * time.Minute,

		// Transport
		TransportTimeout:   60 * time.Second,
		InsecureSkipVerify: false,
		MaxIdleConns:       5,
		IdleConnTimeout:    30 * time.Second,

		// Retry behavior
		MaxRetries:    3,
		RetryBackoff:  1 * time.Second,
		RetryMaxDelay: 10 * time.Second,

		// Client metadata
		ClientName:    "llama-stack-bff-client",
		ClientVersion: "v1.0.0",
	}
}

// Validate checks if the configuration is valid
func (c *MCPClientConfig) Validate() error {
	if c.HealthCheckTimeout <= 0 {
		c.HealthCheckTimeout = 10 * time.Second
	}

	if c.SessionTimeout <= 0 {
		c.SessionTimeout = 5 * time.Minute
	}

	if c.SessionKeepAlive <= 0 {
		c.SessionKeepAlive = 30 * time.Second
	}

	if c.MaxSessionsPerServer <= 0 {
		c.MaxSessionsPerServer = 3
	}

	if c.SessionCleanupInterval <= 0 {
		c.SessionCleanupInterval = 1 * time.Minute
	}

	if c.TransportTimeout <= 0 {
		c.TransportTimeout = 60 * time.Second
	}

	if c.MaxIdleConns <= 0 {
		c.MaxIdleConns = 5
	}

	if c.IdleConnTimeout <= 0 {
		c.IdleConnTimeout = 30 * time.Second
	}

	if c.MaxRetries < 0 {
		c.MaxRetries = 3
	}

	if c.RetryBackoff <= 0 {
		c.RetryBackoff = 1 * time.Second
	}

	if c.RetryMaxDelay <= 0 {
		c.RetryMaxDelay = 10 * time.Second
	}

	if c.ClientName == "" {
		c.ClientName = "llama-stack-bff-client"
	}

	if c.ClientVersion == "" {
		c.ClientVersion = "v1.0.0"
	}

	// No transport type validation needed since it's now per-server
	return nil
}

// ToTransportOptions converts the config to transport options
func (c *MCPClientConfig) ToTransportOptions() *TransportOptions {
	return &TransportOptions{
		Timeout:            c.TransportTimeout,
		KeepAlive:          c.SessionKeepAlive,
		InsecureSkipVerify: c.InsecureSkipVerify,
		MaxIdleConns:       c.MaxIdleConns,
		IdleConnTimeout:    c.IdleConnTimeout,
	}
}

// ToSessionConfig converts the config to session configuration
func (c *MCPClientConfig) ToSessionConfig() *SessionConfig {
	return &SessionConfig{
		SessionTimeout:       c.SessionTimeout,
		MaxSessionsPerServer: c.MaxSessionsPerServer,
		CleanupInterval:      c.SessionCleanupInterval,
	}
}

// ToMCPImplementation creates an MCP implementation from the config
func (c *MCPClientConfig) ToMCPImplementation() *mcp.Implementation {
	return &mcp.Implementation{
		Name:    c.ClientName,
		Version: c.ClientVersion,
	}
}

// ToMCPClientOptions creates MCP client options from the config
func (c *MCPClientConfig) ToMCPClientOptions() *mcp.ClientOptions {
	return &mcp.ClientOptions{
		// Note: KeepAlive might not be available in ClientOptions, check SDK docs
	}
}
