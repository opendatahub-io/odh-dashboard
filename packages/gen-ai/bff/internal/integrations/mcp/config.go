package mcp

import (
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPClientConfig contains configuration for the MCP client
type MCPClientConfig struct {
	EnableProtocolHealthCheck bool          `json:"enable_protocol_health_check"`
	HealthCheckTimeout        time.Duration `json:"health_check_timeout"`
	TransportTimeout          time.Duration `json:"transport_timeout"`
	InsecureSkipVerify        bool          `json:"insecure_skip_verify"`
	MaxIdleConns              int           `json:"max_idle_conns"`
	IdleConnTimeout           time.Duration `json:"idle_conn_timeout"`
	MaxRetries                int           `json:"max_retries"`
	RetryBackoff              time.Duration `json:"retry_backoff"`
	RetryMaxDelay             time.Duration `json:"retry_max_delay"`
	ClientName                string        `json:"client_name"`
	ClientVersion             string        `json:"client_version"`
}

// DefaultMCPClientConfig returns a configuration with sensible defaults
func DefaultMCPClientConfig() *MCPClientConfig {
	return &MCPClientConfig{
		EnableProtocolHealthCheck: false, // Start with HTTP-only health checks
		HealthCheckTimeout:        10 * time.Second,
		TransportTimeout:          60 * time.Second,
		InsecureSkipVerify:        false,
		MaxIdleConns:              5,
		IdleConnTimeout:           30 * time.Second,
		MaxRetries:                3,
		RetryBackoff:              1 * time.Second,
		RetryMaxDelay:             10 * time.Second,
		ClientName:                "llama-stack-bff-client",
		ClientVersion:             "v1.0.0",
	}
}

// Validate checks if the configuration is valid
func (c *MCPClientConfig) Validate() error {
	if c.HealthCheckTimeout <= 0 {
		c.HealthCheckTimeout = 10 * time.Second
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

	return nil
}

// ToTransportOptions converts the config to transport options
func (c *MCPClientConfig) ToTransportOptions() *TransportOptions {
	return &TransportOptions{
		Timeout:            c.TransportTimeout,
		KeepAlive:          30 * time.Second,
		InsecureSkipVerify: c.InsecureSkipVerify,
		MaxIdleConns:       c.MaxIdleConns,
		IdleConnTimeout:    c.IdleConnTimeout,
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
	return &mcp.ClientOptions{}
}
