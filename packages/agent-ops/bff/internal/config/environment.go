package config

import (
	"fmt"
	"log/slog"
	"strings"
)

const (
	// AuthMethodDisabled disables authentication, useful for local development and testing.
	AuthMethodDisabled = "disabled"

	// AuthMethodUser uses a user-provided Bearer token for authentication.
	AuthMethodUser = "user_token"

	// DefaultAuthTokenHeader is the standard header for Bearer token auth.
	DefaultAuthTokenHeader = "Authorization"

	// DefaultAuthTokenPrefix is the prefix used in the Authorization header.
	// note: the space here is intentional, as the prefix is "Bearer " (with a space).
	DefaultAuthTokenPrefix = "Bearer "
)

// DeploymentMode represents the deployment mode enum
type DeploymentMode string

const (
	// DeploymentModeFederated represents the federated platform mode
	DeploymentModeFederated DeploymentMode = "federated"
	// DeploymentModeStandalone represents the standalone mode
	DeploymentModeStandalone DeploymentMode = "standalone"
)

// String implements the fmt.Stringer interface
func (d DeploymentMode) String() string {
	return string(d)
}

// Set implements the flag.Value interface
func (d *DeploymentMode) Set(value string) error {
	switch strings.ToLower(value) {
	case "federated":
		*d = DeploymentModeFederated
	case "standalone":
		*d = DeploymentModeStandalone
	default:
		return fmt.Errorf("invalid deployment mode: %s (must be federated or standalone)", value)
	}
	return nil
}

// IsStandaloneMode returns true if the deployment mode is standalone
func (d DeploymentMode) IsStandaloneMode() bool {
	return d == DeploymentModeStandalone
}

// IsFederatedMode returns true if the deployment mode is federated
func (d DeploymentMode) IsFederatedMode() bool {
	return d == DeploymentModeFederated
}

// EnvConfig holds all configuration values parsed from CLI flags and environment variables.
type EnvConfig struct {
	Port              int
	MockK8Client      bool
	MockHTTPClient    bool
	DevMode           bool
	DeploymentMode    DeploymentMode
	DevModeClientPort int
	StaticAssetsDir   string
	LogLevel          slog.Level
	AllowedOrigins    []string
	// BundlePaths is a list of filesystem paths to PEM-encoded CA bundle files.
	BundlePaths []string

	// ─── AUTH ───────────────────────────────────────────────────
	AuthMethod      string
	AuthTokenHeader string
	AuthTokenPrefix string

	// ─── TLS ────────────────────────────────────────────────────
	InsecureSkipVerify bool
}
