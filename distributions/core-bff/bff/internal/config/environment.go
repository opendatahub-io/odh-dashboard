// Package config defines environment-driven configuration for the BFF server.
package config

import (
	"fmt"
	"log/slog"
	"strings"
)

const (
	// AuthMethodDisabled skips identity extraction entirely.
	// No auth headers are checked and no RequestIdentity is injected into the context.
	// Intended for mock/testing scenarios only.
	AuthMethodDisabled = "disabled"

	// AuthMethodUser uses a user-provided Bearer token for authentication.
	AuthMethodUser = "user_token"

	// DefaultAuthTokenHeader is the header the RHOAI OAuth proxy uses to forward
	// the user's access token to sidecar BFFs.
	DefaultAuthTokenHeader = "x-forwarded-access-token" //nolint:gosec // G101: not a credential, config default for header name

	// DefaultAuthTokenPrefix is empty because x-forwarded-access-token carries
	// the raw token with no scheme prefix.
	DefaultAuthTokenPrefix = ""

	// DefaultDisabledAuthToken is injected as a placeholder when auth is disabled.
	// It must match the first entry in k8mocks.DefaultTestUsers so that mock-mode
	// handlers can resolve a valid test identity.
	DefaultDisabledAuthToken = "FAKE_CLUSTER_ADMIN_TOKEN" //nolint:gosec // G101: test-only placeholder, not a real credential
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

// PlatformType represents the target platform enum
type PlatformType string

const (
	// PlatformOpenShift probes for OpenShift-specific cluster info at startup
	PlatformOpenShift PlatformType = "OpenShift"
	// PlatformXKS represents vanilla Kubernetes; skips OpenShift API detection
	PlatformXKS PlatformType = "XKS"
)

// String implements the fmt.Stringer interface
func (p PlatformType) String() string {
	return string(p)
}

// Set implements the flag.Value interface
func (p *PlatformType) Set(value string) error {
	switch value {
	case "OpenShift":
		*p = PlatformOpenShift
	case "XKS":
		*p = PlatformXKS
	case "":
		*p = ""
	default:
		return fmt.Errorf("invalid platform type: %s (must be OpenShift, XKS, or empty for auto-detect)", value)
	}
	return nil
}

// IsXKS returns true if the platform is XKS (non-OpenShift)
func (p PlatformType) IsXKS() bool {
	return p == PlatformXKS
}

// EnvConfig holds environment-driven configuration for the BFF server.
type EnvConfig struct {
	// Port is the HTTP server port.
	Port int
	// MockK8Client enables mock Kubernetes client mode.
	MockK8Client bool
	// MockHTTPClient enables mock HTTP client mode.
	MockHTTPClient bool
	// DevMode enables development mode.
	DevMode bool
	// DeploymentMode specifies federated or standalone deployment.
	DeploymentMode DeploymentMode
	// DevModeClientPort is the frontend dev server port.
	DevModeClientPort int
	// StaticAssetsDir is the directory for serving static assets.
	StaticAssetsDir string
	// LogLevel is the logging level.
	LogLevel slog.Level
	// AllowedOrigins lists CORS allowed origins.
	AllowedOrigins []string
	// BundlePaths is a list of filesystem paths to PEM-encoded CA bundle files.
	// If provided, the application will attempt to load these files and add the
	// certificates to the HTTP client's Root CAs for outbound TLS connections.
	// Missing or unreadable files are ignored.
	BundlePaths []string

	// ─── AUTH ───────────────────────────────────────────────────
	// Specifies the authentication method used by the server.
	// Valid values: "disabled" or "user_token"
	AuthMethod string

	// Header used to extract the authentication token.
	// Default is "x-forwarded-access-token" and can be overridden via CLI/env for proxy integration scenarios.
	AuthTokenHeader string

	// Optional prefix to strip from the token header value.
	// Default is "" (empty); set to "Bearer " when using the standard Authorization header.
	AuthTokenPrefix string

	// ─── TLS ────────────────────────────────────────────────────
	// TLS verification settings for HTTP client connections to the Client
	// InsecureSkipVerify when true, skips TLS certificate verification (useful for development/local setups)
	// Default is false (secure) for production environments
	InsecureSkipVerify bool

	// ─── BFF INTER-COMMUNICATION ─────────────────────────────────
	// MockBFFClients enables mock mode for BFF inter-communication clients.
	// When true, BFF clients return mock responses instead of making real HTTP calls.
	MockBFFClients bool

	// ─── CORE BFF ───────────────────────────────────────────────
	// PlatformType indicates the target platform.
	PlatformType PlatformType

	// Namespace is the Kubernetes namespace where the dashboard is deployed.
	Namespace string

	// WorkbenchNamespace is the Kubernetes namespace for workbenches.
	// Defaults to Namespace if not set. Used in namespace allowlist validation.
	WorkbenchNamespace string

	// DashboardConfigName is the name of the OdhDashboardConfig CR to read.
	DashboardConfigName string

	// EnabledAppsCM is the name of the ConfigMap that tracks enabled applications.
	EnabledAppsCM string

	// MFRemotesConfig is the filesystem path to the module federation remotes config file.
	MFRemotesConfig string
}
